import { Router } from "express";
import { db, hospitalizacionesTable, hospitalizacionArchivosTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const serialize = (a: typeof hospitalizacionArchivosTable.$inferSelect) => ({
  ...a,
  creadoEn: a.creadoEn.toISOString(),
});

// GET /hospitalizaciones/:id/archivos
router.get("/hospitalizaciones/:id/archivos", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const rows = await db
    .select()
    .from(hospitalizacionArchivosTable)
    .where(eq(hospitalizacionArchivosTable.hospitalizacionId, id))
    .orderBy(hospitalizacionArchivosTable.creadoEn);

  res.json(rows.map(serialize));
});

// POST /hospitalizaciones/:id/archivos
router.post("/hospitalizaciones/:id/archivos", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [hosp] = await db.select({ id: hospitalizacionesTable.id }).from(hospitalizacionesTable).where(eq(hospitalizacionesTable.id, id));
  if (!hosp) { res.status(404).json({ error: "Hospitalización no encontrada" }); return; }

  const { objectPath, nombre, tipo } = req.body as { objectPath: string; nombre: string; tipo?: string };
  if (!objectPath || !nombre) { res.status(400).json({ error: "objectPath y nombre son requeridos" }); return; }

  const [row] = await db
    .insert(hospitalizacionArchivosTable)
    .values({ hospitalizacionId: id, objectPath, nombre, tipo: tipo ?? null })
    .returning();

  res.status(201).json(serialize(row));
});

// DELETE /hospitalizaciones/:hospitalizacionId/archivos/:archivoId
router.delete("/hospitalizaciones/:hospitalizacionId/archivos/:archivoId", async (req, res): Promise<void> => {
  const archivoId = parseInt(req.params.archivoId, 10);
  if (isNaN(archivoId)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [deleted] = await db
    .delete(hospitalizacionArchivosTable)
    .where(eq(hospitalizacionArchivosTable.id, archivoId))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Archivo no encontrado" }); return; }

  res.status(204).send();
});

export default router;
