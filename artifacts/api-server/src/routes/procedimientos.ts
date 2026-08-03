import { Router } from "express";
import { db, procedimientosTable, pacientesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const TIPOS = [
  "Cirugía", "Profilaxis Dental", "Radiografía", "Ultrasonido",
  "Electrocardiograma", "Endoscopía", "Biopsia", "Desparasitación", "Vacunación", "Otro",
] as const;

const ProcedimientoBody = z.object({
  fecha: z.string().min(1),
  tipo: z.enum(TIPOS),
  descripcion: z.string().optional().nullable(),
  veterinario: z.string().optional().nullable(),
  resultado: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});

const serialize = (p: typeof procedimientosTable.$inferSelect) => ({
  ...p,
  creadoEn: p.creadoEn.toISOString(),
});

// GET /pacientes/:pacienteId/procedimientos
router.get("/pacientes/:pacienteId/procedimientos", async (req, res): Promise<void> => {
  const pacienteId = parseInt(req.params.pacienteId, 10);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID inválido" }); return; }

  const rows = await db
    .select()
    .from(procedimientosTable)
    .where(eq(procedimientosTable.pacienteId, pacienteId))
    .orderBy(desc(procedimientosTable.fecha));

  res.json(rows.map(serialize));
});

// POST /pacientes/:pacienteId/procedimientos
router.post("/pacientes/:pacienteId/procedimientos", async (req, res): Promise<void> => {
  const pacienteId = parseInt(req.params.pacienteId, 10);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [paciente] = await db.select({ id: pacientesTable.id }).from(pacientesTable).where(eq(pacientesTable.id, pacienteId));
  if (!paciente) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const parsed = ProcedimientoBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [row] = await db.insert(procedimientosTable).values({ ...parsed.data, pacienteId }).returning();
  res.status(201).json(serialize(row));
});

// GET /procedimientos/:id
router.get("/procedimientos/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [row] = await db.select().from(procedimientosTable).where(eq(procedimientosTable.id, id));
  if (!row) { res.status(404).json({ error: "Procedimiento no encontrado" }); return; }

  res.json(serialize(row));
});

// PUT /procedimientos/:id
router.put("/procedimientos/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const parsed = ProcedimientoBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db
    .update(procedimientosTable)
    .set(parsed.data)
    .where(eq(procedimientosTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Procedimiento no encontrado" }); return; }
  res.json(serialize(updated));
});

// DELETE /procedimientos/:id
router.delete("/procedimientos/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [deleted] = await db.delete(procedimientosTable).where(eq(procedimientosTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Procedimiento no encontrado" }); return; }

  res.status(204).send();
});

export default router;
