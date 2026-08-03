import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientesTable = pgTable("clientes", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  apellidos: text("apellidos"),
  telefono: text("telefono").notNull(),
  telefonoAlterno: text("telefono_alterno"),
  email: text("email"),
  rfc: text("rfc"),
  direccion: text("direccion"),
  notas: text("notas"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const insertClienteSchema = createInsertSchema(clientesTable).omit({ id: true, creadoEn: true });
export type InsertCliente = z.infer<typeof insertClienteSchema>;
export type Cliente = typeof clientesTable.$inferSelect;
