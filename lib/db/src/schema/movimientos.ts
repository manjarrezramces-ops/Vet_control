import { pgTable, serial, text, timestamp, numeric, date, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientesTable } from "./clientes";
import { pacientesTable } from "./pacientes";

export const movimientosTable = pgTable("movimientos", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull().references(() => clientesTable.id, { onDelete: "cascade" }),
  pacienteId: integer("paciente_id").references(() => pacientesTable.id, { onDelete: "set null" }),
  fecha: date("fecha", { mode: "string" }).notNull(),
  tipo: text("tipo").notNull(),
  concepto: text("concepto").notNull(),
  importe: numeric("importe", { precision: 10, scale: 2 }).notNull(),
  metodoPago: text("metodo_pago"),
  referencia: text("referencia"),
  notas: text("notas"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMovimientoSchema = createInsertSchema(movimientosTable).omit({ id: true, creadoEn: true });
export type InsertMovimiento = z.infer<typeof insertMovimientoSchema>;
export type Movimiento = typeof movimientosTable.$inferSelect;
