import { pgTable, serial, text, timestamp, numeric, date, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";

export const consultasTable = pgTable("consultas", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id, { onDelete: "cascade" }),
  fecha: date("fecha", { mode: "string" }).notNull(),
  hora: text("hora"),
  medico: text("medico"),
  motivo: text("motivo").notNull(),
  anamnesis: text("anamnesis"),
  exploracionFisica: text("exploracion_fisica"),
  peso: numeric("peso", { precision: 6, scale: 2 }),
  temperatura: numeric("temperatura", { precision: 5, scale: 1 }),
  frecuenciaCardiaca: integer("frecuencia_cardiaca"),
  pulso: text("pulso") 
  frecuenciaRespiratoria: integer("frecuencia_respiratoria"),
  mucosas: text("mucosas"),
  trc: text("trc"),
  condicionCorporal: text("condicion_corporal"),
  estadoMental: text("estado_mental"),
  linfonodos: text("linfonodos"),
  deshidratacion: text("deshidratacion"),
  ruidosTransito: text("ruidos_transito"),
  condicionPulso: text("condicion_pulso"),
  ruidosDorsales: text("ruidos_dorsales"),
  pp: text("pp"),
  presionArterial: text("presion_arterial"),
  diagnostico: text("diagnostico"),
  diagnosticosDiferenciales: text("diagnosticos_diferenciales"),
  plan: text("plan"),
  tratamiento: text("tratamiento"),
  pronostico: text("pronostico"),
  proximaCita: date("proxima_cita", { mode: "string" }),
  observaciones: text("observaciones"),
  archivoEstudios: text("archivo_estudios"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConsultaSchema = createInsertSchema(consultasTable).omit({ id: true, creadoEn: true });
export type InsertConsulta = z.infer<typeof insertConsultaSchema>;
export type Consulta = typeof consultasTable.$inferSelect;
