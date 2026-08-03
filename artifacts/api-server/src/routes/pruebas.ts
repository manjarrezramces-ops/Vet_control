import { Router } from "express";
import { db, pruebasTable, pacientesTable, consultasTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreatePruebaParams,
  CreatePruebaBody,
  CreatePruebaResponse,
  GetPruebaParams,
  GetPruebaResponse,
  UpdatePruebaParams,
  UpdatePruebaBody,
  UpdatePruebaResponse,
  DeletePruebaParams,
} from "@workspace/api-zod";

const router = Router();

// GET /consultas/:consultaId/pruebas  — estudios vinculados a una consulta
router.get("/consultas/:consultaId/pruebas", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.consultaId) ? req.params.consultaId[0] : req.params.consultaId;
  const consultaId = parseInt(raw, 10);
  if (isNaN(consultaId)) { res.status(404).json({ error: "Not found" }); return; }

  const [consulta] = await db.select({ id: consultasTable.id }).from(consultasTable).where(eq(consultasTable.id, consultaId));
  if (!consulta) { res.status(404).json({ error: "Consulta no encontrada" }); return; }

  const pruebas = await db.select().from(pruebasTable).where(eq(pruebasTable.consultaId, consultaId));
  res.json(pruebas.map(p => ({ ...p, costo: Number(p.costo), creadoEn: p.creadoEn.toISOString() })));
});

// POST /pacientes/:pacienteId/pruebas
router.post("/pacientes/:pacienteId/pruebas", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.pacienteId) ? req.params.pacienteId[0] : req.params.pacienteId;
  const pacienteId = parseInt(raw, 10);
  if (isNaN(pacienteId)) { res.status(404).json({ error: "Not found" }); return; }

  CreatePruebaParams.safeParse({ pacienteId });
  const parsed = CreatePruebaBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [paciente] = await db.select({ id: pacientesTable.id }).from(pacientesTable).where(eq(pacientesTable.id, pacienteId));
  if (!paciente) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const [prueba] = await db.insert(pruebasTable).values({ ...parsed.data, pacienteId }).returning();
  res.status(201).json(
    CreatePruebaResponse.parse({ ...prueba, costo: Number(prueba.costo), creadoEn: prueba.creadoEn.toISOString() }),
  );
});

// GET /pruebas/:pruebaId
router.get("/pruebas/:pruebaId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.pruebaId) ? req.params.pruebaId[0] : req.params.pruebaId;
  const pruebaId = parseInt(raw, 10);
  if (isNaN(pruebaId)) { res.status(404).json({ error: "Not found" }); return; }

  GetPruebaParams.safeParse({ pruebaId });
  const [prueba] = await db.select().from(pruebasTable).where(eq(pruebasTable.id, pruebaId));
  if (!prueba) { res.status(404).json({ error: "Prueba no encontrada" }); return; }

  res.json(GetPruebaResponse.parse({ ...prueba, costo: Number(prueba.costo), creadoEn: prueba.creadoEn.toISOString() }));
});

// PUT /pruebas/:pruebaId
router.put("/pruebas/:pruebaId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.pruebaId) ? req.params.pruebaId[0] : req.params.pruebaId;
  const pruebaId = parseInt(raw, 10);
  if (isNaN(pruebaId)) { res.status(404).json({ error: "Not found" }); return; }

  UpdatePruebaParams.safeParse({ pruebaId });
  const parsed = UpdatePruebaBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db.update(pruebasTable).set(parsed.data).where(eq(pruebasTable.id, pruebaId)).returning();
  if (!updated) { res.status(404).json({ error: "Prueba no encontrada" }); return; }

  res.json(UpdatePruebaResponse.parse({ ...updated, costo: Number(updated.costo), creadoEn: updated.creadoEn.toISOString() }));
});

// DELETE /pruebas/:pruebaId
router.delete("/pruebas/:pruebaId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.pruebaId) ? req.params.pruebaId[0] : req.params.pruebaId;
  const pruebaId = parseInt(raw, 10);
  if (isNaN(pruebaId)) { res.status(404).json({ error: "Not found" }); return; }

  DeletePruebaParams.safeParse({ pruebaId });
  const [deleted] = await db.delete(pruebasTable).where(eq(pruebasTable.id, pruebaId)).returning();
  if (!deleted) { res.status(404).json({ error: "Prueba no encontrada" }); return; }

  res.status(204).send();
});

export default router;
