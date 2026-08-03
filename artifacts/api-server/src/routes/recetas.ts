import { Router } from "express";
import { db, recetasTable, recetaPartidasTable, pacientesTable, clientesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateRecetaParams,
  CreateRecetaBody,
  CreateRecetaResponse,
  GetRecetaParams,
  GetRecetaResponse,
  DeleteRecetaParams,
} from "@workspace/api-zod";

const router = Router();

// POST /pacientes/:pacienteId/recetas
router.post("/pacientes/:pacienteId/recetas", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.pacienteId) ? req.params.pacienteId[0] : req.params.pacienteId;
  const pacienteId = parseInt(raw, 10);
  if (isNaN(pacienteId)) { res.status(404).json({ error: "Not found" }); return; }

  CreateRecetaParams.safeParse({ pacienteId });
  const parsed = CreateRecetaBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [paciente] = await db
    .select({ id: pacientesTable.id, nombre: pacientesTable.nombre, especie: pacientesTable.especie, raza: pacientesTable.raza, clienteId: pacientesTable.clienteId })
    .from(pacientesTable)
    .where(eq(pacientesTable.id, pacienteId));
  if (!paciente) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const [cliente] = await db.select({ nombre: clientesTable.nombre, apellidos: clientesTable.apellidos }).from(clientesTable).where(eq(clientesTable.id, paciente.clienteId));
  const propietario = cliente ? `${cliente.nombre} ${cliente.apellidos ?? ""}`.trim() : "";

  const { partidas, ...recetaData } = parsed.data;
  const [receta] = await db.insert(recetasTable).values({ ...recetaData, pacienteId }).returning();

  const insertedPartidas = partidas?.length
    ? await db.insert(recetaPartidasTable).values(partidas.map((p) => ({ ...p, recetaId: receta.id }))).returning()
    : [];

  const payload = {
    ...receta,
    partidas: insertedPartidas,
    paciente: paciente.nombre,
    propietario,
    especie: paciente.especie,
    raza: paciente.raza,
    creadoEn: receta.creadoEn.toISOString(),
  };

  res.status(201).json(CreateRecetaResponse.parse(payload));
});

// GET /recetas/:recetaId
router.get("/recetas/:recetaId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.recetaId) ? req.params.recetaId[0] : req.params.recetaId;
  const recetaId = parseInt(raw, 10);
  if (isNaN(recetaId)) { res.status(404).json({ error: "Not found" }); return; }

  GetRecetaParams.safeParse({ recetaId });
  const [receta] = await db.select().from(recetasTable).where(eq(recetasTable.id, recetaId));
  if (!receta) { res.status(404).json({ error: "Receta no encontrada" }); return; }

  const partidas = await db.select().from(recetaPartidasTable).where(eq(recetaPartidasTable.recetaId, recetaId));

  const [paciente] = await db
    .select({ nombre: pacientesTable.nombre, especie: pacientesTable.especie, raza: pacientesTable.raza, clienteId: pacientesTable.clienteId })
    .from(pacientesTable)
    .where(eq(pacientesTable.id, receta.pacienteId));

  const [cliente] = paciente
    ? await db.select({ nombre: clientesTable.nombre, apellidos: clientesTable.apellidos }).from(clientesTable).where(eq(clientesTable.id, paciente.clienteId))
    : [null];

  const propietario = cliente ? `${cliente.nombre} ${cliente.apellidos ?? ""}`.trim() : "";

  const payload = {
    ...receta,
    partidas,
    paciente: paciente?.nombre ?? "",
    propietario,
    especie: paciente?.especie ?? null,
    raza: paciente?.raza ?? null,
    creadoEn: receta.creadoEn.toISOString(),
  };

  res.json({
    ...GetRecetaResponse.parse(payload),
    archivoImagen: receta.archivoImagen ?? null,
    archivoAdjuntadoEn: receta.archivoAdjuntadoEn?.toISOString() ?? null,
  });
});

// PATCH /recetas/:recetaId/archivo  — guarda la ruta de la imagen de la receta
router.patch("/recetas/:recetaId/archivo", async (req, res): Promise<void> => {
  const recetaId = parseInt(Array.isArray(req.params.recetaId) ? req.params.recetaId[0] : req.params.recetaId, 10);
  if (isNaN(recetaId)) { res.status(404).json({ error: "Not found" }); return; }

  const { archivoImagen } = req.body as { archivoImagen: string | null };
  const [updated] = await db
    .update(recetasTable)
    .set({
      archivoImagen: archivoImagen ?? null,
      archivoAdjuntadoEn: archivoImagen ? new Date() : null,
    })
    .where(eq(recetasTable.id, recetaId))
    .returning();
  if (!updated) { res.status(404).json({ error: "Receta no encontrada" }); return; }

  res.json({
    archivoImagen: updated.archivoImagen,
    archivoAdjuntadoEn: updated.archivoAdjuntadoEn?.toISOString() ?? null,
  });
});

// DELETE /recetas/:recetaId
router.delete("/recetas/:recetaId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.recetaId) ? req.params.recetaId[0] : req.params.recetaId;
  const recetaId = parseInt(raw, 10);
  if (isNaN(recetaId)) { res.status(404).json({ error: "Not found" }); return; }

  DeleteRecetaParams.safeParse({ recetaId });
  const [deleted] = await db.delete(recetasTable).where(eq(recetasTable.id, recetaId)).returning();
  if (!deleted) { res.status(404).json({ error: "Receta no encontrada" }); return; }

  res.status(204).send();
});

export default router;
