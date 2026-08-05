import { Router } from "express";
import {
  db,
  clientesTable,
  pacientesTable,
  consultasTable,
  hospitalizacionesTable,
  vacunacionesTable,
  desparasitacionesTable,
} from "@workspace/db";
import {
  and,
  count,
  eq,
  gte,
  isNotNull,
  isNull,
  lte,
  sql,
} from "drizzle-orm";
import { GetDashboardResponse } from "@workspace/api-zod";

const router = Router();

type EstadoPreventivo =
  | "Atrasada"
  | "Hoy"
  | "Próxima";

type VisitaPreventiva = {
  id: number;
  pacienteId: number;
  paciente: string;
  propietario: string;
  tipo:
    | "Vacunación"
    | "Desparasitación";
  concepto: string;
  fecha: string;
  estado: EstadoPreventivo;
  diasDiferencia: number;
  detalle: string | null;
};

/* =========================================================
   FECHAS EN HORARIO DE MÉXICO
========================================================= */

function fechaActualMexico(): string {
  const partes = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).formatToParts(new Date());

  const year =
    partes.find(
      (parte) => parte.type === "year",
    )?.value ?? "";

  const month =
    partes.find(
      (parte) => parte.type === "month",
    )?.value ?? "";

  const day =
    partes.find(
      (parte) => parte.type === "day",
    )?.value ?? "";

  return `${year}-${month}-${day}`;
}

function sumarDias(
  fecha: string,
  dias: number,
): string {
  const date = new Date(
    `${fecha.slice(0, 10)}T12:00:00`,
  );

  date.setDate(
    date.getDate() + dias,
  );

  return date
    .toISOString()
    .slice(0, 10);
}

function diferenciaDias(
  fechaObjetivo: string,
  fechaBase: string,
): number {
  const objetivo = new Date(
    `${fechaObjetivo.slice(0, 10)}T12:00:00`,
  );

  const base = new Date(
    `${fechaBase.slice(0, 10)}T12:00:00`,
  );

  return Math.round(
    (
      objetivo.getTime() -
      base.getTime()
    ) / 86_400_000,
  );
}

function obtenerEstadoPreventivo(
  diasDiferencia: number,
): EstadoPreventivo {
  if (diasDiferencia < 0) {
    return "Atrasada";
  }

  if (diasDiferencia === 0) {
    return "Hoy";
  }

  return "Próxima";
}

function prioridadEstado(
  estado: EstadoPreventivo,
): number {
  if (estado === "Atrasada") {
    return 0;
  }

  if (estado === "Hoy") {
    return 1;
  }

  return 2;
}

/* =========================================================
   DASHBOARD
========================================================= */

router.get(
  "/dashboard",
  async (
    req,
    res,
  ): Promise<void> => {
    try {
      const today =
        fechaActualMexico();

      /*
       * Los avisos próximos se muestran
       * hasta 15 días antes.
       */
      const limitePreventivo =
        sumarDias(today, 15);

      const [
        clientesCount,
        pacientesCount,
        consultasCount,
        consultasHoyCount,
        proximasCitasRow,
        recientes,
        proximasCitasLista,
        hospitalizadosLista,
        vacunasPreventivas,
        desparasitacionesPreventivas,
      ] = await Promise.all([
        db
          .select({
            count: count(),
          })
          .from(clientesTable),

        db
          .select({
            count: count(),
          })
          .from(pacientesTable),

        db
          .select({
            count: count(),
          })
          .from(consultasTable),

        db
          .select({
            count: count(),
          })
          .from(consultasTable)
          .where(
            eq(
              consultasTable.fecha,
              today,
            ),
          ),

        db
          .select({
            count: count(),
          })
          .from(consultasTable)
          .where(
            and(
              isNotNull(
                consultasTable.proximaCita,
              ),
              gte(
                consultasTable.proximaCita,
                today,
              ),
            ),
          ),

        db
          .select({
            id:
              consultasTable.id,

            fecha:
              consultasTable.fecha,

            pacienteId:
              consultasTable.pacienteId,

            paciente:
              pacientesTable.nombre,

            propietario:
              sql<string>`
                (
                  SELECT
                    nombre || ' ' ||
                    COALESCE(apellidos, '')
                  FROM clientes
                  WHERE id =
                    ${pacientesTable.clienteId}
                )
              `,

            motivo:
              consultasTable.motivo,
          })
          .from(consultasTable)
          .innerJoin(
            pacientesTable,
            eq(
              consultasTable.pacienteId,
              pacientesTable.id,
            ),
          )
          .orderBy(
            sql`
              ${consultasTable.fecha} DESC,
              ${consultasTable.creadoEn} DESC
            `,
          )
          .limit(10),

        db
          .select({
            id:
              consultasTable.id,

            pacienteId:
              consultasTable.pacienteId,

            paciente:
              pacientesTable.nombre,

            propietario:
              sql<string>`
                (
                  SELECT
                    nombre || ' ' ||
                    COALESCE(apellidos, '')
                  FROM clientes
                  WHERE id =
                    ${pacientesTable.clienteId}
                )
              `,

            proximaCita:
              consultasTable.proximaCita,

            motivo:
              consultasTable.motivo,
          })
          .from(consultasTable)
          .innerJoin(
            pacientesTable,
            eq(
              consultasTable.pacienteId,
              pacientesTable.id,
            ),
          )
          .where(
            and(
              isNotNull(
                consultasTable.proximaCita,
              ),
              gte(
                consultasTable.proximaCita,
                today,
              ),
            ),
          )
          .orderBy(
            consultasTable.proximaCita,
          )
          .limit(50),

        db
          .select({
            id:
              hospitalizacionesTable.id,

            pacienteId:
              hospitalizacionesTable.pacienteId,

            paciente:
              pacientesTable.nombre,

            propietario:
              sql<string>`
                (
                  SELECT
                    nombre || ' ' ||
                    COALESCE(apellidos, '')
                  FROM clientes
                  WHERE id =
                    ${pacientesTable.clienteId}
                )
              `,

            estado:
              hospitalizacionesTable.estado,

            fechaIngreso:
              hospitalizacionesTable.fechaIngreso,

            motivo:
              hospitalizacionesTable.motivo,
          })
          .from(
            hospitalizacionesTable,
          )
          .innerJoin(
            pacientesTable,
            eq(
              hospitalizacionesTable.pacienteId,
              pacientesTable.id,
            ),
          )
          .where(
            isNull(
              hospitalizacionesTable.fechaAlta,
            ),
          )
          .orderBy(
            hospitalizacionesTable.fechaIngreso,
          ),

        /*
         * Vacunas atrasadas, de hoy o
         * próximas dentro de 15 días.
         */
        db
          .select({
            id:
              vacunacionesTable.id,

            pacienteId:
              vacunacionesTable.pacienteId,

            paciente:
              pacientesTable.nombre,

            propietario:
              sql<string>`
                (
                  SELECT
                    nombre || ' ' ||
                    COALESCE(apellidos, '')
                  FROM clientes
                  WHERE id =
                    ${pacientesTable.clienteId}
                )
              `,

            vacuna:
              vacunacionesTable.vacuna,

            fecha:
              vacunacionesTable.proximaAplicacion,

            estadoRegistro:
              vacunacionesTable.estado,

            observaciones:
              vacunacionesTable.observaciones,
          })
          .from(vacunacionesTable)
          .innerJoin(
            pacientesTable,
            eq(
              vacunacionesTable.pacienteId,
              pacientesTable.id,
            ),
          )
          .where(
            and(
              isNotNull(
                vacunacionesTable.proximaAplicacion,
              ),
              lte(
                vacunacionesTable.proximaAplicacion,
                limitePreventivo,
              ),
              eq(
                vacunacionesTable.estado,
                "Aplicada",
              ),
            ),
          ),

        /*
         * Desparasitaciones atrasadas,
         * de hoy o próximas dentro de 15 días.
         */
        db
          .select({
            id:
              desparasitacionesTable.id,

            pacienteId:
              desparasitacionesTable.pacienteId,

            paciente:
              pacientesTable.nombre,

            propietario:
              sql<string>`
                (
                  SELECT
                    nombre || ' ' ||
                    COALESCE(apellidos, '')
                  FROM clientes
                  WHERE id =
                    ${pacientesTable.clienteId}
                )
              `,

            producto:
              desparasitacionesTable.producto,

            proximoProductoTipo:
              desparasitacionesTable.proximoProductoTipo,

            proximoProducto:
              desparasitacionesTable.proximoProducto,

            fecha:
              desparasitacionesTable.proximaAplicacion,

            decisionMedica:
              desparasitacionesTable.decisionMedica,

            observaciones:
              desparasitacionesTable.observaciones,
          })
          .from(
            desparasitacionesTable,
          )
          .innerJoin(
            pacientesTable,
            eq(
              desparasitacionesTable.pacienteId,
              pacientesTable.id,
            ),
          )
          .where(
            and(
              eq(
                desparasitacionesTable.programarProxima,
                true,
              ),
              isNotNull(
                desparasitacionesTable.proximaAplicacion,
              ),
              lte(
                desparasitacionesTable.proximaAplicacion,
                limitePreventivo,
              ),
            ),
          ),
      ]);

      const avisosVacunas:
        VisitaPreventiva[] =
        vacunasPreventivas
          .filter(
            (
              registro,
            ): registro is typeof registro & {
              fecha: string;
            } =>
              Boolean(
                registro.fecha,
              ),
          )
          .map((registro) => {
            const diasDiferencia =
              diferenciaDias(
                registro.fecha,
                today,
              );

            return {
              id:
                registro.id,

              pacienteId:
                registro.pacienteId,

              paciente:
                registro.paciente,

              propietario:
                (
                  registro.propietario ??
                  ""
                ).trim(),

              tipo:
                "Vacunación",

              concepto:
                registro.vacuna,

              fecha:
                registro.fecha,

              estado:
                obtenerEstadoPreventivo(
                  diasDiferencia,
                ),

              diasDiferencia,

              detalle:
                registro.observaciones ??
                null,
            };
          });

      const avisosDesparasitaciones:
        VisitaPreventiva[] =
        desparasitacionesPreventivas
          .filter(
            (
              registro,
            ): registro is typeof registro & {
              fecha: string;
            } =>
              Boolean(
                registro.fecha,
              ),
          )
          .map((registro) => {
            const diasDiferencia =
              diferenciaDias(
                registro.fecha,
                today,
              );

            let concepto =
              registro.producto;

            if (
              registro.proximoProductoTipo ===
                "Otro producto" &&
              registro.proximoProducto
            ) {
              concepto =
                registro.proximoProducto;
            } else if (
              registro.proximoProductoTipo ===
              "Por decidir"
            ) {
              concepto =
                "Producto por decidir";
            }

            const detalle =
              registro.decisionMedica ??
              registro.observaciones ??
              null;

            return {
              id:
                registro.id,

              pacienteId:
                registro.pacienteId,

              paciente:
                registro.paciente,

              propietario:
                (
                  registro.propietario ??
                  ""
                ).trim(),

              tipo:
                "Desparasitación",

              concepto,

              fecha:
                registro.fecha,

              estado:
                obtenerEstadoPreventivo(
                  diasDiferencia,
                ),

              diasDiferencia,

              detalle,
            };
          });

      const visitasPreventivas = [
        ...avisosVacunas,
        ...avisosDesparasitaciones,
      ]
        .sort((a, b) => {
          const prioridad =
            prioridadEstado(a.estado) -
            prioridadEstado(b.estado);

          if (prioridad !== 0) {
            return prioridad;
          }

          return a.fecha.localeCompare(
            b.fecha,
          );
        })
        .slice(0, 100);

      const payload = {
        stats: {
          clientes:
            clientesCount[0]?.count ??
            0,

          pacientes:
            pacientesCount[0]?.count ??
            0,

          consultas:
            consultasCount[0]?.count ??
            0,

          consultasHoy:
            consultasHoyCount[0]?.count ??
            0,

          proximasCitas:
            proximasCitasRow[0]?.count ??
            0,

          hospitalizados:
            hospitalizadosLista.length,

          medicinaPreventiva:
            visitasPreventivas.length,
        },

        recientes:
          recientes.map(
            (registro) => ({
              ...registro,

              propietario:
                (
                  registro.propietario ??
                  ""
                ).trim(),
            }),
          ),

        proximasCitasLista:
          proximasCitasLista
            .filter(
              (
                registro,
              ): registro is typeof registro & {
                proximaCita: string;
              } =>
                Boolean(
                  registro.proximaCita,
                ),
            )
            .map(
              (registro) => ({
                ...registro,

                propietario:
                  (
                    registro.propietario ??
                    ""
                  ).trim(),
              }),
            ),

        hospitalizadosLista:
          hospitalizadosLista.map(
            (registro) => ({
              ...registro,

              propietario:
                (
                  registro.propietario ??
                  ""
                ).trim(),
            }),
          ),

        visitasPreventivas,
      };

      res.json(
        GetDashboardResponse.parse(
          payload,
        ),
      );
    } catch (error) {
      req.log?.error?.(
        {
          err: error,
        },
        "Error cargando dashboard",
      );

      res.status(500).json({
        error:
          "No se pudo cargar el dashboard.",
      });
    }
  },
);

export default router;
