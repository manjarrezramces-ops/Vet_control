import { Router } from "express";
import { db, clientesTable, pacientesTable, movimientosTable } from "@workspace/db";
import { eq, ilike, or, sql, count } from "drizzle-orm";
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
      totalPacientes: sql<number>`(SELECT COUNT(*) FROM pacientes WHERE cliente_id = ${clientesTable.id})`,
      saldo: sql<number>`COALESCE((SELECT SUM(CASE WHEN tipo='Pago' THEN -importe::numeric ELSE importe::numeric END) FROM movimientos WHERE cliente_id = ${clientesTable.id}), 0)`,
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
      saldo: sql<string>`COALESCE(SUM(CASE WHEN tipo='Pago' THEN -importe::numeric ELSE importe::numeric END), 0)`,
    })
    .from(movimientosTable)
    .where(eq(movimientosTable.clienteId, clienteId));

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
    cliente: { ...cliente, creadoEn: cliente.creadoEn.toISOString() },
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

export default router;
