import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "manager", "viewer"] }).notNull().default("viewer"),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const consultants = sqliteTable("consultants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  specialty: text("specialty").notNull(),
  rate: real("rate").notNull().default(0),
  status: text("status", { enum: ["available", "busy", "inactive"] }).notNull().default("available"),
  createdAt: text("created_at").notNull().default(""),
});

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  clientName: text("client_name").notNull(),
  description: text("description"),
  status: text("status", { enum: ["active", "completed", "on_hold", "cancelled"] }).notNull().default("active"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  budget: real("budget").notNull().default(0),
  consultantId: integer("consultant_id").references(() => consultants.id),
  createdAt: text("created_at").notNull().default(""),
});

export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceNumber: text("invoice_number").notNull().unique(),
  projectId: integer("project_id").references(() => projects.id),
  clientName: text("client_name").notNull(),
  amount: real("amount").notNull().default(0),
  status: text("status", { enum: ["draft", "sent", "paid", "overdue"] }).notNull().default("draft"),
  dueDate: text("due_date"),
  issuedDate: text("issued_date"),
  createdAt: text("created_at").notNull().default(""),
});

export type User = typeof users.$inferSelect;
export type Consultant = typeof consultants.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
