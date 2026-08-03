import { pgTable, serial, text, timestamp, date, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";
import { consultasTable } from "./consultas";

export const hospitalizacionesTable = pgTable("hospitalizaciones", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id, { onDelete: "cascade" }),
  consultaId: integer("consulta_id").references(() => consultasTable.id, { onDelete: "set null" }),
  fechaIngreso: date("fecha_ingreso", { mode: "string" }).notNull(),
  fechaAlta: date("fecha_alta", { mode: "string" }),
  tipoAlta: text("tipo_alta"),                     // 'Médica' | 'Voluntaria' | 'Defunción' | 'Traslado'
  altaVoluntariaRazon: text("alta_voluntaria_razon"),
  estado: text("estado").notNull().default("Hospitalizado"),  // Crítico | Grave | Estable | En observación | En recuperación | Hospitalizado
  motivo: text("motivo").notNull(),
  jaula: text("jaula"),
  veterinarioResponsable: text("veterinario_responsable"),
  tratamiento: text("tratamiento"),
  notasEvolucion: text("notas_evolucion"),
  observaciones: text("observaciones"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHospitalizacionSchema = createInsertSchema(hospitalizacionesTable).omit({ id: true, creadoEn: true });
export type InsertHospitalizacion = z.infer<typeof insertHospitalizacionSchema>;
export type Hospitalizacion = typeof hospitalizacionesTable.$inferSelect;
