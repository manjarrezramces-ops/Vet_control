import { Router } from "express";
import { db, clientesTable, pacientesTable, consultasTable, hospitalizacionesTable } from "@workspace/db";
import { count, eq, sql, gte, isNull } from "drizzle-orm";
import { GetDashboardResponse } from "@workspace/api-zod";

const router = Router();

router.get("/dashboard", async (req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);

  const [clientesCount] = await db.select({ count: count() }).from(clientesTable);
  const [pacientesCount] = await db.select({ count: count() }).from(pacientesTable);
  const [consultasCount] = await db.select({ count: count() }).from(consultasTable);
  const [consultasHoyCount] = await db
    .select({ count: count() })
    .from(consultasTable)
    .where(eq(consultasTable.fecha, today));

  const [proximasCitasRow] = await db
    .select({ count: count() })
    .from(consultasTable)
    .where(gte(consultasTable.proximaCita, today));

  const recientes = await db
    .select({
      id: consultasTable.id,
      fecha: consultasTable.fecha,
      pacienteId: consultasTable.pacienteId,
      paciente: pacientesTable.nombre,
      propietario: sql<string>`(SELECT nombre || ' ' || COALESCE(apellidos, '') FROM clientes WHERE id = ${pacientesTable.clienteId})`,
      motivo: consultasTable.motivo,
    })
    .from(consultasTable)
    .innerJoin(pacientesTable, eq(consultasTable.pacienteId, pacientesTable.id))
    .orderBy(sql`${consultasTable.fecha} DESC, ${consultasTable.creadoEn} DESC`)
    .limit(10);

  const proximasCitasLista = await db
    .select({
      id: consultasTable.id,
      pacienteId: consultasTable.pacienteId,
      paciente: pacientesTable.nombre,
      propietario: sql<string>`(SELECT nombre || ' ' || COALESCE(apellidos, '') FROM clientes WHERE id = ${pacientesTable.clienteId})`,
      proximaCita: consultasTable.proximaCita,
      motivo: consultasTable.motivo,
    })
    .from(consultasTable)
    .innerJoin(pacientesTable, eq(consultasTable.pacienteId, pacientesTable.id))
    .where(gte(consultasTable.proximaCita, today))
    .orderBy(consultasTable.proximaCita)
    .limit(50);

  const hospitalizadosLista = await db
    .select({
      id: hospitalizacionesTable.id,
      pacienteId: hospitalizacionesTable.pacienteId,
      paciente: pacientesTable.nombre,
      propietario: sql<string>`(SELECT nombre || ' ' || COALESCE(apellidos, '') FROM clientes WHERE id = ${pacientesTable.clienteId})`,
      estado: hospitalizacionesTable.estado,
      fechaIngreso: hospitalizacionesTable.fechaIngreso,
      motivo: hospitalizacionesTable.motivo,
    })
    .from(hospitalizacionesTable)
    .innerJoin(pacientesTable, eq(hospitalizacionesTable.pacienteId, pacientesTable.id))
    .where(isNull(hospitalizacionesTable.fechaAlta))
    .orderBy(hospitalizacionesTable.fechaIngreso);

  const payload = {
    stats: {
      clientes: clientesCount.count,
      pacientes: pacientesCount.count,
      consultas: consultasCount.count,
      consultasHoy: consultasHoyCount.count,
      proximasCitas: proximasCitasRow.count,
      hospitalizados: hospitalizadosLista.length,
    },
    recientes: recientes.map((r) => ({
      ...r,
      propietario: (r.propietario ?? "").trim(),
    })),
    proximasCitasLista: proximasCitasLista.map((r) => ({
      ...r,
      proximaCita: r.proximaCita!,
      propietario: (r.propietario ?? "").trim(),
    })),
    hospitalizadosLista: hospitalizadosLista.map((r) => ({
      ...r,
      propietario: (r.propietario ?? "").trim(),
    })),
  };

  res.json(GetDashboardResponse.parse(payload));
});

export default router;
