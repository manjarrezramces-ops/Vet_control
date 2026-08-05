import {
  pgTable,
  serial,
  text,
  timestamp,
  date,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { pacientesTable } from "./pacientes";
import { consultasTable } from "./consultas";

export const pruebasFelinasTable = pgTable(
  "pruebas_felinas",
  {
    id: serial("id").primaryKey(),

    pacienteId: integer("paciente_id")
      .notNull()
      .references(() => pacientesTable.id, {
        onDelete: "cascade",
      }),

    consultaId: integer("consulta_id").references(
      () => consultasTable.id,
      {
        onDelete: "set null",
      },
    ),

    fechaPrueba: date("fecha_prueba", {
      mode: "string",
    }).notNull(),

    fechaResultado: date("fecha_resultado", {
      mode: "string",
    }),

    /**
     * Valores esperados:
     * - Clinica
     * - Externa
     */
    origen: text("origen").notNull().default("Clinica"),

    tipoPrueba: text("tipo_prueba")
      .notNull()
      .default("FIV/FeLV"),

    laboratorio: text("laboratorio"),

    clinicaExterna: text("clinica_externa"),

    medicoResponsable: text("medico_responsable"),

    medicoExterno: text("medico_externo"),

    /**
     * Valores esperados:
     * - Negativo
     * - Positivo
     * - Indeterminado
     * - Pendiente
     */
    resultadoFiv: text("resultado_fiv").notNull(),

    /**
     * Valores esperados:
     * - Negativo
     * - Positivo
     * - Indeterminado
     * - Pendiente
     */
    resultadoFelv: text("resultado_felv").notNull(),

    comprobantePresentado: boolean(
      "comprobante_presentado",
    )
      .notNull()
      .default(false),

    archivoResultado: text("archivo_resultado"),

    /**
     * Edad aproximada del paciente al momento de la prueba.
     * Puede usarse para confirmar que cumple con el criterio
     * definido por el médico antes de vacunar contra leucemia.
     */
    edadMeses: integer("edad_meses"),

    /**
     * Decisión médica vinculada con la vacuna de leucemia:
     * - Aplicar
     * - Posponer
     * - No indicada
     * - Contraindicada
     * - Pendiente
     */
    decisionLeucemia: text("decision_leucemia")
      .notNull()
      .default("Pendiente"),

    motivoDecision: text("motivo_decision"),

    /**
     * Permite definir cuándo revisar nuevamente el caso.
     */
    fechaReevaluacion: date("fecha_reevaluacion", {
      mode: "string",
    }),

    observaciones: text("observaciones"),

    creadoEn: timestamp("creado_en", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    actualizadoEn: timestamp("actualizado_en", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
);

export const insertPruebaFelinaSchema =
  createInsertSchema(pruebasFelinasTable).omit({
    id: true,
    creadoEn: true,
    actualizadoEn: true,
  });

export type InsertPruebaFelina = z.infer<
  typeof insertPruebaFelinaSchema
>;

export type PruebaFelina =
  typeof pruebasFelinasTable.$inferSelect;