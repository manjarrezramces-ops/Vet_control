import { Router } from "express";
import { db, movimientosTable, clientesTable, pacientesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateMovimientoParams,
  CreateMovimientoBody,
  CreateMovimientoResponse,
  DeleteMovimientoParams,
} from "@workspace/api-zod";

const router = Router();

// POST /clientes/:clienteId/movimientos
router.post("/clientes/:clienteId/movimientos", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.clienteId) ? req.params.clienteId[0] : req.params.clienteId;
  const clienteId = parseInt(raw, 10);
  if (isNaN(clienteId)) { res.status(404).json({ error: "Not found" }); return; }

  CreateMovimientoParams.safeParse({ clienteId });
  const parsed = CreateMovimientoBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [cliente] = await db.select({ id: clientesTable.id }).from(clientesTable).where(eq(clientesTable.id, clienteId));
  if (!cliente) { res.status(404).json({ error: "Cliente no encontrado" }); return; }

  const [movimiento] = await db.insert(movimientosTable).values({ ...parsed.data, clienteId }).returning();

  // Resolve paciente name if pacienteId provided
  let pacienteNombre: string | null = null;
  if (movimiento.pacienteId) {
    const [p] = await db.select({ nombre: pacientesTable.nombre }).from(pacientesTable).where(eq(pacientesTable.id, movimiento.pacienteId));
    pacienteNombre = p?.nombre ?? null;
  }

  res.status(201).json(
    CreateMovimientoResponse.parse({
      ...movimiento,
      paciente: pacienteNombre,
      importe: Number(movimiento.importe),
      creadoEn: movimiento.creadoEn.toISOString(),
    }),
  );
});

// DELETE /movimientos/:movimientoId
router.delete("/movimientos/:movimientoId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.movimientoId) ? req.params.movimientoId[0] : req.params.movimientoId;
  const movimientoId = parseInt(raw, 10);
  if (isNaN(movimientoId)) { res.status(404).json({ error: "Not found" }); return; }

  DeleteMovimientoParams.safeParse({ movimientoId });
  const [deleted] = await db.delete(movimientosTable).where(eq(movimientosTable.id, movimientoId)).returning();
  if (!deleted) { res.status(404).json({ error: "Movimiento no encontrado" }); return; }

  res.status(204).send();
});

export default router;
