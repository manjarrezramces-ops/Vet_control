import { Router } from "express";
import { db, consultasTable, pacientesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateConsultaParams,
  CreateConsultaBody,
  CreateConsultaResponse,
  GetConsultaParams,
  GetConsultaResponse,
  UpdateConsultaParams,
  UpdateConsultaBody,
  UpdateConsultaResponse,
  DeleteConsultaParams,
} from "@workspace/api-zod";

const router = Router();

// POST /pacientes/:pacienteId/consultas
router.post("/pacientes/:pacienteId/consultas", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.pacienteId) ? req.params.pacienteId[0] : req.params.pacienteId;
  const pacienteId = parseInt(raw, 10);
  if (isNaN(pacienteId)) { res.status(404).json({ error: "Not found" }); return; }

  CreateConsultaParams.safeParse({ pacienteId });
  const parsed = CreateConsultaBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [paciente] = await db.select({ id: pacientesTable.id }).from(pacientesTable).where(eq(pacientesTable.id, pacienteId));
  if (!paciente) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const [consulta] = await db
    .insert(consultasTable)
    .values({ ...parsed.data, pacienteId })
    .returning();

  res.status(201).json(
    CreateConsultaResponse.parse({
      ...consulta,
      peso: consulta.peso != null ? Number(consulta.peso) : null,
      temperatura: consulta.temperatura != null ? Number(consulta.temperatura) : null,
      creadoEn: consulta.creadoEn.toISOString(),
    }),
  );
});

// GET /consultas/:consultaId
router.get("/consultas/:consultaId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.consultaId) ? req.params.consultaId[0] : req.params.consultaId;
  const consultaId = parseInt(raw, 10);
  if (isNaN(consultaId)) { res.status(404).json({ error: "Not found" }); return; }

  GetConsultaParams.safeParse({ consultaId });
  const [consulta] = await db.select().from(consultasTable).where(eq(consultasTable.id, consultaId));
  if (!consulta) { res.status(404).json({ error: "Consulta no encontrada" }); return; }

  res.json({
    ...GetConsultaResponse.parse({
      ...consulta,
      peso: consulta.peso != null ? Number(consulta.peso) : null,
      temperatura: consulta.temperatura != null ? Number(consulta.temperatura) : null,
      creadoEn: consulta.creadoEn.toISOString(),
    }),
    archivoEstudios: consulta.archivoEstudios ?? null,
  });
});

// PUT /consultas/:consultaId
router.put("/consultas/:consultaId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.consultaId) ? req.params.consultaId[0] : req.params.consultaId;
  const consultaId = parseInt(raw, 10);
  if (isNaN(consultaId)) { res.status(404).json({ error: "Not found" }); return; }

  UpdateConsultaParams.safeParse({ consultaId });
  const parsed = UpdateConsultaBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db
    .update(consultasTable)
    .set(parsed.data)
    .where(eq(consultasTable.id, consultaId))
    .returning();
  if (!updated) { res.status(404).json({ error: "Consulta no encontrada" }); return; }

  res.json(
    UpdateConsultaResponse.parse({
      ...updated,
      peso: updated.peso != null ? Number(updated.peso) : null,
      temperatura: updated.temperatura != null ? Number(updated.temperatura) : null,
      creadoEn: updated.creadoEn.toISOString(),
    }),
  );
});

// PATCH /consultas/:consultaId/archivo  — guarda la ruta del archivo de estudios
router.patch("/consultas/:consultaId/archivo", async (req, res): Promise<void> => {
  const consultaId = parseInt(Array.isArray(req.params.consultaId) ? req.params.consultaId[0] : req.params.consultaId, 10);
  if (isNaN(consultaId)) { res.status(404).json({ error: "Not found" }); return; }

  const { archivoEstudios } = req.body as { archivoEstudios: string | null };
  const [updated] = await db
    .update(consultasTable)
    .set({ archivoEstudios: archivoEstudios ?? null })
    .where(eq(consultasTable.id, consultaId))
    .returning();
  if (!updated) { res.status(404).json({ error: "Consulta no encontrada" }); return; }

  res.json({ archivoEstudios: updated.archivoEstudios });
});

// DELETE /consultas/:consultaId
router.delete("/consultas/:consultaId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.consultaId) ? req.params.consultaId[0] : req.params.consultaId;
  const consultaId = parseInt(raw, 10);
  if (isNaN(consultaId)) { res.status(404).json({ error: "Not found" }); return; }

  DeleteConsultaParams.safeParse({ consultaId });
  const [deleted] = await db.delete(consultasTable).where(eq(consultasTable.id, consultaId)).returning();
  if (!deleted) { res.status(404).json({ error: "Consulta no encontrada" }); return; }

  res.status(204).send();
});

export default router;
