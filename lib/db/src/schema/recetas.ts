import { pgTable, serial, text, timestamp, date, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";
import { consultasTable } from "./consultas";

export const recetasTable = pgTable("recetas", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id, { onDelete: "cascade" }),
  consultaId: integer("consulta_id").references(() => consultasTable.id, { onDelete: "set null" }),
  fecha: date("fecha", { mode: "string" }).notNull(),
  medico: text("medico"),
  indicacionesGenerales: text("indicaciones_generales"),
  proximaRevision: date("proxima_revision", { mode: "string" }),
  archivoImagen: text("archivo_imagen"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const recetaPartidasTable = pgTable("receta_partidas", {
  id: serial("id").primaryKey(),
  recetaId: integer("receta_id").notNull().references(() => recetasTable.id, { onDelete: "cascade" }),
  medicamento: text("medicamento").notNull(),
  presentacion: text("presentacion"),
  dosis: text("dosis").notNull(),
  via: text("via"),
  frecuencia: text("frecuencia"),
  duracion: text("duracion"),
  instrucciones: text("instrucciones"),
});

export const insertRecetaSchema = createInsertSchema(recetasTable).omit({ id: true, creadoEn: true });
export const insertRecetaPartidaSchema = createInsertSchema(recetaPartidasTable).omit({ id: true });
export type InsertReceta = z.infer<typeof insertRecetaSchema>;
export type Receta = typeof recetasTable.$inferSelect;
export type RecetaPartida = typeof recetaPartidasTable.$inferSelect;
