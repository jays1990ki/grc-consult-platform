/**
 * v0.8 — Seed GAP frameworks and requirements
 *  • ISO 27001:2022 — 20 requirements (A.5×8, A.6×3, A.7×4, A.8×5)
 *  • PDPA (Thailand) — 8 requirements
 */
import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "app.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Helper ────────────────────────────────────────────────────────────────
const insFramework = db.prepare(`
  INSERT OR IGNORE INTO gap_frameworks (name, version, description)
  VALUES (?, ?, ?)
`);
const insReq = db.prepare(`
  INSERT OR IGNORE INTO gap_requirements
    (framework_id, requirement_id, requirement_name, domain, description, guidance, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// ── ISO 27001:2022 ────────────────────────────────────────────────────────
insFramework.run(
  "ISO 27001:2022",
  "2022",
  "International standard for information security management systems (ISMS). Annex A covers 93 controls across 4 domains."
);
const isoId = (db.prepare("SELECT id FROM gap_frameworks WHERE name='ISO 27001:2022'").get() as any).id;

const isoReqs: [string, string, string, string, string, number][] = [
  // ── A.5 Organizational ──────────────────────────────────────────
  [
    "A.5.1", "Policies for Information Security", "Organizational",
    "Policies for information security and specific topic policies shall be defined, approved by management, published, communicated to personnel and relevant external parties, and reviewed at planned intervals.",
    "Ensure an approved information security policy exists, is communicated to all staff, and reviewed at least annually. Document review cycles and approval evidence.",
    10,
  ],
  [
    "A.5.2", "Information Security Roles and Responsibilities", "Organizational",
    "Information security roles and responsibilities shall be defined and allocated according to the organisation's needs.",
    "Define an RACI matrix for information security. Assign a CISO or IS Officer. Document role descriptions and ensure accountability is clear.",
    20,
  ],
  [
    "A.5.4", "Management Responsibilities", "Organizational",
    "Management shall require all personnel to apply information security in accordance with the established information security policy and topic-specific policies.",
    "Obtain sign-off from senior management on security policies. Include IS responsibilities in performance objectives. Provide management review minutes as evidence.",
    30,
  ],
  [
    "A.5.9", "Inventory of Information and Other Associated Assets", "Organizational",
    "An inventory of information and other associated assets, including owners, shall be developed and maintained.",
    "Maintain an asset register covering hardware, software, data and people. Update at least annually and after significant changes. Document asset owners.",
    40,
  ],
  [
    "A.5.12", "Classification of Information", "Organizational",
    "Information shall be classified according to the information security needs of the organisation based on confidentiality, integrity and availability requirements.",
    "Define a classification scheme (e.g., Public / Internal / Confidential / Restricted). Apply labels to documents and data stores. Train staff on classification.",
    50,
  ],
  [
    "A.5.15", "Access Control", "Organizational",
    "Rules to control physical and logical access to information and other associated assets shall be established and implemented based on business and information security requirements.",
    "Implement access control policy with least-privilege principle. Use role-based access control (RBAC). Review access rights quarterly. Document approval workflow.",
    60,
  ],
  [
    "A.5.24", "Information Security Incident Management Planning", "Organizational",
    "The organisation shall plan and prepare for managing information security incidents by defining, establishing and communicating information security incident management processes and procedures.",
    "Create an Incident Response Plan (IRP). Define severity levels, escalation paths, and response SLAs. Conduct tabletop exercises at least annually.",
    70,
  ],
  [
    "A.5.33", "Protection of Records", "Organizational",
    "Records shall be protected from loss, destruction, falsification, unauthorised access and unauthorised release.",
    "Define records retention schedules. Implement access controls on record repositories. Test backup and restore procedures. Document disposal procedures.",
    80,
  ],

  // ── A.6 People ──────────────────────────────────────────────────
  [
    "A.6.1", "Screening", "People",
    "Background verification checks on all candidates for employment shall be carried out prior to joining the organisation and on an ongoing basis considering applicable laws, regulations and ethics.",
    "Conduct background checks (criminal, employment history, qualifications) before hiring. Document screening process and outcomes. Extend to contractors and third parties.",
    100,
  ],
  [
    "A.6.3", "Information Security Awareness, Education and Training", "People",
    "Personnel and relevant external parties shall receive appropriate information security awareness, education and training, including updates of organisational policies and procedures, as relevant.",
    "Deliver annual security awareness training to all staff. Track completion rates. Include phishing simulation. Update training when policies change. Keep attendance records.",
    110,
  ],
  [
    "A.6.8", "Information Security Event Reporting", "People",
    "The organisation shall provide a mechanism for personnel to report observed or suspected information security events through appropriate channels in a timely manner.",
    "Provide a dedicated reporting channel (email, ticketing system, hotline). Communicate the channel to all staff. Ensure reports are acknowledged within 24 hours. Track all reports.",
    120,
  ],

  // ── A.7 Physical ────────────────────────────────────────────────
  [
    "A.7.1", "Physical Security Perimeter", "Physical",
    "Security perimeters shall be defined and used to protect areas that contain information and other associated assets.",
    "Define secure zones (server rooms, data centers, offices). Use barriers, card access, CCTV. Document zone definitions. Conduct physical security reviews annually.",
    130,
  ],
  [
    "A.7.2", "Physical Entry Controls", "Physical",
    "Secure areas shall be protected by appropriate entry controls and access points to ensure that only authorised personnel are allowed access.",
    "Implement card access or biometric systems for secure areas. Maintain visitor logs. Enforce escort policy for visitors. Review access rights when staff leave.",
    140,
  ],
  [
    "A.7.4", "Physical Security Monitoring", "Physical",
    "Premises shall be continuously monitored for unauthorised physical access.",
    "Deploy CCTV covering all entry/exit points and server rooms. Ensure 24/7 recording with 90-day retention. Review footage after incidents. Document monitoring procedures.",
    150,
  ],
  [
    "A.7.10", "Storage Media", "Physical",
    "Storage media shall be managed through their lifecycle of acquisition, use, transportation and disposal in accordance with the organisation's classification scheme and handling requirements.",
    "Inventory all removable media. Encrypt sensitive media. Implement secure disposal process (degaussing/shredding). Require authorisation for media removal. Track media chain of custody.",
    160,
  ],

  // ── A.8 Technological ────────────────────────────────────────────
  [
    "A.8.1", "User Endpoint Devices", "Technological",
    "Information stored on, processed by or accessible via user endpoint devices shall be protected.",
    "Enforce endpoint security baseline (antivirus, encryption, patch management). Apply MDM policy for mobile devices. Implement screen lock and full-disk encryption. Document standards.",
    170,
  ],
  [
    "A.8.7", "Protection Against Malware", "Technological",
    "Protection against malware shall be implemented and supported by appropriate user awareness.",
    "Deploy EDR/antivirus on all endpoints. Enable real-time scanning. Update signatures automatically. Block execution of unauthorised software. Conduct user awareness on malware.",
    180,
  ],
  [
    "A.8.8", "Management of Technical Vulnerabilities", "Technological",
    "Information about technical vulnerabilities of information systems in use shall be obtained in a timely manner, the organisation's exposure to such vulnerabilities evaluated and appropriate measures taken.",
    "Run vulnerability scans monthly. Track CVEs for all systems. Define patching SLA (Critical: 48h, High: 7d, Medium: 30d). Use a vulnerability management platform. Document remediation.",
    190,
  ],
  [
    "A.8.13", "Information Backup", "Technological",
    "Backup copies of information, software and systems shall be maintained and regularly tested in accordance with an agreed topic-specific policy on backup.",
    "Implement 3-2-1 backup strategy. Test restore procedures quarterly. Store encrypted backups offsite. Define RPO/RTO targets. Document backup policy and test results.",
    200,
  ],
  [
    "A.8.15", "Logging", "Technological",
    "Logs that record activities, exceptions, faults and other relevant events shall be produced, stored, protected and analysed.",
    "Enable audit logging on all critical systems (OS, applications, network devices). Centralise logs to SIEM. Define log retention (minimum 12 months). Protect logs from tampering. Review regularly.",
    210,
  ],
];

// ── PDPA (Thailand) ────────────────────────────────────────────────────────
insFramework.run(
  "PDPA Thailand",
  "2022",
  "Thailand Personal Data Protection Act B.E. 2562 (2019), effective June 2022. Governs the collection, use and disclosure of personal data."
);
const pdpaId = (db.prepare("SELECT id FROM gap_frameworks WHERE name='PDPA Thailand'").get() as any).id;

const pdpaReqs: [string, string, string, string, string, number][] = [
  [
    "PDPA-19", "Lawful Basis for Processing", "Data Governance",
    "Personal data controllers must have a lawful basis (consent, contract, vital interest, public task, legitimate interest, legal obligation) for processing personal data (Section 19).",
    "Document the lawful basis for each processing activity. Maintain a Record of Processing Activities (ROPA). Review lawful basis whenever processing purpose changes.",
    10,
  ],
  [
    "PDPA-20", "Consent Management", "Data Governance",
    "Consent must be freely given, specific, informed, unambiguous and distinguishable. Separate from other terms. Easy to withdraw (Section 19-20).",
    "Implement consent management platform or process. Store consent records with timestamp and version. Provide clear opt-out mechanism. Never bundle consent with service terms.",
    20,
  ],
  [
    "PDPA-22", "Privacy Notice / Policy", "Data Governance",
    "Data subjects must be informed of: data controller identity, purpose, lawful basis, retention period, recipients, rights and contact details at time of collection (Section 23).",
    "Publish a Privacy Notice/Policy that is clear and accessible. Update when processing changes. Provide notice in Thai for Thai-language audiences. Keep version history.",
    30,
  ],
  [
    "PDPA-23", "Data Subject Rights", "Data Subject Rights",
    "Data subjects have rights to: access, portability, rectification, erasure, restriction, objection, and rights relating to automated decision-making (Sections 30-37).",
    "Implement procedures to receive and respond to data subject requests within 30 days. Log all requests and responses. Train staff on handling requests. Publish contact information.",
    40,
  ],
  [
    "PDPA-37a", "Data Retention and Disposal", "Data Governance",
    "Personal data must not be retained longer than necessary for its purpose. Implement retention schedules and secure disposal procedures.",
    "Define data retention schedules per data category. Implement automatic deletion or anonymisation. Document disposal procedures. Audit retention compliance annually.",
    50,
  ],
  [
    "PDPA-40", "Data Security Measures", "Technical Security",
    "Data controllers and processors must implement appropriate technical and organisational security measures to protect personal data from unauthorised access, loss, destruction or alteration (Section 40).",
    "Implement encryption for personal data at rest and in transit. Apply access controls and logging. Conduct security testing annually. Document security measures implemented.",
    60,
  ],
  [
    "PDPA-41", "Data Breach Notification", "Incident Management",
    "Data controllers must notify the PDPC within 72 hours of becoming aware of a personal data breach. Notify affected data subjects without undue delay when risk is high (Section 37d).",
    "Establish breach detection and response procedures. Define 72-hour notification workflow to PDPC. Prepare breach notification templates. Conduct breach response drills annually.",
    70,
  ],
  [
    "PDPA-28", "Data Processing Agreement", "Third Party",
    "When engaging data processors, a written Data Processing Agreement (DPA) must be in place specifying the processor's obligations and restrictions (Section 28).",
    "Review all third-party vendor contracts. Implement DPA templates. Audit key data processors annually. Maintain a processor register. Include PDPA obligations in procurement.",
    80,
  ],
];

db.transaction(() => {
  for (const r of isoReqs) {
    insReq.run(isoId, ...r);
  }
  for (const r of pdpaReqs) {
    insReq.run(pdpaId, ...r);
  }
})();

const isoCount  = (db.prepare("SELECT COUNT(*) as c FROM gap_requirements WHERE framework_id=?").get(isoId) as any).c;
const pdpaCount = (db.prepare("SELECT COUNT(*) as c FROM gap_requirements WHERE framework_id=?").get(pdpaId) as any).c;
console.log(`GAP frameworks seeded:`);
console.log(`  ISO 27001:2022 — ${isoCount} requirements`);
console.log(`  PDPA Thailand  — ${pdpaCount} requirements`);
db.close();
