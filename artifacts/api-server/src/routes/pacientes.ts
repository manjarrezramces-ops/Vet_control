import { Router } from "express";
import { db, pacientesTable, clientesTable, consultasTable, recetasTable, recetaPartidasTable, pruebasTable } from "@workspace/db";
import { eq, ilike, or, sql } from "drizzle-orm";
import {
  GetPacientesQueryParams,
  GetPacientesResponse,
  CreatePacienteBody,
  CreatePacienteResponse,
  GetPacienteParams,
  GetPacienteResponse,
  UpdatePacienteParams,
  UpdatePacienteBody,
  UpdatePacienteResponse,
  DeletePacienteParams,
} from "@workspace/api-zod";

const router = Router();

// GET /pacientes
router.get("/pacientes", async (req, res): Promise<void> => {
  const parsed = GetPacientesQueryParams.safeParse(req.query);
  const q = parsed.success ? parsed.data.q : undefined;

  let query = db
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
    .$dynamic();

  if (q) {
    query = query.where(
      or(
        ilike(pacientesTable.nombre, `%${q}%`),
        ilike(pacientesTable.especie, `%${q}%`),
        ilike(sql`COALESCE(${pacientesTable.raza}, '')`, `%${q}%`),
        ilike(clientesTable.nombre, `%${q}%`),
        ilike(sql`COALESCE(${clientesTable.apellidos}, '')`, `%${q}%`),
      ),
    );
  }

  const rows = await query.orderBy(pacientesTable.nombre);
  const result = rows.map((r) => ({
    ...r,
    propietario: r.propietario.trim(),
    peso: r.peso != null ? Number(r.peso) : null,
    creadoEn: r.creadoEn.toISOString(),
  }));
  res.json(GetPacientesResponse.parse(result));
});

// POST /pacientes
router.post("/pacientes", async (req, res): Promise<void> => {
  const parsed = CreatePacienteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [paciente] = await db.insert(pacientesTable).values(parsed.data).returning();
  const [cliente] = await db.select().from(clientesTable).where(eq(clientesTable.id, paciente.clienteId));
  res.status(201).json(
    CreatePacienteResponse.parse({
      ...paciente,
      peso: paciente.peso != null ? Number(paciente.peso) : null,
      creadoEn: paciente.creadoEn.toISOString(),
    }),
  );
});

// GET /pacientes/:pacienteId
router.get("/pacientes/:pacienteId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.pacienteId) ? req.params.pacienteId[0] : req.params.pacienteId;
  const pacienteId = parseInt(raw, 10);
  if (isNaN(pacienteId)) { res.status(404).json({ error: "Not found" }); return; }

  GetPacienteParams.safeParse({ pacienteId });

  const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, pacienteId));
  if (!paciente) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const [cliente] = await db.select().from(clientesTable).where(eq(clientesTable.id, paciente.clienteId));
  const propietario = cliente ? `${cliente.nombre} ${cliente.apellidos ?? ""}`.trim() : "";

  const consultas = await db
    .select()
    .from(consultasTable)
    .where(eq(consultasTable.pacienteId, pacienteId))
    .orderBy(sql`${consultasTable.fecha} DESC, ${consultasTable.creadoEn} DESC`);

  const recetasRaw = await db
    .select()
    .from(recetasTable)
    .where(eq(recetasTable.pacienteId, pacienteId))
    .orderBy(sql`${recetasTable.fecha} DESC`);

  const recetas = await Promise.all(
    recetasRaw.map(async (r) => {
      const partidas = await db.select().from(recetaPartidasTable).where(eq(recetaPartidasTable.recetaId, r.id));
      return {
        ...r,
        partidas,
        paciente: paciente.nombre,
        propietario,
        especie: paciente.especie,
        raza: paciente.raza,
        creadoEn: r.creadoEn.toISOString(),
      };
    }),
  );

  const pruebas = await db
    .select()
    .from(pruebasTable)
    .where(eq(pruebasTable.pacienteId, pacienteId))
    .orderBy(sql`${pruebasTable.fecha} DESC`);

  const payload = {
    paciente: {
      ...paciente,
      peso: paciente.peso != null ? Number(paciente.peso) : null,
      creadoEn: paciente.creadoEn.toISOString(),
    },
    propietario,
    propietarioId: paciente.clienteId,
    consultas: consultas.map((c) => ({
      ...c,
      peso: c.peso != null ? Number(c.peso) : null,
      temperatura: c.temperatura != null ? Number(c.temperatura) : null,
      creadoEn: c.creadoEn.toISOString(),
    })),
    recetas,
    pruebas: pruebas.map((p) => ({
      ...p,
      costo: Number(p.costo),
      creadoEn: p.creadoEn.toISOString(),
    })),
  };

  res.json(GetPacienteResponse.parse(payload));
});

// PUT /pacientes/:pacienteId
router.put("/pacientes/:pacienteId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.pacienteId) ? req.params.pacienteId[0] : req.params.pacienteId;
  const pacienteId = parseInt(raw, 10);
  if (isNaN(pacienteId)) { res.status(404).json({ error: "Not found" }); return; }

  UpdatePacienteParams.safeParse({ pacienteId });
  const parsed = UpdatePacienteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db.update(pacientesTable).set(parsed.data).where(eq(pacientesTable.id, pacienteId)).returning();
  if (!updated) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  res.json(
    UpdatePacienteResponse.parse({
      ...updated,
      peso: updated.peso != null ? Number(updated.peso) : null,
      creadoEn: updated.creadoEn.toISOString(),
    }),
  );
});

// DELETE /pacientes/:pacienteId
router.delete("/pacientes/:pacienteId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.pacienteId) ? req.params.pacienteId[0] : req.params.pacienteId;
  const pacienteId = parseInt(raw, 10);
  if (isNaN(pacienteId)) { res.status(404).json({ error: "Not found" }); return; }

  DeletePacienteParams.safeParse({ pacienteId });
  const [deleted] = await db.delete(pacientesTable).where(eq(pacientesTable.id, pacienteId)).returning();
  if (!deleted) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  res.status(204).send();
});

export default router;
