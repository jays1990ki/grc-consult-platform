import Database from "better-sqlite3";
import path from "path";
import { DB_PATH } from "../lib/db-path";

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const now = new Date().toISOString();

const assets = db.prepare(`
  INSERT OR IGNORE INTO risk_assets (name, type, confidentiality, integrity, availability, asset_value, description, owner, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const assetData = [
  ["Core Banking Database", "Data",     5, 5, 4, 4.67, "Central database storing all client financial records",  "IT Department", now],
  ["ERP Production Server", "Hardware", 3, 5, 5, 4.33, "Physical server hosting SAP S/4HANA production system",  "Infrastructure Team", now],
  ["Client Portal Web App", "Software", 4, 4, 5, 4.33, "Customer-facing portal for project status and invoicing", "Dev Team", now],
  ["Consulting Staff Team", "People",   4, 3, 2, 3.00, "Consulting team with access to client confidential data",  "HR Department", now],
  ["Network Infrastructure", "Hardware",3, 4, 5, 4.00, "Core network switches, routers and firewall appliances",   "IT Department", now],
];
for (const row of assetData) assets.run(...row);

// Re-fetch IDs
const dbAssets = db.prepare("SELECT id, name FROM risk_assets").all() as { id: number; name: string }[];
const aid = (name: string) => dbAssets.find(a => a.name === name)?.id ?? 1;

const assess = db.prepare(`
  INSERT OR IGNORE INTO risk_assessments (asset_id, threat_name, likelihood, impact, inherent_risk, risk_level, notes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const assessData = [
  [aid("Core Banking Database"),    "SQL Injection Attack",            4, 5, 93.4,  "Critical", "Could expose all client financial data",         now],
  [aid("Core Banking Database"),    "Unauthorised Data Access",        3, 5, 70.0,  "Medium",   "Insider threat from privileged accounts",        now],
  [aid("ERP Production Server"),    "Ransomware Infection",            3, 5, 65.0,  "Medium",   "Downtime risk to all consulting operations",      now],
  [aid("ERP Production Server"),    "Hardware Failure",                2, 4, 34.6,  "Medium",   "No redundant hardware currently in place",        now],
  [aid("Client Portal Web App"),    "Cross-Site Scripting (XSS)",      4, 4, 69.3,  "Medium",   "Client-facing surface with token data",           now],
  [aid("Client Portal Web App"),    "Broken Authentication",           5, 5, 108.3, "Critical", "Risk of full account takeover",                   now],
  [aid("Consulting Staff Team"),    "Social Engineering / Phishing",   4, 4, 48.0,  "Medium",   "Staff regularly targeted by spear-phishing",      now],
  [aid("Network Infrastructure"),   "DDoS Attack",                     3, 4, 48.0,  "Medium",   "Internet-facing services at risk",                now],
  [aid("Network Infrastructure"),   "Unpatched Network Device",        4, 5, 80.0,  "Critical", "CVEs identified in current firmware version",     now],
];
for (const row of assessData) assess.run(...row);

// Map some controls
const ctrlMap = db.prepare(`
  INSERT OR IGNORE INTO risk_control_mappings (assessment_id, control_id, selected, created_at)
  VALUES (?, ?, 1, ?)
`);
const assessments = db.prepare("SELECT id FROM risk_assessments").all() as { id: number }[];
const sampleControls = [
  ["A.8.3","A.8.5","A.5.15","A.5.16","A.8.15"],
  ["A.5.15","A.5.18","A.8.2","A.6.3"],
  ["A.8.7","A.8.9","A.8.13","A.7.1"],
  ["A.7.8","A.7.11","A.7.13","A.8.13"],
  ["A.8.28","A.8.29","A.8.5","A.8.3"],
  ["A.8.5","A.8.2","A.5.16","A.5.17","A.8.3"],
  ["A.6.3","A.6.6","A.5.24","A.6.8"],
  ["A.8.20","A.5.29","A.5.30","A.8.16"],
];
assessments.forEach((a, i) => {
  const ctrls = sampleControls[i] ?? [];
  for (const c of ctrls) ctrlMap.run(a.id, c, now);
});

console.log("Risk module demo data seeded!");
db.close();
