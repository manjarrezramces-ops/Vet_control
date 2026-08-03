import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { hospitalizacionesTable } from "./hospitalizaciones";

export const hospitalizacionArchivosTable = pgTable("hospitalizacion_archivos", {
  id: serial("id").primaryKey(),
  hospitalizacionId: integer("hospitalizacion_id").notNull().references(() => hospitalizacionesTable.id, { onDelete: "cascade" }),
  objectPath: text("object_path").notNull(),
  nombre: text("nombre").notNull(),
  tipo: text("tipo"),                      // 'pdf' | 'image'
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export type HospitalizacionArchivo = typeof hospitalizacionArchivosTable.$inferSelect;
