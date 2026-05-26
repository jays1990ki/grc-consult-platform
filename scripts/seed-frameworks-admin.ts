/**
 * Seed script: Admin-managed frameworks
 * Adds ISO 27701, ISO 42001, ISO 22301 (new)
 * and expands PDPA Thailand to 10+ requirements.
 * All inserts are idempotent (INSERT OR IGNORE).
 */
import Database from "better-sqlite3";
import path from "path";
import { DB_PATH } from "../lib/db-path";

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function ensureFramework(
  name: string,
  version: string,
  description: string,
  category: string,
): number {
  const existing = db.prepare(
    "SELECT id FROM gap_frameworks WHERE name = ? AND version = ?"
  ).get(name, version) as any;

  if (existing) {
    // Update category if missing
    db.prepare(
      "UPDATE gap_frameworks SET category = ?, description = ? WHERE id = ? AND (category IS NULL OR category = '')"
    ).run(category, description, existing.id);
    console.log(`  ✓ Framework exists: ${name} v${version} (id=${existing.id})`);
    return existing.id;
  }

  const r = db.prepare(`
    INSERT OR IGNORE INTO gap_frameworks (name, version, description, category, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(name, version, description, category);

  const id = r.lastInsertRowid
    ? Number(r.lastInsertRowid)
    : (db.prepare("SELECT id FROM gap_frameworks WHERE name = ? AND version = ?").get(name, version) as any).id;

  console.log(`  + Created framework: ${name} v${version} (id=${id})`);
  return id;
}

function addReq(
  fwId: number,
  reqId: string,
  name: string,
  domain: string,
  description: string,
  guidance: string,
  sortOrder: number,
) {
  db.prepare(`
    INSERT OR IGNORE INTO gap_requirements
      (framework_id, requirement_id, requirement_name, domain, description, guidance, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(fwId, reqId, name, domain, description, guidance, sortOrder);
}

// ── ISO 27701:2019 — Privacy Information Management ───────────────────────────
{
  const id = ensureFramework(
    "ISO 27701",
    "2019",
    "Privacy Information Management System (PIMS) — Extension to ISO 27001/27002 for PII protection",
    "Privacy",
  );

  const reqs = [
    [10,  "6.1",     "Understanding the organization and its context",        "PIMS Controls",      "Determine external and internal issues relevant to PIMS",                              "Review legal, regulatory, and contractual PII obligations. Map data flows."],
    [20,  "6.2",     "Information security objectives for privacy",            "PIMS Controls",      "Establish measurable privacy objectives aligned with organizational strategy",          "Set KPIs for PII breach rate, consent rate, data subject request response time."],
    [30,  "7.2.1",   "Roles and responsibilities for PII processing",          "PIMS Controls",      "Assign accountability for PII processing activities across the organization",           "Define Data Owner, Data Processor, and DPO roles. Document in RACI matrix."],
    [40,  "7.2.2",   "Purpose limitation",                                     "Privacy by Design",  "PII must only be collected and processed for specified, explicit, and legitimate purposes","Document purpose in Privacy Notice. Conduct purpose compatibility test before new uses."],
    [50,  "7.2.5",   "Privacy by design and by default",                       "Privacy by Design",  "Implement technical and organizational measures to integrate privacy into systems design", "Review architecture decisions. Ensure minimum PII collection. Apply pseudonymization."],
    [60,  "7.3.1",   "Privacy notice",                                         "Data Subject Rights","Provide clear, accessible privacy notice before or at time of PII collection",            "Verify notice covers: identity, purpose, legal basis, retention, rights, transfers."],
    [70,  "7.3.2",   "Providing information to PII principals",                "Data Subject Rights","Respond to data subject requests for access, rectification, erasure, and portability",   "Implement request workflow. Target 30-day response. Log all requests and responses."],
    [80,  "7.4.1",   "Consent management",                                     "Data Subject Rights","Obtain, record, and manage consent for PII processing where consent is the legal basis",  "Verify consent is freely given, specific, informed, unambiguous. Keep consent logs."],
    [90,  "7.4.3",   "Privacy of children",                                    "Data Subject Rights","Implement additional safeguards for PII of children under applicable age thresholds",     "Age verification mechanism. Parental consent where required. Limit data collection."],
    [100, "7.5.1",   "Binding contracts with third-party PII processors",      "Third Party",        "Ensure contractual obligations protect PII when sharing with processors or sub-processors","Review DPA (Data Processing Agreement) clauses. Audit third-party compliance annually."],
    [110, "7.5.2",   "Transfer of PII to third countries",                     "Third Party",        "Implement appropriate safeguards before transferring PII outside the country",            "Use SCCs, BCRs, or adequacy decisions. Document transfer impact assessment."],
    [120, "8.2.1",   "PII breach notification procedures",                     "Breach Response",    "Define procedures to detect, assess, and notify PII breaches within required timeframes", "Target 72-hour notification to authority. Assess severity. Notify principals if high risk."],
    [130, "8.2.2",   "Notification to PII principals of breaches",             "Breach Response",    "Notify affected individuals when a breach is likely to result in high risk to their rights","Draft breach notification template. Define escalation triggers. Test annually."],
  ] as const;

  for (const [sort, reqId, name2, domain, desc, guide] of reqs) {
    addReq(id, reqId, name2, domain, desc, guide, sort);
  }
  console.log(`  + Seeded ${reqs.length} requirements for ISO 27701`);
}

// ── ISO 42001:2023 — AI Management System ─────────────────────────────────────
{
  const id = ensureFramework(
    "ISO 42001",
    "2023",
    "Artificial Intelligence Management System (AIMS) — Framework for responsible AI development and use",
    "AI Management",
  );

  const reqs = [
    [10,  "4.1",   "Understanding the organization and its AI context",       "AI Governance",    "Determine AI-relevant external and internal issues, including regulatory environment",   "Map AI use cases. Identify applicable laws (EU AI Act, PDPA). Assess AI maturity."],
    [20,  "4.2",   "Understanding the needs of interested parties",           "AI Governance",    "Identify stakeholders and their requirements regarding AI systems",                      "Include regulators, customers, employees, AI developers in stakeholder analysis."],
    [30,  "5.2",   "AI policy",                                               "AI Governance",    "Establish, implement, and maintain an AI policy appropriate to the organization",        "Policy should cover ethics, fairness, transparency, accountability, and data governance."],
    [40,  "5.4",   "Roles and responsibilities for AI management",            "AI Governance",    "Assign and communicate AI-related roles, responsibilities, and authorities",             "Define AI Owner, AI Risk Officer, and Ethics Board. Document in org chart."],
    [50,  "6.1.2", "AI risk assessment",                                      "Risk Assessment",  "Identify and assess AI-specific risks including bias, accuracy, and privacy risks",      "Use systematic risk framework. Consider data quality, model drift, adversarial attacks."],
    [60,  "6.1.4", "Treating AI risks",                                       "Risk Assessment",  "Select and implement appropriate options to address identified AI risks",                "Implement model validation, bias testing, output monitoring, and human review gates."],
    [70,  "8.3",   "AI system life cycle",                                    "Data Quality",     "Manage the complete lifecycle of AI systems from design through decommissioning",        "Define MLOps processes. Version control models and training data. Document lineage."],
    [80,  "8.4",   "AI system impact assessment",                             "Human Oversight",  "Assess the impact of AI systems on individuals and society before deployment",           "Conduct DPIA for high-risk AI. Assess fairness across demographic groups."],
    [90,  "8.6",   "AI system operation",                                     "Human Oversight",  "Operate AI systems with appropriate human oversight and intervention capability",        "Define human-in-the-loop requirements. Set thresholds for automatic suspension."],
    [100, "9.1",   "Monitoring and measurement of AI performance",            "Transparency",     "Monitor AI system performance, fairness, and alignment with intended objectives",        "Set KPIs for accuracy, drift, bias. Review at least quarterly. Document deviations."],
    [110, "9.2",   "AI management system audit",                              "Transparency",     "Conduct internal audits of the AI management system at planned intervals",               "Annual AIMS internal audit. Cross-functional audit team including technical and ethics."],
    [120, "10.1",  "Nonconformity and corrective action for AI",              "AI Governance",    "Identify nonconformities in AI systems and take corrective action",                     "Root cause analysis for AI failures. Track corrective actions to closure."],
  ] as const;

  for (const [sort, reqId, name2, domain, desc, guide] of reqs) {
    addReq(id, reqId, name2, domain, desc, guide, sort);
  }
  console.log(`  + Seeded ${reqs.length} requirements for ISO 42001`);
}

// ── ISO 22301:2019 — Business Continuity Management ───────────────────────────
{
  const id = ensureFramework(
    "ISO 22301",
    "2019",
    "Business Continuity Management System (BCMS) — Requirements for planning and managing organizational resilience",
    "Business Continuity",
  );

  const reqs = [
    [10,  "4.2",  "Needs and expectations of interested parties",        "Context",      "Identify interested parties and determine relevant requirements for BCMS",             "Include customers, regulators, insurers, key suppliers. Document requirements matrix."],
    [20,  "4.3",  "Determining the scope of the BCMS",                   "Context",      "Define and document the scope of the business continuity management system",           "Consider products/services, processes, locations, technology, and stakeholders in scope."],
    [30,  "5.2",  "Business continuity policy",                          "Leadership",   "Establish a business continuity policy appropriate to the purpose of the organization", "Policy should commit to BCM objectives, resources, and continual improvement. Review annually."],
    [40,  "6.1",  "Actions to address risks and opportunities",          "Planning",     "Determine and address risks and opportunities to ensure BCMS achieves intended outcomes","Use risk register. Prioritize risks by likelihood and impact on continuity objectives."],
    [50,  "6.2",  "Business continuity objectives and planning",         "Planning",     "Establish measurable business continuity objectives at relevant levels",                "Define RTO/RPO targets per critical process. Align with BIA results."],
    [60,  "8.2",  "Business impact analysis (BIA)",                      "Operations",   "Identify critical functions and determine the impact of disruption over time",          "Quantify financial and operational impact at 1h, 4h, 24h, 7d intervals. Map dependencies."],
    [70,  "8.3",  "Business continuity strategy and options",            "Operations",   "Select and document strategies to protect prioritized activities within RTOs",          "Strategies: relocate, manual workaround, parallel capability, supplier switch. Document rationale."],
    [80,  "8.4",  "Business continuity plans",                           "Operations",   "Develop, implement, and maintain documented business continuity plans",                 "Plans must include: trigger criteria, roles, activation steps, communication, escalation."],
    [90,  "8.5",  "Exercise programme",                                  "Operations",   "Conduct exercises to validate the effectiveness of continuity plans",                   "Minimum annual tabletop exercise. Full simulation every 3 years. Document lessons learned."],
    [100, "9.1",  "Monitoring, measurement, analysis and evaluation",    "Performance",  "Evaluate the performance and effectiveness of the BCMS",                               "Track: time to activate, RTO achievement rate, test pass rate. Report to management."],
    [110, "9.3",  "Management review",                                   "Performance",  "Review the BCMS at planned intervals to ensure suitability, adequacy, and effectiveness","Annual management review. Cover: audit results, incidents, changing needs, improvement opportunities."],
    [120, "10.1", "Nonconformity and corrective action",                 "Improvement",  "Address nonconformities and take corrective actions to prevent recurrence",             "Root cause analysis for all major incidents and audit findings. Track CA completion."],
    [130, "10.2", "Continual improvement",                               "Improvement",  "Continually improve the suitability, adequacy, and effectiveness of the BCMS",          "Annual improvement plan. Incorporate lessons from exercises, incidents, and audits."],
  ] as const;

  for (const [sort, reqId, name2, domain, desc, guide] of reqs) {
    addReq(id, reqId, name2, domain, desc, guide, sort);
  }
  console.log(`  + Seeded ${reqs.length} requirements for ISO 22301`);
}

// ── PDPA Thailand — Expand existing framework ─────────────────────────────────
{
  // Find the PDPA framework (may be named "PDPA" or "PDPA Thailand")
  const pdpa = db.prepare(
    "SELECT id FROM gap_frameworks WHERE name LIKE '%PDPA%' ORDER BY id ASC LIMIT 1"
  ).get() as any;

  if (!pdpa) {
    console.log("  ⚠ PDPA framework not found — creating it");
    const newId = ensureFramework(
      "PDPA Thailand",
      "2019",
      "Personal Data Protection Act (PDPA) — Thailand's personal data protection law",
      "Privacy",
    );
    // Basic PDPA requirements
    const basic = [
      [10,  "Sec.19",  "Lawful basis for processing",        "Core Obligations",  "Process personal data only on a lawful basis (consent, contract, legal obligation, etc.)", "Map processing activities to legal basis. Document in Records of Processing Activities."],
      [20,  "Sec.20",  "Consent requirements",               "Core Obligations",  "Obtain valid consent that is freely given, specific, informed, and unambiguous",           "Consent must be separate from T&C. Use layered notices. Allow easy withdrawal."],
      [30,  "Sec.23",  "Data subject rights",                "Data Subject Rights","Respect rights: access, copy, deletion, restriction, portability, objection, correction",  "Implement DSR workflow. Target 30-day response. Log all requests."],
      [40,  "Sec.24",  "Processing without consent (exceptions)","Core Obligations","Process PD without consent only under specified lawful exceptions",                       "Document legal basis for each exception. Legal team review required."],
      [50,  "Sec.26",  "Sensitive personal data",            "Sensitive Data",    "Obtain explicit consent and implement extra safeguards for sensitive personal data",        "Sensitive data: health, race, politics, religion, biometrics, criminal records."],
    ] as const;
    for (const [sort, reqId, name2, domain, desc, guide] of basic) {
      addReq(newId, reqId, name2, domain, desc, guide, sort);
    }
  }

  const pdpaId = pdpa?.id ?? (db.prepare(
    "SELECT id FROM gap_frameworks WHERE name LIKE '%PDPA%' LIMIT 1"
  ).get() as any)?.id;

  if (pdpaId) {
    const expansions = [
      [200, "Sec.22-DM",   "Data minimization",                       "Core Obligations",   "Collect only personal data that is adequate, relevant, and limited to what is necessary",    "Conduct data inventory. Challenge each field: is it necessary? Remove or anonymize excess."],
      [210, "Sec.22-RP",   "Retention period policy",                 "Data Lifecycle",     "Define and enforce retention periods for all categories of personal data",                    "Retention schedule per data type. Implement automated deletion after retention period expires."],
      [220, "Sec.28",      "Cross-border data transfer",              "International Transfer","Transfer PD outside Thailand only with adequate protection or consent",                    "Assess destination country adequacy. Use BCRs or standard contractual clauses if inadequate."],
      [230, "Sec.41-42",   "DPO appointment",                         "Accountability",     "Appoint a Data Protection Officer where required under PDPA",                                "DPO required for: large-scale processing, sensitive data, public authority. Document appointment."],
      [240, "Sec.77",      "Privacy Impact Assessment (PIA)",         "Accountability",     "Conduct PIA for high-risk processing activities before commencement",                         "PIA required for: new systems, large-scale profiling, systematic monitoring, sensitive data."],
      [250, "Sec.37",      "Data breach notification",                "Incident Response",  "Notify PDPC within 72 hours of becoming aware of a personal data breach",                    "Establish breach response team. Severity assessment framework. PDPC notification template."],
      [260, "Sec.33",      "Records of processing activities (ROPA)", "Accountability",     "Maintain comprehensive records of all personal data processing activities",                   "ROPA must include: purpose, legal basis, data categories, retention, transfers, security."],
    ] as const;

    for (const [sort, reqId, name2, domain, desc, guide] of expansions) {
      addReq(pdpaId, reqId, name2, domain, desc, guide, sort);
    }
    console.log(`  + Added ${expansions.length} expansion requirements to PDPA (id=${pdpaId})`);
  }
}

db.close();
console.log("\n✅ Framework seed complete.");
