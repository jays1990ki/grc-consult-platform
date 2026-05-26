import { db, schema } from "../lib/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  const now = new Date().toISOString();

  // Admin user
  const adminHash = await bcrypt.hash("Admin@1234", 12);
  db.insert(schema.users).values([
    { name: "Admin ME Corp", email: "admin@mecorp.th", password: adminHash, role: "admin", status: "active", createdAt: now, updatedAt: now },
    { name: "Jane Manager", email: "manager@mecorp.th", password: await bcrypt.hash("Manager@1234", 12), role: "manager", status: "active", createdAt: now, updatedAt: now },
    { name: "Tom Viewer", email: "viewer@mecorp.th", password: await bcrypt.hash("Viewer@1234", 12), role: "viewer", status: "active", createdAt: now, updatedAt: now },
  ]).onConflictDoNothing().run();

  // Consultants
  db.insert(schema.consultants).values([
    { name: "Dr. Somchai Thairath", email: "somchai@mecorp.th", phone: "+66-81-234-5678", specialty: "Strategy & Management", rate: 15000, status: "available", createdAt: now },
    { name: "Nattaya Wongprom", email: "nattaya@mecorp.th", phone: "+66-89-876-5432", specialty: "Financial Advisory", rate: 12000, status: "busy", createdAt: now },
    { name: "Prakash Sharma", email: "prakash@mecorp.th", phone: "+66-92-111-2233", specialty: "IT Consulting", rate: 18000, status: "available", createdAt: now },
    { name: "Siriporn Chantra", email: "siriporn@mecorp.th", phone: "+66-83-444-5566", specialty: "HR & Organizational", rate: 10000, status: "inactive", createdAt: now },
    { name: "James Wilson", email: "james@mecorp.th", phone: "+66-95-777-8899", specialty: "Marketing Strategy", rate: 14000, status: "busy", createdAt: now },
  ]).onConflictDoNothing().run();

  // Projects
  db.insert(schema.projects).values([
    { name: "Digital Transformation", clientName: "PTT Group", description: "Enterprise-wide digital transformation initiative", status: "active", startDate: "2024-01-15", endDate: "2024-12-31", budget: 5000000, consultantId: 1, createdAt: now },
    { name: "Financial Restructuring", clientName: "Bangkok Bank", description: "Balance sheet optimization and cost reduction", status: "active", startDate: "2024-03-01", endDate: "2024-09-30", budget: 2500000, consultantId: 2, createdAt: now },
    { name: "ERP Implementation", clientName: "Central Group", description: "SAP S/4HANA implementation across 50 entities", status: "completed", startDate: "2023-06-01", endDate: "2024-02-28", budget: 8000000, consultantId: 3, createdAt: now },
    { name: "Market Entry Strategy", clientName: "ThaiBev", description: "Southeast Asia market expansion strategy", status: "on_hold", startDate: "2024-05-01", endDate: "2024-11-30", budget: 1800000, consultantId: 5, createdAt: now },
    { name: "HR Transformation", clientName: "True Corporation", description: "HR process redesign and HRIS implementation", status: "active", startDate: "2024-02-01", endDate: "2025-01-31", budget: 3200000, consultantId: 4, createdAt: now },
  ]).onConflictDoNothing().run();

  // Invoices
  db.insert(schema.invoices).values([
    { invoiceNumber: "INV-2024-001", projectId: 1, clientName: "PTT Group", amount: 750000, status: "paid", dueDate: "2024-02-15", issuedDate: "2024-01-15", createdAt: now },
    { invoiceNumber: "INV-2024-002", projectId: 2, clientName: "Bangkok Bank", amount: 500000, status: "paid", dueDate: "2024-04-01", issuedDate: "2024-03-01", createdAt: now },
    { invoiceNumber: "INV-2024-003", projectId: 1, clientName: "PTT Group", amount: 750000, status: "sent", dueDate: "2024-05-15", issuedDate: "2024-04-15", createdAt: now },
    { invoiceNumber: "INV-2024-004", projectId: 3, clientName: "Central Group", amount: 1200000, status: "paid", dueDate: "2024-03-28", issuedDate: "2024-02-28", createdAt: now },
    { invoiceNumber: "INV-2024-005", projectId: 5, clientName: "True Corporation", amount: 400000, status: "overdue", dueDate: "2024-04-30", issuedDate: "2024-03-30", createdAt: now },
    { invoiceNumber: "INV-2024-006", projectId: 2, clientName: "Bangkok Bank", amount: 500000, status: "draft", dueDate: "2024-07-01", issuedDate: "2024-06-01", createdAt: now },
  ]).onConflictDoNothing().run();

  console.log("Database seeded successfully!");
}

seed().catch(console.error);
