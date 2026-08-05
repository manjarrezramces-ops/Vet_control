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

/**
 * Agrupa las vacunas aplicadas durante una misma visita.
 *
 * Ejemplo:
 * - Perro adulto: Óctuple + Rabia en una misma visita.
 * - Gato adulto: Triple + Rabia en una misma visita.
 *
 * Las reglas clínicas, como máximo dos vacunas por visita,
 * se validarán posteriormente en el backend.
 */
export const vacunacionVisitasTable = pgTable(
  "vacunacion_visitas",
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

    fechaVisita: date("fecha_visita", {
      mode: "string",
    }).notNull(),

    /**
     * Permite seleccionar el intervalo del esquema:
     * 15 o 21 días.
     *
     * Puede quedar vacío cuando se registra una vacuna
     * histórica o una aplicación anual sin próxima dosis inmediata.
     */
    intervaloDias: integer("intervalo_dias"),

    /**
     * Valores esperados:
     * - Clinica
     * - Externa
     */
    origen: text("origen").notNull().default("Clinica"),

    medicoResponsable: text("medico_responsable"),

    clinicaExterna: text("clinica_externa"),

    medicoExterno: text("medico_externo"),

    comprobantePresentado: boolean(
      "comprobante_presentado",
    )
      .notNull()
      .default(false),

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

/**
 * Cada vacuna aplicada se guarda como un registro independiente.
 *
 * Si durante una visita se aplican dos vacunas, se crean dos
 * registros vinculados al mismo visitaId.
 */
export const vacunacionesTable = pgTable("vacunaciones", {
  id: serial("id").primaryKey(),

  visitaId: integer("visita_id")
    .notNull()
    .references(() => vacunacionVisitasTable.id, {
      onDelete: "cascade",
    }),

  pacienteId: integer("paciente_id")
    .notNull()
    .references(() => pacientesTable.id, {
      onDelete: "cascade",
    }),

  /**
   * Ejemplos:
   *
   * Perro:
   * - Cuadruple
   * - Sextuple
   * - Octuple
   * - Bordetella
   * - Giardia
   * - Rabia
   *
   * Gato:
   * - Triple felina
   * - Cuadruple felina
   * - Leucemia felina
   * - Rabia
   */
  vacuna: text("vacuna").notNull(),

  /**
   * Valores esperados:
   * - Perro
   * - Gato
   */
  especie: text("especie").notNull(),

  /**
   * Valores esperados:
   * - Cachorro
   * - Adulto
   */
  etapa: text("etapa").notNull(),

  marca: text("marca"),

  laboratorio: text("laboratorio"),

  lote: text("lote"),

  fechaCaducidad: date("fecha_caducidad", {
    mode: "string",
  }),

  fechaAplicacion: date("fecha_aplicacion", {
    mode: "string",
  }).notNull(),

  /**
   * Fecha en la que termina la vigencia anual o la protección
   * considerada para esta vacuna.
   */
  fechaVencimiento: date("fecha_vencimiento", {
    mode: "string",
  }),

  /**
   * Fecha sugerida o decidida para la siguiente vacuna.
   * Puede modificarse manualmente.
   */
  proximaAplicacion: date("proxima_aplicacion", {
    mode: "string",
  }),

  /**
   * Valores esperados:
   * - Aplicada
   * - Vigente
   * - Proxima
   * - Vencida
   * - Pendiente
   * - Pospuesta
   * - No indicada
   * - Contraindicada
   * - Pendiente de decision medica
   */
  estado: text("estado").notNull().default("Aplicada"),

  /**
   * Se usa especialmente en vacuna contra leucemia felina.
   *
   * Valores posibles:
   * - Aplicar
   * - Posponer
   * - No indicada
   * - Contraindicada
   * - Pendiente
   */
  decisionMedica: text("decision_medica"),

  motivoDecision: text("motivo_decision"),

  /**
   * Para indicar si la aplicación se realizó conforme al esquema,
   * como antecedente externo o como una excepción médica.
   */
  tipoRegistro: text("tipo_registro")
    .notNull()
    .default("Aplicacion"),

  reaccionAdversa: boolean("reaccion_adversa")
    .notNull()
    .default(false),

  descripcionReaccion: text("descripcion_reaccion"),

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
});

export const insertVacunacionVisitaSchema =
  createInsertSchema(vacunacionVisitasTable).omit({
    id: true,
    creadoEn: true,
    actualizadoEn: true,
  });

export const insertVacunacionSchema = createInsertSchema(
  vacunacionesTable,
).omit({
  id: true,
  creadoEn: true,
  actualizadoEn: true,
});

export type InsertVacunacionVisita = z.infer<
  typeof insertVacunacionVisitaSchema
>;

export type VacunacionVisita =
  typeof vacunacionVisitasTable.$inferSelect;

export type InsertVacunacion = z.infer<
  typeof insertVacunacionSchema
>;

export type Vacunacion =
  typeof vacunacionesTable.$inferSelect;