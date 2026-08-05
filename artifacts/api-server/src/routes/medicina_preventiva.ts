import { Router } from "express";
import {
  db,
  pacientesTable,
  vacunacionVisitasTable,
  vacunacionesTable,
  desparasitacionesTable,
  pruebasFelinasTable,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod/v4";

const router = Router();

/* =========================================================
   ESQUEMAS DE VALIDACIÓN
========================================================= */

const idSchema = z.coerce.number().int().positive();

const origenSchema = z.enum(["Clinica", "Externa"]);

const vacunaSchema = z.object({
  vacuna: z.string().min(1),
  especie: z.enum(["Perro", "Gato"]),
  etapa: z.enum(["Cachorro", "Adulto"]),

  marca: z.string().optional(),
  laboratorio: z.string().optional(),
  lote: z.string().optional(),
  fechaCaducidad: z.string().optional(),

  fechaAplicacion: z.string().min(1),
  fechaVencimiento: z.string().optional(),
  proximaAplicacion: z.string().optional(),

  estado: z
    .enum([
      "Aplicada",
      "Vigente",
      "Proxima",
      "Vencida",
      "Pendiente",
      "Pospuesta",
      "No indicada",
      "Contraindicada",
      "Pendiente de decision medica",
    ])
    .optional(),

  decisionMedica: z.string().optional(),
  motivoDecision: z.string().optional(),

  tipoRegistro: z.string().optional(),

  reaccionAdversa: z.boolean().optional(),
  descripcionReaccion: z.string().optional(),
  observaciones: z.string().optional(),
});

const crearVisitaVacunacionSchema = z.object({
  consultaId: z.number().int().positive().optional(),

  fechaVisita: z.string().min(1),

  intervaloDias: z.union([z.literal(15), z.literal(21)]).optional(),

  origen: origenSchema.optional(),

  medicoResponsable: z.string().optional(),

  clinicaExterna: z.string().optional(),
  medicoExterno: z.string().optional(),

  comprobantePresentado: z.boolean().optional(),

  observaciones: z.string().optional(),

  vacunas: z.array(vacunaSchema).min(1).max(2),
});

const actualizarVacunaSchema = vacunaSchema.partial();

const crearDesparasitacionSchema = z
  .object({
    consultaId: z.number().int().positive().optional(),

    fechaAplicacion: z.string().min(1),

    producto: z.string().min(1),

    principioActivo: z.string().optional(),
    lote: z.string().optional(),
    fabricante: z.string().optional(),

    origen: origenSchema.optional(),

    clinicaExterna: z.string().optional(),
    medicoResponsable: z.string().optional(),

    cubreInternos: z.boolean().optional(),
    cubreExternos: z.boolean().optional(),

    duracionDias: z.number().int().positive().optional(),

    /**
     * Frecuencia elegida por criterio médico.
     * No tiene que ser igual a la duración del efecto.
     */
    frecuenciaDias: z.number().int().positive().optional(),

    /**
     * Puede calcularse desde frecuenciaDias o elegirse manualmente.
     */
    proximaAplicacion: z.string().optional(),

    pesoAplicacion: z.string().optional(),

    observaciones: z.string().optional(),

    comprobantePresentado: z.boolean().optional(),
    archivoComprobante: z.string().optional(),
  })
  .refine(
    (data) =>
      Boolean(data.cubreInternos) || Boolean(data.cubreExternos),
    {
      message:
        "La desparasitación debe cubrir internos, externos o ambos.",
      path: ["cubreInternos"],
    },
  );

const actualizarDesparasitacionSchema =
  crearDesparasitacionSchema.partial();

const crearPruebaFelinaSchema = z.object({
  consultaId: z.number().int().positive().optional(),

  fechaPrueba: z.string().min(1),
  fechaResultado: z.string().optional(),

  origen: origenSchema.optional(),

  tipoPrueba: z.string().optional(),

  laboratorio: z.string().optional(),
  clinicaExterna: z.string().optional(),

  medicoResponsable: z.string().optional(),
  medicoExterno: z.string().optional(),

  resultadoFiv: z.enum([
    "Negativo",
    "Positivo",
    "Indeterminado",
    "Pendiente",
  ]),

  resultadoFelv: z.enum([
    "Negativo",
    "Positivo",
    "Indeterminado",
    "Pendiente",
  ]),

  comprobantePresentado: z.boolean().optional(),

  archivoResultado: z.string().optional(),

  edadMeses: z.number().int().nonnegative().optional(),

  decisionLeucemia: z
    .enum([
      "Aplicar",
      "Posponer",
      "No indicada",
      "Contraindicada",
      "Pendiente",
    ])
    .optional(),

  motivoDecision: z.string().optional(),

  fechaReevaluacion: z.string().optional(),

  observaciones: z.string().optional(),
});

const actualizarPruebaFelinaSchema =
  crearPruebaFelinaSchema.partial();

/* =========================================================
   FUNCIONES AUXILIARES
========================================================= */

function readId(value: string | string[] | undefined): number | null {
  const parsed = idSchema.safeParse(
    Array.isArray(value) ? value[0] : value,
  );

  return parsed.success ? parsed.data : null;
}

function dateToIso(
  value: Date | null | undefined,
): string | null {
  return value ? value.toISOString() : null;
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T12:00:00`);

  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
}

async function patientExists(
  pacienteId: number,
): Promise<boolean> {
  const [paciente] = await db
    .select({
      id: pacientesTable.id,
    })
    .from(pacientesTable)
    .where(eq(pacientesTable.id, pacienteId));

  return Boolean(paciente);
}

function serializeVaccinationVisit<
  T extends {
    creadoEn: Date;
    actualizadoEn: Date;
  },
>(record: T) {
  return {
    ...record,
    creadoEn: record.creadoEn.toISOString(),
    actualizadoEn: record.actualizadoEn.toISOString(),
  };
}

function serializeVaccine<
  T extends {
    creadoEn: Date;
    actualizadoEn: Date;
  },
>(record: T) {
  return {
    ...record,
    creadoEn: record.creadoEn.toISOString(),
    actualizadoEn: record.actualizadoEn.toISOString(),
  };
}

function serializeDeworming<
  T extends {
    creadoEn: Date;
    actualizadoEn: Date;
  },
>(record: T) {
  return {
    ...record,
    creadoEn: record.creadoEn.toISOString(),
    actualizadoEn: record.actualizadoEn.toISOString(),
  };
}

function serializeFelineTest<
  T extends {
    creadoEn: Date;
    actualizadoEn: Date;
  },
>(record: T) {
  return {
    ...record,
    creadoEn: record.creadoEn.toISOString(),
    actualizadoEn: record.actualizadoEn.toISOString(),
  };
}

/* =========================================================
   RESUMEN COMPLETO DE MEDICINA PREVENTIVA
========================================================= */

// GET /pacientes/:pacienteId/medicina-preventiva
router.get(
  "/pacientes/:pacienteId/medicina-preventiva",
  async (req, res): Promise<void> => {
    const pacienteId = readId(req.params.pacienteId);

    if (!pacienteId) {
      res.status(400).json({
        error: "Identificador de paciente inválido.",
      });
      return;
    }

    if (!(await patientExists(pacienteId))) {
      res.status(404).json({
        error: "Paciente no encontrado.",
      });
      return;
    }

    const visitas = await db
      .select()
      .from(vacunacionVisitasTable)
      .where(
        eq(vacunacionVisitasTable.pacienteId, pacienteId),
      )
      .orderBy(desc(vacunacionVisitasTable.fechaVisita));

    const vacunas = await db
      .select()
      .from(vacunacionesTable)
      .where(eq(vacunacionesTable.pacienteId, pacienteId))
      .orderBy(desc(vacunacionesTable.fechaAplicacion));

    const desparasitaciones = await db
      .select()
      .from(desparasitacionesTable)
      .where(
        eq(desparasitacionesTable.pacienteId, pacienteId),
      )
      .orderBy(
        desc(desparasitacionesTable.fechaAplicacion),
      );

    const pruebasFelinas = await db
      .select()
      .from(pruebasFelinasTable)
      .where(eq(pruebasFelinasTable.pacienteId, pacienteId))
      .orderBy(desc(pruebasFelinasTable.fechaPrueba));

    const visitasConVacunas = visitas.map((visita) => ({
      ...serializeVaccinationVisit(visita),

      vacunas: vacunas
        .filter((vacuna) => vacuna.visitaId === visita.id)
        .map(serializeVaccine),
    }));

    res.json({
      pacienteId,

      visitasVacunacion: visitasConVacunas,

      vacunaciones: vacunas.map(serializeVaccine),

      desparasitaciones:
        desparasitaciones.map(serializeDeworming),

      pruebasFelinas: pruebasFelinas.map(
        serializeFelineTest,
      ),
    });
  },
);

/* =========================================================
   VACUNACIONES
========================================================= */

// POST /pacientes/:pacienteId/vacunaciones/visitas
router.post(
  "/pacientes/:pacienteId/vacunaciones/visitas",
  async (req, res): Promise<void> => {
    const pacienteId = readId(req.params.pacienteId);

    if (!pacienteId) {
      res.status(400).json({
        error: "Identificador de paciente inválido.",
      });
      return;
    }

    const parsed = crearVisitaVacunacionSchema.safeParse(
      req.body,
    );

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    if (!(await patientExists(pacienteId))) {
      res.status(404).json({
        error: "Paciente no encontrado.",
      });
      return;
    }

    const data = parsed.data;

    const especies = new Set(
      data.vacunas.map((vacuna) => vacuna.especie),
    );

    if (especies.size !== 1) {
      res.status(400).json({
        error:
          "Todas las vacunas de la visita deben corresponder a la misma especie.",
      });
      return;
    }

    const etapas = new Set(
      data.vacunas.map((vacuna) => vacuna.etapa),
    );

    if (etapas.size !== 1) {
      res.status(400).json({
        error:
          "Todas las vacunas de la visita deben corresponder a la misma etapa.",
      });
      return;
    }

    const especie = data.vacunas[0]?.especie;
    const etapa = data.vacunas[0]?.etapa;

    /*
     * Regla:
     * La primera vacuna de un gato cachorro debe ser Triple felina.
     */
    if (especie === "Gato" && etapa === "Cachorro") {
      const vacunasFelinasPrevias = await db
        .select({
          id: vacunacionesTable.id,
        })
        .from(vacunacionesTable)
        .where(
          and(
            eq(vacunacionesTable.pacienteId, pacienteId),
            eq(vacunacionesTable.especie, "Gato"),
          ),
        );

      if (vacunasFelinasPrevias.length === 0) {
        const primeraVacuna = data.vacunas[0];

        if (
          data.vacunas.length !== 1 ||
          primeraVacuna?.vacuna !== "Triple felina"
        ) {
          res.status(400).json({
            error:
              "La primera vacunación de un gato cachorro debe ser únicamente Triple felina.",
          });
          return;
        }
      }
    }

    /*
     * Para aplicar vacuna contra leucemia felina debe existir
     * una prueba FeLV negativa registrada.
     */
    const incluyeLeucemia = data.vacunas.some(
      (vacuna) =>
        vacuna.vacuna.trim().toLowerCase() ===
        "leucemia felina",
    );

    if (incluyeLeucemia) {
      const [ultimaPrueba] = await db
        .select()
        .from(pruebasFelinasTable)
        .where(
          eq(pruebasFelinasTable.pacienteId, pacienteId),
        )
        .orderBy(desc(pruebasFelinasTable.fechaPrueba))
        .limit(1);

      if (!ultimaPrueba) {
        res.status(400).json({
          error:
            "Para registrar la vacuna contra leucemia felina debe existir una prueba FIV/FeLV previa.",
        });
        return;
      }

      if (ultimaPrueba.resultadoFelv !== "Negativo") {
        res.status(400).json({
          error:
            "La última prueba FeLV registrada no tiene resultado negativo.",
        });
        return;
      }
    }

    const result = await db.transaction(
      async (transaction) => {
        const [visita] = await transaction
          .insert(vacunacionVisitasTable)
          .values({
            pacienteId,
            consultaId: data.consultaId,
            fechaVisita: data.fechaVisita,
            intervaloDias: data.intervaloDias,
            origen: data.origen ?? "Clinica",
            medicoResponsable:
              data.medicoResponsable || null,
            clinicaExterna: data.clinicaExterna || null,
            medicoExterno: data.medicoExterno || null,
            comprobantePresentado:
              data.comprobantePresentado ?? false,
            observaciones: data.observaciones || null,
          })
          .returning();

        if (!visita) {
          throw new Error(
            "No se pudo crear la visita de vacunación.",
          );
        }

        const aplicaciones = data.vacunas.map(
          (vacuna) => ({
            visitaId: visita.id,
            pacienteId,

            vacuna: vacuna.vacuna,
            especie: vacuna.especie,
            etapa: vacuna.etapa,

            marca: vacuna.marca || null,
            laboratorio: vacuna.laboratorio || null,
            lote: vacuna.lote || null,

            fechaCaducidad:
              vacuna.fechaCaducidad || null,

            fechaAplicacion: vacuna.fechaAplicacion,

            fechaVencimiento:
              vacuna.fechaVencimiento || null,

            proximaAplicacion:
              vacuna.proximaAplicacion ||
              (data.intervaloDias
                ? addDays(
                    vacuna.fechaAplicacion,
                    data.intervaloDias,
                  )
                : null),

            estado: vacuna.estado ?? "Aplicada",

            decisionMedica:
              vacuna.decisionMedica || null,

            motivoDecision:
              vacuna.motivoDecision || null,

            tipoRegistro:
              vacuna.tipoRegistro ?? "Aplicacion",

            reaccionAdversa:
              vacuna.reaccionAdversa ?? false,

            descripcionReaccion:
              vacuna.descripcionReaccion || null,

            observaciones:
              vacuna.observaciones || null,
          }),
        );

        const vacunasCreadas = await transaction
          .insert(vacunacionesTable)
          .values(aplicaciones)
          .returning();

        return {
          visita,
          vacunas: vacunasCreadas,
        };
      },
    );

    res.status(201).json({
      visita: serializeVaccinationVisit(result.visita),

      vacunas: result.vacunas.map(serializeVaccine),
    });
  },
);

// PUT /vacunaciones/:vacunacionId
router.put(
  "/vacunaciones/:vacunacionId",
  async (req, res): Promise<void> => {
    const vacunacionId = readId(req.params.vacunacionId);

    if (!vacunacionId) {
      res.status(400).json({
        error: "Identificador de vacunación inválido.",
      });
      return;
    }

    const parsed = actualizarVacunaSchema.safeParse(
      req.body,
    );

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    const [updated] = await db
      .update(vacunacionesTable)
      .set({
        ...parsed.data,
        actualizadoEn: new Date(),
      })
      .where(eq(vacunacionesTable.id, vacunacionId))
      .returning();

    if (!updated) {
      res.status(404).json({
        error: "Vacunación no encontrada.",
      });
      return;
    }

    res.json(serializeVaccine(updated));
  },
);

// DELETE /vacunaciones/:vacunacionId
router.delete(
  "/vacunaciones/:vacunacionId",
  async (req, res): Promise<void> => {
    const vacunacionId = readId(req.params.vacunacionId);

    if (!vacunacionId) {
      res.status(400).json({
        error: "Identificador de vacunación inválido.",
      });
      return;
    }

    const [deleted] = await db
      .delete(vacunacionesTable)
      .where(eq(vacunacionesTable.id, vacunacionId))
      .returning();

    if (!deleted) {
      res.status(404).json({
        error: "Vacunación no encontrada.",
      });
      return;
    }

    res.status(204).send();
  },
);

// DELETE /vacunaciones/visitas/:visitaId
router.delete(
  "/vacunaciones/visitas/:visitaId",
  async (req, res): Promise<void> => {
    const visitaId = readId(req.params.visitaId);

    if (!visitaId) {
      res.status(400).json({
        error:
          "Identificador de visita de vacunación inválido.",
      });
      return;
    }

    const [deleted] = await db
      .delete(vacunacionVisitasTable)
      .where(eq(vacunacionVisitasTable.id, visitaId))
      .returning();

    if (!deleted) {
      res.status(404).json({
        error: "Visita de vacunación no encontrada.",
      });
      return;
    }

    res.status(204).send();
  },
);

/* =========================================================
   DESPARASITACIONES
========================================================= */

// POST /pacientes/:pacienteId/desparasitaciones
router.post(
  "/pacientes/:pacienteId/desparasitaciones",
  async (req, res): Promise<void> => {
    const pacienteId = readId(req.params.pacienteId);

    if (!pacienteId) {
      res.status(400).json({
        error: "Identificador de paciente inválido.",
      });
      return;
    }

    const parsed = crearDesparasitacionSchema.safeParse(
      req.body,
    );

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    if (!(await patientExists(pacienteId))) {
      res.status(404).json({
        error: "Paciente no encontrado.",
      });
      return;
    }

    const data = parsed.data;

    const proximaAplicacion =
      data.proximaAplicacion ||
      (data.frecuenciaDias
        ? addDays(
            data.fechaAplicacion,
            data.frecuenciaDias,
          )
        : null);

    const [created] = await db
      .insert(desparasitacionesTable)
      .values({
        pacienteId,
        consultaId: data.consultaId,

        fechaAplicacion: data.fechaAplicacion,

        producto: data.producto,

        principioActivo:
          data.principioActivo || null,

        lote: data.lote || null,
        fabricante: data.fabricante || null,

        origen: data.origen ?? "Clinica",

        clinicaExterna:
          data.clinicaExterna || null,

        medicoResponsable:
          data.medicoResponsable || null,

        cubreInternos: data.cubreInternos ?? false,
        cubreExternos: data.cubreExternos ?? false,

        duracionDias: data.duracionDias,

        frecuenciaDias: data.frecuenciaDias,

        proximaAplicacion,

        pesoAplicacion:
          data.pesoAplicacion || null,

        observaciones: data.observaciones || null,

        comprobantePresentado:
          data.comprobantePresentado ?? false,

        archivoComprobante:
          data.archivoComprobante || null,
      })
      .returning();

    if (!created) {
      res.status(500).json({
        error:
          "No se pudo registrar la desparasitación.",
      });
      return;
    }

    res.status(201).json(serializeDeworming(created));
  },
);

// PUT /desparasitaciones/:desparasitacionId
router.put(
  "/desparasitaciones/:desparasitacionId",
  async (req, res): Promise<void> => {
    const desparasitacionId = readId(
      req.params.desparasitacionId,
    );

    if (!desparasitacionId) {
      res.status(400).json({
        error:
          "Identificador de desparasitación inválido.",
      });
      return;
    }

    const parsed =
      actualizarDesparasitacionSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    const [updated] = await db
      .update(desparasitacionesTable)
      .set({
        ...parsed.data,
        actualizadoEn: new Date(),
      })
      .where(
        eq(
          desparasitacionesTable.id,
          desparasitacionId,
        ),
      )
      .returning();

    if (!updated) {
      res.status(404).json({
        error: "Desparasitación no encontrada.",
      });
      return;
    }

    res.json(serializeDeworming(updated));
  },
);

// DELETE /desparasitaciones/:desparasitacionId
router.delete(
  "/desparasitaciones/:desparasitacionId",
  async (req, res): Promise<void> => {
    const desparasitacionId = readId(
      req.params.desparasitacionId,
    );

    if (!desparasitacionId) {
      res.status(400).json({
        error:
          "Identificador de desparasitación inválido.",
      });
      return;
    }

    const [deleted] = await db
      .delete(desparasitacionesTable)
      .where(
        eq(
          desparasitacionesTable.id,
          desparasitacionId,
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({
        error: "Desparasitación no encontrada.",
      });
      return;
    }

    res.status(204).send();
  },
);

/* =========================================================
   PRUEBAS FELINAS FIV / FeLV
========================================================= */

// POST /pacientes/:pacienteId/pruebas-felinas
router.post(
  "/pacientes/:pacienteId/pruebas-felinas",
  async (req, res): Promise<void> => {
    const pacienteId = readId(req.params.pacienteId);

    if (!pacienteId) {
      res.status(400).json({
        error: "Identificador de paciente inválido.",
      });
      return;
    }

    const parsed = crearPruebaFelinaSchema.safeParse(
      req.body,
    );

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    if (!(await patientExists(pacienteId))) {
      res.status(404).json({
        error: "Paciente no encontrado.",
      });
      return;
    }

    const data = parsed.data;

    const [created] = await db
      .insert(pruebasFelinasTable)
      .values({
        pacienteId,
        consultaId: data.consultaId,

        fechaPrueba: data.fechaPrueba,
        fechaResultado: data.fechaResultado || null,

        origen: data.origen ?? "Clinica",

        tipoPrueba: data.tipoPrueba ?? "FIV/FeLV",

        laboratorio: data.laboratorio || null,
        clinicaExterna:
          data.clinicaExterna || null,

        medicoResponsable:
          data.medicoResponsable || null,

        medicoExterno:
          data.medicoExterno || null,

        resultadoFiv: data.resultadoFiv,
        resultadoFelv: data.resultadoFelv,

        comprobantePresentado:
          data.comprobantePresentado ?? false,

        archivoResultado:
          data.archivoResultado || null,

        edadMeses: data.edadMeses,

        decisionLeucemia:
          data.decisionLeucemia ?? "Pendiente",

        motivoDecision:
          data.motivoDecision || null,

        fechaReevaluacion:
          data.fechaReevaluacion || null,

        observaciones: data.observaciones || null,
      })
      .returning();

    if (!created) {
      res.status(500).json({
        error: "No se pudo registrar la prueba felina.",
      });
      return;
    }

    res.status(201).json(serializeFelineTest(created));
  },
);

// PUT /pruebas-felinas/:pruebaFelinaId
router.put(
  "/pruebas-felinas/:pruebaFelinaId",
  async (req, res): Promise<void> => {
    const pruebaFelinaId = readId(
      req.params.pruebaFelinaId,
    );

    if (!pruebaFelinaId) {
      res.status(400).json({
        error:
          "Identificador de prueba felina inválido.",
      });
      return;
    }

    const parsed =
      actualizarPruebaFelinaSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    const [updated] = await db
      .update(pruebasFelinasTable)
      .set({
        ...parsed.data,
        actualizadoEn: new Date(),
      })
      .where(eq(pruebasFelinasTable.id, pruebaFelinaId))
      .returning();

    if (!updated) {
      res.status(404).json({
        error: "Prueba felina no encontrada.",
      });
      return;
    }

    res.json(serializeFelineTest(updated));
  },
);

// DELETE /pruebas-felinas/:pruebaFelinaId
router.delete(
  "/pruebas-felinas/:pruebaFelinaId",
  async (req, res): Promise<void> => {
    const pruebaFelinaId = readId(
      req.params.pruebaFelinaId,
    );

    if (!pruebaFelinaId) {
      res.status(400).json({
        error:
          "Identificador de prueba felina inválido.",
      });
      return;
    }

    const [deleted] = await db
      .delete(pruebasFelinasTable)
      .where(eq(pruebasFelinasTable.id, pruebaFelinaId))
      .returning();

    if (!deleted) {
      res.status(404).json({
        error: "Prueba felina no encontrada.",
      });
      return;
    }

    res.status(204).send();
  },
);

export default router;