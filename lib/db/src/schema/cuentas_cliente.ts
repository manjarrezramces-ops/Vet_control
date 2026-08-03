import { pgTable, serial, integer, text, timestamp, numeric, boolean, date } from "drizzle-orm/pg-core";
import { clientesTable } from "./clientes";

export const cuentasClienteTable = pgTable("cuentas_cliente", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull().references(() => clientesTable.id, { onDelete: "cascade" }),
  fecha: date("fecha", { mode: "string" }).notNull(),
  monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
  liquidado: boolean("liquidado").notNull().default(false),
  liquidadoEn: timestamp("liquidado_en", { withTimezone: true }),
  montoPagado: numeric("monto_pagado", { precision: 12, scale: 2 }),
  tipoPago: text("tipo_pago"), // 'total' | 'parcial'
  hojaConceptos: text("hoja_conceptos"),
  notas: text("notas"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export type CuentaCliente = typeof cuentasClienteTable.$inferSelect;
