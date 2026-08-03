import { pgTable, serial, text, timestamp, date, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";

export const TIPOS_PROCEDIMIENTO = [
  "Cirugía",
  "Profilaxis Dental",
  "Radiografía",
  "Ultrasonido",
  "Electrocardiograma",
  "Endoscopía",
  "Biopsia",
  "Desparasitación",
  "Vacunación",
  "Otro",
] as const;

export const procedimientosTable = pgTable("procedimientos", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id, { onDelete: "cascade" }),
  fecha: date("fecha", { mode: "string" }).notNull(),
  tipo: text("tipo").notNull(),
  descripcion: text("descripcion"),
  veterinario: text("veterinario"),
  resultado: text("resultado"),
  notas: text("notas"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProcedimientoSchema = createInsertSchema(procedimientosTable).omit({ id: true, creadoEn: true });
export type InsertProcedimiento = z.infer<typeof insertProcedimientoSchema>;
export type Procedimiento = typeof procedimientosTable.$inferSelect;
