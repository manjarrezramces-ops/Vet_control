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

export const desparasitacionesTable = pgTable("desparasitaciones", {
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

  fechaAplicacion: date("fecha_aplicacion", {
    mode: "string",
  }).notNull(),

  producto: text("producto").notNull(),

  principioActivo: text("principio_activo"),

  lote: text("lote"),

  fabricante: text("fabricante"),

  origen: text("origen")
    .notNull()
    .default("Clinica"),

  clinicaExterna: text("clinica_externa"),

  medicoResponsable: text("medico_responsable"),

  cubreInternos: boolean("cubre_internos")
    .notNull()
    .default(false),

  cubreExternos: boolean("cubre_externos")
    .notNull()
    .default(false),

  duracionDias: integer("duracion_dias"),

  frecuenciaDias: integer("frecuencia_dias"),

  proximaAplicacion: date("proxima_aplicacion", {
    mode: "string",
  }),
  programarProxima: boolean("programar_proxima")
    .notNull()
    .default(false),

  tipoProgramacion: text("tipo_programacion"),

  proximoProductoTipo: text("proximo_producto_tipo"),

  proximoProducto: text("proximo_producto"),

  decisionMedica: text("decision_medica"),

  fechaFinCobertura: date("fecha_fin_cobertura", {
    mode: "string",
  }),
  pesoAplicacion: text("peso_aplicacion"),

  observaciones: text("observaciones"),

  comprobantePresentado: boolean("comprobante_presentado")
    .notNull()
    .default(false),

  archivoComprobante: text("archivo_comprobante"),

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

export const insertDesparasitacionSchema =
  createInsertSchema(desparasitacionesTable).omit({
    id: true,
    creadoEn: true,
    actualizadoEn: true,
  });

export type InsertDesparasitacion = z.infer<
  typeof insertDesparasitacionSchema
>;

export type Desparasitacion =
  typeof desparasitacionesTable.$inferSelect;