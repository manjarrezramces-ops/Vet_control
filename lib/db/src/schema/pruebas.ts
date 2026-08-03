import { pgTable, serial, text, timestamp, numeric, date, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";
import { consultasTable } from "./consultas";

export const pruebasTable = pgTable("pruebas", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id, { onDelete: "cascade" }),
  consultaId: integer("consulta_id").references(() => consultasTable.id, { onDelete: "set null" }),
  fecha: date("fecha", { mode: "string" }).notNull(),
  tipo: text("tipo"),
  nombre: text("nombre").notNull(),
  laboratorio: text("laboratorio"),
  resultado: text("resultado"),
  interpretacion: text("interpretacion"),
  costo: numeric("costo", { precision: 10, scale: 2 }).notNull().default("0"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPruebaSchema = createInsertSchema(pruebasTable).omit({ id: true, creadoEn: true });
export type InsertPrueba = z.infer<typeof insertPruebaSchema>;
export type Prueba = typeof pruebasTable.$inferSelect;
