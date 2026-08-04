import { Router } from "express";
import { db, clientesTable, pacientesTable, movimientosTable, cuentasClienteTable } from "@workspace/db";
import { eq, ilike, or, sql, count, desc } from "drizzle-orm";
import {
  GetClientesQueryParams,
  GetClientesResponse,
  CreateClienteBody,
  CreateClienteResponse,
  GetClienteParams,
  GetClienteResponse,
  UpdateClienteParams,
  UpdateClienteBody,
  UpdateClienteResponse,
  DeleteClienteParams,
} from "@workspace/api-zod";

const router = Router();

// GET /clientes
router.get("/clientes", async (req, res): Promise<void> => {
  const parsed = GetClientesQueryParams.safeParse(req.query);
  const q = parsed.success ? parsed.data.q : undefined;

  let query = db
    .select({
      id: clientesTable.id,
      nombre: clientesTable.nombre,
      apellidos: clientesTable.apellidos,
      telefono: clientesTable.telefono,
      email: clientesTable.email,
      totalPacientes: sql<number>`(SELECT COUNT(*) FROM pacientes WHERE cliente_id = clientes.id)`,
      saldo: sql<number>`
  COALESCE(
    (
      SELECT SUM(
        CASE
          WHEN liquidado = true THEN 0
          ELSE GREATEST(
            monto::numeric - COALESCE(monto_pagado::numeric, 0),
            0
          )
        END
      )
      FROM cuentas_cliente
      WHERE cliente_id = clientes.id
    ),
    0
  )
`, ELSE importe::numeric END) FROM movimientos WHERE cliente_id = clientes.id), 0)`,
    })
    .from(clientesTable)
    .$dynamic();

  if (q) {
    query = query.where(
      or(
        ilike(clientesTable.nombre, `%${q}%`),
        ilike(sql`COALESCE(${clientesTable.apellidos}, '')`, `%${q}%`),
        ilike(clientesTable.telefono, `%${q}%`),
        ilike(sql`COALESCE(${clientesTable.email}, '')`, `%${q}%`),
      ),
    );
  }

  const rows = await query.orderBy(clientesTable.apellidos, clientesTable.nombre);
  const result = rows.map((r) => ({ ...r, totalPacientes: Number(r.totalPacientes), saldo: Number(r.saldo) }));
  res.json(GetClientesResponse.parse(result));
});

// POST /clientes
router.post("/clientes", async (req, res): Promise<void> => {
  const parsed = CreateClienteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [cliente] = await db.insert(clientesTable).values(parsed.data).returning();
  res.status(201).json(CreateClienteResponse.parse({ ...cliente, creadoEn: cliente.creadoEn.toISOString() }));
});

// GET /clientes/:clienteId
router.get("/clientes/:clienteId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.clienteId) ? req.params.clienteId[0] : req.params.clienteId;
  const clienteId = parseInt(raw, 10);
  if (isNaN(clienteId)) { res.status(404).json({ error: "Not found" }); return; }

  const parsed = GetClienteParams.safeParse({ clienteId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [cliente] = await db.select().from(clientesTable).where(eq(clientesTable.id, clienteId));
  if (!cliente) { res.status(404).json({ error: "Cliente no encontrado" }); return; }

  const [saldoRow] = await db
  .select({
    saldo: sql<string>`
      COALESCE(
        SUM(
          CASE
            WHEN ${cuentasClienteTable.liquidado} = true THEN 0
            ELSE GREATEST(
              ${cuentasClienteTable.monto}::numeric -
              COALESCE(${cuentasClienteTable.montoPagado}::numeric, 0),
              0
            )
          END
        ),
        0
      )
    `,
  })
  .from(cuentasClienteTable)
  .where(eq(cuentasClienteTable.clienteId, clienteId));

  const pacientes = await db
    .select({
      id: pacientesTable.id,
      nombre: pacientesTable.nombre,
      especie: pacientesTable.especie,
      raza: pacientesTable.raza,
      propietario: sql<string>`${clientesTable.nombre} || ' ' || COALESCE(${clientesTable.apellidos}, '')`,
      clienteId: pacientesTable.clienteId,
      peso: pacientesTable.peso,
      estado: pacientesTable.estado,
      creadoEn: pacientesTable.creadoEn,
    })
    .from(pacientesTable)
    .innerJoin(clientesTable, eq(pacientesTable.clienteId, clientesTable.id))
    .where(eq(pacientesTable.clienteId, clienteId))
    .orderBy(pacientesTable.nombre);

  const movimientos = await db
    .select({
      id: movimientosTable.id,
      clienteId: movimientosTable.clienteId,
      pacienteId: movimientosTable.pacienteId,
      paciente: sql<string | null>`(SELECT nombre FROM pacientes WHERE id = ${movimientosTable.pacienteId})`,
      fecha: movimientosTable.fecha,
      tipo: movimientosTable.tipo,
      concepto: movimientosTable.concepto,
      importe: movimientosTable.importe,
      metodoPago: movimientosTable.metodoPago,
      referencia: movimientosTable.referencia,
      notas: movimientosTable.notas,
      creadoEn: movimientosTable.creadoEn,
    })
    .from(movimientosTable)
    .where(eq(movimientosTable.clienteId, clienteId))
    .orderBy(sql`${movimientosTable.fecha} DESC, ${movimientosTable.creadoEn} DESC`);

  const payload = {
    cliente: { ...cliente, creadoEn: cliente.creadoEn.toISOString(), adeudoMonto: cliente.adeudoMonto != null ? Number(cliente.adeudoMonto) : null, adeudoLiquidadoEn: cliente.adeudoLiquidadoEn?.toISOString() ?? null },
    saldo: parseFloat(saldoRow.saldo as string),
    pacientes: pacientes.map((p) => ({
      ...p,
      propietario: p.propietario.trim(),
      peso: p.peso != null ? Number(p.peso) : null,
      creadoEn: p.creadoEn.toISOString(),
    })),
    movimientos: movimientos.map((m) => ({
      ...m,
      importe: Number(m.importe),
      creadoEn: m.creadoEn.toISOString(),
    })),
  };

  res.json(GetClienteResponse.parse(payload));
});

// PATCH /clientes/:clienteId/adeudo
router.patch("/clientes/:clienteId/adeudo", async (req, res): Promise<void> => {
  const clienteId = parseInt(Array.isArray(req.params.clienteId) ? req.params.clienteId[0] : req.params.clienteId, 10);
  if (isNaN(clienteId)) { res.status(404).json({ error: "Not found" }); return; }
  const { adeudoMonto, adeudoLiquidado } = req.body as { adeudoMonto: number | null; adeudoLiquidado: boolean };
  const [updated] = await db
    .update(clientesTable)
    .set({
      adeudoMonto: adeudoMonto != null ? String(adeudoMonto) : null,
      adeudoLiquidado: adeudoLiquidado ?? false,
      adeudoLiquidadoEn: adeudoLiquidado ? new Date() : null,
    })
    .where(eq(clientesTable.id, clienteId))
    .returning();
  if (!updated) { res.status(404).json({ error: "Cliente no encontrado" }); return; }
  res.json({
    adeudoMonto: updated.adeudoMonto != null ? Number(updated.adeudoMonto) : null,
    adeudoLiquidado: updated.adeudoLiquidado,
    adeudoLiquidadoEn: updated.adeudoLiquidadoEn?.toISOString() ?? null,
  });
});

// PATCH /clientes/:clienteId/hoja-conceptos
router.patch("/clientes/:clienteId/hoja-conceptos", async (req, res): Promise<void> => {
  const clienteId = parseInt(Array.isArray(req.params.clienteId) ? req.params.clienteId[0] : req.params.clienteId, 10);
  if (isNaN(clienteId)) { res.status(404).json({ error: "Not found" }); return; }
  const { hojaConceptos } = req.body as { hojaConceptos: string | null };
  const [updated] = await db.update(clientesTable).set({ hojaConceptos: hojaConceptos ?? null }).where(eq(clientesTable.id, clienteId)).returning();
  if (!updated) { res.status(404).json({ error: "Cliente no encontrado" }); return; }
  res.json({ hojaConceptos: updated.hojaConceptos });
});

// PUT /clientes/:clienteId
router.put("/clientes/:clienteId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.clienteId) ? req.params.clienteId[0] : req.params.clienteId;
  const clienteId = parseInt(raw, 10);
  if (isNaN(clienteId)) { res.status(404).json({ error: "Not found" }); return; }

  UpdateClienteParams.safeParse({ clienteId });
  const parsed = UpdateClienteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db.update(clientesTable).set(parsed.data).where(eq(clientesTable.id, clienteId)).returning();
  if (!updated) { res.status(404).json({ error: "Cliente no encontrado" }); return; }

  res.json(UpdateClienteResponse.parse({ ...updated, creadoEn: updated.creadoEn.toISOString() }));
});

// DELETE /clientes/:clienteId
router.delete("/clientes/:clienteId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.clienteId) ? req.params.clienteId[0] : req.params.clienteId;
  const clienteId = parseInt(raw, 10);
  if (isNaN(clienteId)) { res.status(404).json({ error: "Not found" }); return; }

  DeleteClienteParams.safeParse({ clienteId });
  const [deleted] = await db.delete(clientesTable).where(eq(clientesTable.id, clienteId)).returning();
  if (!deleted) { res.status(404).json({ error: "Cliente no encontrado" }); return; }

  res.status(204).send();
});

// GET /clientes/:clienteId/cuentas
router.get("/clientes/:clienteId/cuentas", async (req, res): Promise<void> => {
  const clienteId = parseInt(Array.isArray(req.params.clienteId) ? req.params.clienteId[0] : req.params.clienteId, 10);
  if (isNaN(clienteId)) { res.status(404).json({ error: "Not found" }); return; }
  const cuentas = await db.select().from(cuentasClienteTable).where(eq(cuentasClienteTable.clienteId, clienteId)).orderBy(desc(cuentasClienteTable.fecha), desc(cuentasClienteTable.creadoEn));
  res.json(cuentas.map(c => ({ ...c, monto: Number(c.monto), montoPagado: c.montoPagado != null ? Number(c.montoPagado) : null, liquidadoEn: c.liquidadoEn?.toISOString() ?? null, creadoEn: c.creadoEn.toISOString() })));
});

// POST /clientes/:clienteId/cuentas
router.post("/clientes/:clienteId/cuentas", async (req, res): Promise<void> => {
  const clienteId = parseInt(Array.isArray(req.params.clienteId) ? req.params.clienteId[0] : req.params.clienteId, 10);
  if (isNaN(clienteId)) { res.status(404).json({ error: "Not found" }); return; }
  const { fecha, monto, notas } = req.body as { fecha: string; monto: number; notas?: string };
  if (!fecha || monto == null) { res.status(400).json({ error: "fecha y monto son requeridos" }); return; }
  const [cuenta] = await db.insert(cuentasClienteTable).values({ clienteId, fecha, monto: String(monto), notas: notas ?? null }).returning();
  res.status(201).json({ ...cuenta, monto: Number(cuenta.monto), liquidadoEn: null, creadoEn: cuenta.creadoEn.toISOString() });
});

// PATCH /cuentas/:cuentaId/liquidar
router.patch("/cuentas/:cuentaId/liquidar", async (req, res): Promise<void> => {
  const cuentaId = parseInt(Array.isArray(req.params.cuentaId) ? req.params.cuentaId[0] : req.params.cuentaId, 10);
  if (isNaN(cuentaId)) { res.status(404).json({ error: "Not found" }); return; }
  const { montoPagado, tipoPago } = req.body as { montoPagado: number; tipoPago: "total" | "parcial" | null };
  // liquidado = true only when tipo is total (full payment)
  const liquidado = tipoPago === "total";
  const [updated] = await db.update(cuentasClienteTable).set({
    liquidado,
    liquidadoEn: liquidado ? new Date() : null,
    montoPagado: montoPagado != null ? String(montoPagado) : null,
    tipoPago,
  }).where(eq(cuentasClienteTable.id, cuentaId)).returning();
  if (!updated) { res.status(404).json({ error: "Cuenta no encontrada" }); return; }
  res.json({ ...updated, monto: Number(updated.monto), montoPagado: updated.montoPagado != null ? Number(updated.montoPagado) : null, liquidadoEn: updated.liquidadoEn?.toISOString() ?? null, creadoEn: updated.creadoEn.toISOString() });
});

// PATCH /cuentas/:cuentaId/hoja
router.patch("/cuentas/:cuentaId/hoja", async (req, res): Promise<void> => {
  const cuentaId = parseInt(Array.isArray(req.params.cuentaId) ? req.params.cuentaId[0] : req.params.cuentaId, 10);
  if (isNaN(cuentaId)) { res.status(404).json({ error: "Not found" }); return; }
  const { hojaConceptos } = req.body as { hojaConceptos: string | null };
  const [updated] = await db.update(cuentasClienteTable).set({ hojaConceptos: hojaConceptos ?? null }).where(eq(cuentasClienteTable.id, cuentaId)).returning();
  if (!updated) { res.status(404).json({ error: "Cuenta no encontrada" }); return; }
  res.json({ ...updated, monto: Number(updated.monto), liquidadoEn: updated.liquidadoEn?.toISOString() ?? null, creadoEn: updated.creadoEn.toISOString() });
});

// DELETE /cuentas/:cuentaId
router.delete("/cuentas/:cuentaId", async (req, res): Promise<void> => {
  const cuentaId = parseInt(Array.isArray(req.params.cuentaId) ? req.params.cuentaId[0] : req.params.cuentaId, 10);
  if (isNaN(cuentaId)) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(cuentasClienteTable).where(eq(cuentasClienteTable.id, cuentaId));
  res.status(204).send();
});

export default router;
