import { Router } from "express";
import { db, hospitalizacionesTable, pacientesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const HospitalizacionBody = z.object({
  fechaIngreso: z.string().min(1),
  fechaAlta: z.string().optional().nullable(),
  tipoAlta: z.enum(["Médica", "Voluntaria", "Defunción", "Traslado"]).optional().nullable(),
  altaVoluntariaRazon: z.string().optional().nullable(),
  estado: z.enum(["Crítico", "Grave", "Estable", "En observación", "En recuperación", "Hospitalizado"]).default("Hospitalizado"),
  motivo: z.string().min(1),
  jaula: z.string().optional().nullable(),
  veterinarioResponsable: z.string().optional().nullable(),
  tratamiento: z.string().optional().nullable(),
  notasEvolucion: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  consultaId: z.number().optional().nullable(),
});

const serialize = (h: typeof hospitalizacionesTable.$inferSelect) => ({
  ...h,
  creadoEn: h.creadoEn.toISOString(),
});

// GET /pacientes/:pacienteId/hospitalizaciones
router.get("/pacientes/:pacienteId/hospitalizaciones", async (req, res): Promise<void> => {
  const pacienteId = parseInt(req.params.pacienteId, 10);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID inválido" }); return; }

  const rows = await db
    .select()
    .from(hospitalizacionesTable)
    .where(eq(hospitalizacionesTable.pacienteId, pacienteId))
    .orderBy(desc(hospitalizacionesTable.fechaIngreso));

  res.json(rows.map(serialize));
});

// POST /pacientes/:pacienteId/hospitalizaciones
router.post("/pacientes/:pacienteId/hospitalizaciones", async (req, res): Promise<void> => {
  const pacienteId = parseInt(req.params.pacienteId, 10);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [paciente] = await db.select({ id: pacientesTable.id }).from(pacientesTable).where(eq(pacientesTable.id, pacienteId));
  if (!paciente) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const parsed = HospitalizacionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [row] = await db.insert(hospitalizacionesTable).values({ ...parsed.data, pacienteId }).returning();
  res.status(201).json(serialize(row));
});

// GET /hospitalizaciones/:id
router.get("/hospitalizaciones/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [row] = await db.select().from(hospitalizacionesTable).where(eq(hospitalizacionesTable.id, id));
  if (!row) { res.status(404).json({ error: "Hospitalización no encontrada" }); return; }

  res.json(serialize(row));
});

// PUT /hospitalizaciones/:id
router.put("/hospitalizaciones/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const parsed = HospitalizacionBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db
    .update(hospitalizacionesTable)
    .set(parsed.data)
    .where(eq(hospitalizacionesTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Hospitalización no encontrada" }); return; }
  res.json(serialize(updated));
});

// DELETE /hospitalizaciones/:id
router.delete("/hospitalizaciones/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [deleted] = await db.delete(hospitalizacionesTable).where(eq(hospitalizacionesTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Hospitalización no encontrada" }); return; }

  res.status(204).send();
});

export default router;
