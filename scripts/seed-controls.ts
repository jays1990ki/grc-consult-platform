/**
 * Seed control_library with 11 ISO 27001:2022 Annex A controls (v0.6)
 * Safe to run multiple times — uses INSERT OR IGNORE.
 */
import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "app.db"));
db.pragma("journal_mode = WAL");

const now = new Date().toISOString();

const insert = db.prepare(`
  INSERT OR IGNORE INTO control_library
    (organization_id, framework, control_id, control_name, control_description, domain, related_threat, created_at)
  VALUES (1, 'ISO 27001:2022', ?, ?, ?, ?, ?, ?)
`);

const controls = [
  {
    control_id:   "A.5.15",
    control_name: "Access Control",
    control_description:
      "Establish and implement rules to control physical and logical access to information and other associated assets, based on business and information security requirements. Access rights must be defined, authorised and assigned on a need-to-know/need-to-use basis.",
    domain:          "Access Control",
    related_threat:  "Unauthorised Access,Privilege Abuse,Insider Threat,Data Breach,Credential Theft",
  },
  {
    control_id:   "A.5.16",
    control_name: "Identity Management",
    control_description:
      "Manage the full lifecycle of identities to enable unique identification of persons and systems accessing the organisation's information and other associated assets. Includes provisioning, review, and revocation of identities.",
    domain:          "Identity & Access Management",
    related_threat:  "Identity Theft,Account Compromise,Unauthorised Access,Impersonation",
  },
  {
    control_id:   "A.5.17",
    control_name: "Authentication Information",
    control_description:
      "Control the allocation and management of authentication information (passwords, tokens, certificates) following a formal management process. Ensure authentication information is kept confidential and changed regularly.",
    domain:          "Access Control",
    related_threat:  "Credential Theft,Brute Force Attack,Phishing,Password Spraying",
  },
  {
    control_id:   "A.8.7",
    control_name: "Protection Against Malware",
    control_description:
      "Implement protection against malware, supported by appropriate user awareness, with controls covering detection, prevention and recovery, combined with training and guidance.",
    domain:          "Threat & Vulnerability Protection",
    related_threat:  "Malware,Ransomware,Virus,Trojan,Spyware,Worm,Rootkit",
  },
  {
    control_id:   "A.8.8",
    control_name: "Management of Technical Vulnerabilities",
    control_description:
      "Obtain timely information about technical vulnerabilities of information systems in use, evaluate the organisation's exposure to such vulnerabilities and take appropriate measures to address the associated risk.",
    domain:          "Vulnerability Management",
    related_threat:  "Exploitation of Vulnerability,Zero-Day Attack,Unpatched System,Software Weakness",
  },
  {
    control_id:   "A.8.9",
    control_name: "Configuration Management",
    control_description:
      "Establish, document, implement, monitor and review configurations, including security configurations, for hardware, software, services and networks, to protect against unauthorised or incorrect change.",
    domain:          "System Security Baseline",
    related_threat:  "Misconfiguration,Insecure Default,Configuration Drift,Unauthorised Change",
  },
  {
    control_id:   "A.8.13",
    control_name: "Information Backup",
    control_description:
      "Maintain and regularly test backup copies of information, software and systems to provide against loss of data. Backups should be stored securely and tested for recoverability in accordance with a documented backup policy.",
    domain:          "Business Continuity & Recovery",
    related_threat:  "Ransomware,Data Loss,System Failure,Accidental Deletion,Hardware Failure",
  },
  {
    control_id:   "A.8.15",
    control_name: "Logging",
    control_description:
      "Produce, store, protect and analyse logs that record user activities, exceptions, faults and information security events to detect and investigate incidents. Logs should be protected against tampering and unauthorised access.",
    domain:          "Security Monitoring & Audit",
    related_threat:  "Unauthorised Activity,Insider Threat,Evidence Tampering,Undetected Breach",
  },
  {
    control_id:   "A.8.16",
    control_name: "Monitoring Activities",
    control_description:
      "Monitor networks, systems and applications for anomalous behaviour and take appropriate action to evaluate potential information security incidents. Continuous monitoring enables early detection of threats.",
    domain:          "Security Monitoring & Audit",
    related_threat:  "Network Intrusion,Anomalous Behaviour,Denial of Service,Lateral Movement",
  },
  {
    control_id:   "A.8.20",
    control_name: "Network Security",
    control_description:
      "Secure networks and network devices to protect information in systems and applications from threats exploiting the network. Implement segmentation, firewall rules and intrusion detection/prevention systems.",
    domain:          "Network Protection",
    related_threat:  "Network Intrusion,Man-in-the-Middle,Denial of Service,Eavesdropping,Unauthorised Network Access",
  },
  {
    control_id:   "A.8.24",
    control_name: "Use of Cryptography",
    control_description:
      "Define and implement rules for effective use of cryptography, including management of cryptographic keys, to protect the confidentiality, authenticity or integrity of information at rest and in transit.",
    domain:          "Data Protection & Encryption",
    related_threat:  "Data Interception,Eavesdropping,Data Breach,Weak Encryption,Key Exposure",
  },
] as const;

db.transaction(() => {
  for (const c of controls) {
    insert.run(c.control_id, c.control_name, c.control_description, c.domain, c.related_threat, now);
  }
})();

console.log(`Control library seeded: ${controls.length} ISO 27001:2022 Annex A controls (org_id=1).`);
db.close();
