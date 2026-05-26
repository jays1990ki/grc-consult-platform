export interface ISOControl {
  id: string;
  name: string;
  category: "A.5" | "A.6" | "A.7" | "A.8";
  categoryName: string;
  description: string;
  assetTypes: string[];
}

export const ISO_CONTROLS: ISOControl[] = [
  // ─── A.5 Organizational ───────────────────────────────────────
  { id: "A.5.1",  category: "A.5", categoryName: "Organizational", name: "Policies for information security", description: "Define, approve and publish information security policies aligned with business requirements.", assetTypes: ["Hardware","Software","Data","People"] },
  { id: "A.5.2",  category: "A.5", categoryName: "Organizational", name: "Information security roles and responsibilities", description: "Assign and communicate responsibilities for information security across the organisation.", assetTypes: ["Hardware","Software","Data","People"] },
  { id: "A.5.5",  category: "A.5", categoryName: "Organizational", name: "Contact with authorities", description: "Maintain appropriate contacts with relevant authorities (law enforcement, regulators).", assetTypes: ["Data","People"] },
  { id: "A.5.7",  category: "A.5", categoryName: "Organizational", name: "Threat intelligence", description: "Collect and analyse information about information security threats to produce threat intelligence.", assetTypes: ["Hardware","Software","Data"] },
  { id: "A.5.9",  category: "A.5", categoryName: "Organizational", name: "Inventory of information and other associated assets", description: "Identify, document and maintain an inventory of information and associated assets.", assetTypes: ["Hardware","Software","Data"] },
  { id: "A.5.10", category: "A.5", categoryName: "Organizational", name: "Acceptable use of information and other associated assets", description: "Identify, document and implement rules for acceptable use and handling of information.", assetTypes: ["Software","Data","People"] },
  { id: "A.5.12", category: "A.5", categoryName: "Organizational", name: "Classification of information", description: "Classify information based on confidentiality, integrity, availability and relevant stakeholder requirements.", assetTypes: ["Data"] },
  { id: "A.5.13", category: "A.5", categoryName: "Organizational", name: "Labelling of information", description: "Develop and implement procedures for labelling information according to the classification scheme.", assetTypes: ["Data"] },
  { id: "A.5.14", category: "A.5", categoryName: "Organizational", name: "Information transfer", description: "Establish rules, procedures and agreements for transferring information inside and outside the organisation.", assetTypes: ["Data","People"] },
  { id: "A.5.15", category: "A.5", categoryName: "Organizational", name: "Access control", description: "Establish and implement rules to control physical and logical access to information and assets.", assetTypes: ["Hardware","Software","Data","People"] },
  { id: "A.5.16", category: "A.5", categoryName: "Organizational", name: "Identity management", description: "Manage the full lifecycle of identities to enable unique identification of persons and systems.", assetTypes: ["Software","Data","People"] },
  { id: "A.5.17", category: "A.5", categoryName: "Organizational", name: "Authentication information", description: "Control allocation and management of authentication information following a formal management process.", assetTypes: ["Software","Data","People"] },
  { id: "A.5.18", category: "A.5", categoryName: "Organizational", name: "Access rights", description: "Provision, review, modify and remove access rights to information and associated assets.", assetTypes: ["Software","Data","People"] },
  { id: "A.5.19", category: "A.5", categoryName: "Organizational", name: "Information security in supplier relationships", description: "Define and implement processes to manage information security risks in supplier relationships.", assetTypes: ["Software","Data"] },
  { id: "A.5.23", category: "A.5", categoryName: "Organizational", name: "Information security for use of cloud services", description: "Specify and manage information security requirements for acquisition and use of cloud services.", assetTypes: ["Software","Data"] },
  { id: "A.5.24", category: "A.5", categoryName: "Organizational", name: "Information security incident management planning", description: "Plan and prepare for managing information security incidents by defining processes and roles.", assetTypes: ["Hardware","Software","Data","People"] },
  { id: "A.5.26", category: "A.5", categoryName: "Organizational", name: "Response to information security incidents", description: "Respond to information security incidents in accordance with documented procedures.", assetTypes: ["Hardware","Software","Data","People"] },
  { id: "A.5.29", category: "A.5", categoryName: "Organizational", name: "Information security during disruption", description: "Plan how to maintain information security at an appropriate level during disruption.", assetTypes: ["Hardware","Software","Data"] },
  { id: "A.5.30", category: "A.5", categoryName: "Organizational", name: "ICT readiness for business continuity", description: "Plan, implement, maintain and test ICT readiness based on business continuity objectives.", assetTypes: ["Hardware","Software"] },
  { id: "A.5.33", category: "A.5", categoryName: "Organizational", name: "Protection of records", description: "Protect records from loss, destruction, falsification, unauthorised access and release.", assetTypes: ["Data"] },
  { id: "A.5.34", category: "A.5", categoryName: "Organizational", name: "Privacy and protection of PII", description: "Identify and meet requirements for privacy and protection of personally identifiable information.", assetTypes: ["Data","People"] },

  // ─── A.6 People ───────────────────────────────────────────────
  { id: "A.6.1", category: "A.6", categoryName: "People", name: "Screening", description: "Carry out background verification checks on all candidates before employment.", assetTypes: ["People"] },
  { id: "A.6.2", category: "A.6", categoryName: "People", name: "Terms and conditions of employment", description: "Contractually set out employees' and contractors' responsibilities for information security.", assetTypes: ["People"] },
  { id: "A.6.3", category: "A.6", categoryName: "People", name: "Information security awareness, education and training", description: "Provide awareness, education and training in information security policies and procedures.", assetTypes: ["People","Data"] },
  { id: "A.6.4", category: "A.6", categoryName: "People", name: "Disciplinary process", description: "Formalise and communicate a disciplinary process for information security policy violations.", assetTypes: ["People"] },
  { id: "A.6.5", category: "A.6", categoryName: "People", name: "Responsibilities after termination or change of employment", description: "Define and enforce information security responsibilities valid after termination or change of role.", assetTypes: ["People","Data"] },
  { id: "A.6.6", category: "A.6", categoryName: "People", name: "Confidentiality or non-disclosure agreements", description: "Identify, document and review requirements for NDAs reflecting the organisation's information needs.", assetTypes: ["People","Data"] },
  { id: "A.6.7", category: "A.6", categoryName: "People", name: "Remote working", description: "Implement security measures when working remotely to protect information accessed or processed outside.", assetTypes: ["People","Software","Data"] },
  { id: "A.6.8", category: "A.6", categoryName: "People", name: "Information security event reporting", description: "Provide a mechanism for personnel to report observed or suspected information security events.", assetTypes: ["People","Hardware","Software","Data"] },

  // ─── A.7 Physical ─────────────────────────────────────────────
  { id: "A.7.1",  category: "A.7", categoryName: "Physical", name: "Physical security perimeter", description: "Define and implement security perimeters to protect areas containing information and assets.", assetTypes: ["Hardware","Data"] },
  { id: "A.7.2",  category: "A.7", categoryName: "Physical", name: "Physical entry controls", description: "Secure and control entry points to protect against unauthorised physical access.", assetTypes: ["Hardware","Data"] },
  { id: "A.7.3",  category: "A.7", categoryName: "Physical", name: "Securing offices, rooms and facilities", description: "Design and apply physical security to offices, rooms and facilities.", assetTypes: ["Hardware","Data","People"] },
  { id: "A.7.4",  category: "A.7", categoryName: "Physical", name: "Physical security monitoring", description: "Continuously monitor premises for unauthorised physical access.", assetTypes: ["Hardware","Data"] },
  { id: "A.7.5",  category: "A.7", categoryName: "Physical", name: "Protecting against physical and environmental threats", description: "Design and implement protection against physical and environmental threats.", assetTypes: ["Hardware"] },
  { id: "A.7.6",  category: "A.7", categoryName: "Physical", name: "Working in secure areas", description: "Design and apply security measures for working in secure areas.", assetTypes: ["Hardware","Data","People"] },
  { id: "A.7.7",  category: "A.7", categoryName: "Physical", name: "Clear desk and clear screen", description: "Define and enforce rules for clear desk of papers and removable storage, and clear screen.", assetTypes: ["Data","People"] },
  { id: "A.7.8",  category: "A.7", categoryName: "Physical", name: "Equipment siting and protection", description: "Site and protect equipment to reduce risks from physical and environmental threats.", assetTypes: ["Hardware"] },
  { id: "A.7.9",  category: "A.7", categoryName: "Physical", name: "Security of assets off-premises", description: "Protect off-site assets taking into account the different risks of working outside the organisation.", assetTypes: ["Hardware","Data"] },
  { id: "A.7.10", category: "A.7", categoryName: "Physical", name: "Storage media", description: "Manage storage media through their lifecycle from acquisition, use, transportation and disposal.", assetTypes: ["Hardware","Data"] },
  { id: "A.7.11", category: "A.7", categoryName: "Physical", name: "Supporting utilities", description: "Protect information processing facilities from power failures and other disruptions from utilities.", assetTypes: ["Hardware"] },
  { id: "A.7.12", category: "A.7", categoryName: "Physical", name: "Cabling security", description: "Protect cables carrying power, data or telecommunications services from interception or damage.", assetTypes: ["Hardware"] },
  { id: "A.7.13", category: "A.7", categoryName: "Physical", name: "Equipment maintenance", description: "Maintain equipment correctly to ensure availability, integrity and confidentiality of information.", assetTypes: ["Hardware"] },
  { id: "A.7.14", category: "A.7", categoryName: "Physical", name: "Secure disposal or re-use of equipment", description: "Verify that all data has been deleted or overwritten securely before disposal or re-use.", assetTypes: ["Hardware","Data"] },

  // ─── A.8 Technological ────────────────────────────────────────
  { id: "A.8.1",  category: "A.8", categoryName: "Technological", name: "User endpoint devices", description: "Protect information stored on, processed by or accessed through user endpoint devices.", assetTypes: ["Hardware","Software"] },
  { id: "A.8.2",  category: "A.8", categoryName: "Technological", name: "Privileged access rights", description: "Restrict and manage privileged access rights to prevent misuse or compromise.", assetTypes: ["Software","Data","People"] },
  { id: "A.8.3",  category: "A.8", categoryName: "Technological", name: "Information access restriction", description: "Restrict access to information and application system functions according to the access control policy.", assetTypes: ["Software","Data"] },
  { id: "A.8.5",  category: "A.8", categoryName: "Technological", name: "Secure authentication", description: "Implement secure authentication technologies and procedures based on information access restrictions.", assetTypes: ["Software","Data","People"] },
  { id: "A.8.7",  category: "A.8", categoryName: "Technological", name: "Protection against malware", description: "Implement protection against malware, supported by appropriate user awareness.", assetTypes: ["Hardware","Software"] },
  { id: "A.8.8",  category: "A.8", categoryName: "Technological", name: "Management of technical vulnerabilities", description: "Obtain information about technical vulnerabilities, evaluate exposure and take appropriate measures.", assetTypes: ["Hardware","Software"] },
  { id: "A.8.9",  category: "A.8", categoryName: "Technological", name: "Configuration management", description: "Establish, document, implement, monitor and review configurations to ensure security.", assetTypes: ["Hardware","Software"] },
  { id: "A.8.12", category: "A.8", categoryName: "Technological", name: "Data leakage prevention", description: "Apply DLP measures to systems, networks and other devices that process or transmit sensitive data.", assetTypes: ["Software","Data"] },
  { id: "A.8.13", category: "A.8", categoryName: "Technological", name: "Information backup", description: "Maintain and regularly test backup copies of information, software and systems.", assetTypes: ["Hardware","Software","Data"] },
  { id: "A.8.15", category: "A.8", categoryName: "Technological", name: "Logging", description: "Produce, store, protect and analyse logs that record activities, exceptions and events.", assetTypes: ["Hardware","Software","Data"] },
  { id: "A.8.16", category: "A.8", categoryName: "Technological", name: "Monitoring activities", description: "Monitor networks, systems and applications for anomalous behaviour and take appropriate action.", assetTypes: ["Hardware","Software","Data"] },
  { id: "A.8.20", category: "A.8", categoryName: "Technological", name: "Networks security", description: "Secure networks and network devices to protect information in systems and applications.", assetTypes: ["Hardware","Software"] },
  { id: "A.8.24", category: "A.8", categoryName: "Technological", name: "Use of cryptography", description: "Define and implement rules for effective use of cryptography including key management.", assetTypes: ["Software","Data"] },
  { id: "A.8.25", category: "A.8", categoryName: "Technological", name: "Secure development life cycle", description: "Establish and apply rules for secure development of software and systems.", assetTypes: ["Software"] },
  { id: "A.8.28", category: "A.8", categoryName: "Technological", name: "Secure coding", description: "Apply secure coding principles to software development to reduce vulnerabilities.", assetTypes: ["Software"] },
  { id: "A.8.29", category: "A.8", categoryName: "Technological", name: "Security testing in development and acceptance", description: "Define and implement security testing processes into the development lifecycle.", assetTypes: ["Software"] },
  { id: "A.8.32", category: "A.8", categoryName: "Technological", name: "Change management", description: "Subject changes to information processing facilities and systems to formal change management procedures.", assetTypes: ["Hardware","Software"] },
];

export const CATEGORY_NAMES: Record<string, string> = {
  "A.5": "Organizational Controls",
  "A.6": "People Controls",
  "A.7": "Physical Controls",
  "A.8": "Technological Controls",
};

export function getControlsForAssetType(assetType: string): ISOControl[] {
  return ISO_CONTROLS.filter(c => c.assetTypes.includes(assetType));
}

export function countByCategory() {
  const counts: Record<string, number> = {};
  for (const c of ISO_CONTROLS) {
    counts[c.category] = (counts[c.category] ?? 0) + 1;
  }
  return counts;
}
