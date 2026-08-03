import { pgTable, serial, text, timestamp, boolean, numeric, date, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientesTable } from "./clientes";

export const pacientesTable = pgTable("pacientes", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull().references(() => clientesTable.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  apellido: text("apellido"),
  especie: text("especie").notNull(),
  raza: text("raza"),
  sexo: text("sexo"),
  fechaNacimiento: date("fecha_nacimiento", { mode: "string" }),
  color: text("color"),
  peso: numeric("peso", { precision: 6, scale: 2 }),
  microchip: text("microchip"),
  esterilizado: boolean("esterilizado").notNull().default(false),
  estado: text("estado").notNull().default("Activo"),
  alergias: text("alergias"),
  antecedentes: text("antecedentes"),
  vacunas: text("vacunas"),
  alimentacion: text("alimentacion"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPacienteSchema = createInsertSchema(pacientesTable).omit({ id: true, creadoEn: true });
export type InsertPaciente = z.infer<typeof insertPacienteSchema>;
export type Paciente = typeof pacientesTable.$inferSelect;
