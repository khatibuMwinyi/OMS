export type LegacySelectionRecord = {
  type: string;
  category: string;
  code: string;
  description: string;
};

export const legacyReceiptRecords: LegacySelectionRecord[] = [
  { type: "Revenue", category: "Oweru Products", code: "RC-101", description: "Residential Plot Sales" },
  { type: "Revenue", category: "Oweru Products", code: "RC-102", description: "Ready House / Apartment Sales" },
  { type: "Revenue", category: "Oweru Products", code: "RC-103", description: "Off-Plan Project Payments" },
  { type: "Revenue", category: "Oweru Products", code: "RC-104", description: "Commercial Property Sales" },
  { type: "Revenue", category: "Oweru Products", code: "RC-105", description: "Beach Plot Sales" },
  { type: "Revenue", category: "Oweru Products", code: "RC-106", description: "Industrial Land Sales" },
  { type: "Revenue", category: "Oweru Products", code: "RC-107", description: "Investment Property Sales" },
  { type: "Revenue", category: "Oweru Services", code: "RC-201", description: "Sales & Marketing Commission" },
  { type: "Revenue", category: "Oweru Services", code: "RC-202", description: "Title Deed Processing Fees" },
  { type: "Revenue", category: "Oweru Services", code: "RC-203", description: "Land Transfer Service Fees" },
  { type: "Revenue", category: "Oweru Services", code: "RC-204", description: "Plot Verification Fees" },
  { type: "Revenue", category: "Oweru Services", code: "RC-205", description: "Due Diligence Service Fees" },
  { type: "Revenue", category: "Oweru Services", code: "RC-206", description: "Building Permit Facilitation Fees" },
  { type: "Revenue", category: "Oweru Services", code: "RC-207", description: "Surveying / Beacon Re-establishment" },
  { type: "Revenue", category: "Oweru Services", code: "RC-208", description: "Property Management Fees" },
  { type: "Revenue", category: "Build With Oweru", code: "RC-301", description: "Mjengo Challenge Revenue" },
  { type: "Revenue", category: "Build With Oweru", code: "RC-302", description: "Building Materials Sales Margin" },
  { type: "Revenue", category: "Build With Oweru", code: "RC-303", description: "Custom House Construction Payments" },
  { type: "Revenue", category: "Build With Oweru", code: "RC-304", description: "Turnkey Construction Payments" },
  { type: "Revenue", category: "Oweru Investment Gateway", code: "RC-401", description: "Local Investor Facilitation Fees" },
  { type: "Revenue", category: "Oweru Investment Gateway", code: "RC-402", description: "FDI Investor Facilitation Fees" },
  { type: "Revenue", category: "Oweru Investment Gateway", code: "RC-403", description: "Partnership / Joint Venture Income" },
  { type: "Revenue", category: "Oweru Investment Gateway", code: "RC-404", description: "Investor Advisory & Documentation Fees" },
  { type: "Revenue", category: "Oweru Tech Systems", code: "RC-501", description: "Building Permit System Subscription" },
  { type: "Revenue", category: "Oweru Tech Systems", code: "RC-502", description: "Plot Verification System Revenue" },
  { type: "Revenue", category: "Oweru Tech Systems", code: "RC-503", description: "Marketplace Commission Revenue" },
  { type: "Revenue", category: "Oweru Tech Systems", code: "RC-504", description: "Property Management Software Subscription" },
  { type: "Revenue", category: "Oweru Tech Systems", code: "RC-505", description: "Freelance Marketplace Commission" },
];

export const legacyPettyCashRecords: LegacySelectionRecord[] = [
  { type: "Expense", category: "Petty Cash - Office Operations", code: "PC-101", description: "Office Supplies (pens, paper, files, envelopes)" },
  { type: "Expense", category: "Petty Cash - Office Operations", code: "PC-102", description: "Printing & Photocopying" },
  { type: "Expense", category: "Petty Cash - Office Operations", code: "PC-103", description: "Airtime & Internet Bundles" },
  { type: "Expense", category: "Petty Cash - Office Operations", code: "PC-104", description: "Office Tea, Coffee, Sugar, Drinking Water (small purchases)" },
  { type: "Expense", category: "Petty Cash - Office Operations", code: "PC-105", description: "Office Cleaning Supplies" },
  { type: "Expense", category: "Petty Cash - Office Operations", code: "PC-106", description: "Minor Office Repairs (<100,000 TZS)" },
  { type: "Expense", category: "Petty Cash - Office Operations", code: "PC-107", description: "Office Casual Labour (1-day helpers)" },
  { type: "Expense", category: "Petty Cash - Office Operations", code: "PC-108", description: "Office Snacks for Meetings" },
  { type: "Expense", category: "Petty Cash - Office Operations", code: "PC-109", description: "Staff Local Transport (bodaboda, daladala)" },
  { type: "Expense", category: "Petty Cash - Staff & HR Support", code: "PC-201", description: "Staff Meals / Lunch Allowance" },
  { type: "Expense", category: "Petty Cash - Staff & HR Support", code: "PC-202", description: "Staff Emergency Support (minor)" },
  { type: "Expense", category: "Petty Cash - Staff & HR Support", code: "PC-203", description: "Per Diem Top-ups (<100,000 TZS)" },
  { type: "Expense", category: "Petty Cash - Staff & HR Support", code: "PC-204", description: "Small Staff Uniforms / PPE" },
  { type: "Expense", category: "Petty Cash - Staff & HR Support", code: "PC-205", description: "Site Transport (bodaboda to field)" },
  { type: "Expense", category: "Petty Cash - Field & Project Ops", code: "PC-301", description: "Fuel Top-up (<100,000 TZS)" },
  { type: "Expense", category: "Petty Cash - Field & Project Ops", code: "PC-302", description: "Site Snacks / Water for Team" },
  { type: "Expense", category: "Petty Cash - Field & Project Ops", code: "PC-303", description: "Small Site Tools (rope, markers, nails)" },
  { type: "Expense", category: "Petty Cash - Field & Project Ops", code: "PC-304", description: "Clearing Tools (pangas, hoes, slashers)" },
  { type: "Expense", category: "Petty Cash - Field & Project Ops", code: "PC-305", description: "Field Communication Airtime" },
  { type: "Expense", category: "Petty Cash - Field & Project Ops", code: "PC-306", description: "Minor Site Repairs" },
  { type: "Expense", category: "Petty Cash - Field & Project Ops", code: "PC-308", description: "Pesticides / Weed Control" },
  { type: "Expense", category: "Petty Cash - Field & Project Ops", code: "PC-309", description: "Local Transport for Client Visits" },
  { type: "Expense", category: "Petty Cash - Sales & Marketing", code: "PC-401", description: "Refreshments for Clients (water, soda)" },
  { type: "Expense", category: "Petty Cash - Sales & Marketing", code: "PC-402", description: "Minor Marketing Materials (flyers, ink)" },
  { type: "Expense", category: "Petty Cash - Sales & Marketing", code: "PC-403", description: "Phone Calls / Follow-up Airtime" },
  { type: "Expense", category: "Petty Cash - Sales & Marketing", code: "PC-404", description: "Local Area Branding (stickers <100k)" },
  { type: "Expense", category: "Petty Cash - Sales & Marketing", code: "PC-405", description: "Transport to Government Offices (TRA, BRELA)" },
  { type: "Expense", category: "Petty Cash - Compliance & Admin", code: "PC-501", description: "Photocopying for Government Forms" },
  { type: "Expense", category: "Petty Cash - Compliance & Admin", code: "PC-502", description: "EFD Receipt Printing (<100,000 TZS)" },
  { type: "Expense", category: "Petty Cash - Compliance & Admin", code: "PC-503", description: "Small Compliance Fees / Stamps" },
  { type: "Expense", category: "Petty Cash - Compliance & Admin", code: "PC-504", description: "Stamp Pad / Rubber Ink Purchases" },
  { type: "Expense", category: "Petty Cash - Compliance & Admin", code: "PC-505", description: "Emergency Replacement of Small Broken Items" },
  { type: "Expense", category: "Petty Cash - Emergency & Misc", code: "PC-901", description: "Small Office Gifts / Appreciation Tokens" },
  { type: "Expense", category: "Petty Cash - Emergency & Misc", code: "PC-902", description: "Miscellaneous <100,000 TZS" },
];

export const legacyVoucherRecords: LegacySelectionRecord[] = [
  { type: "Expense", category: "Admin & Office", code: "EC-001", description: "Office Rent" },
  { type: "Expense", category: "Admin & Office", code: "EC-002", description: "Utilities (Electricity, Water, Internet)" },
  { type: "Expense", category: "Admin & Office", code: "EC-003", description: "Office Supplies / Stationery" },
  { type: "Expense", category: "Admin & Office", code: "EC-004", description: "Office Equipment Purchase" },
  { type: "Expense", category: "Admin & Office", code: "EC-005", description: "Equipment Maintenance & Repairs" },
  { type: "Expense", category: "Admin & Office", code: "EC-006", description: "Communication Costs" },
  { type: "Expense", category: "Admin & Office", code: "EC-007", description: "Office Furniture" },
  { type: "Expense", category: "Admin & Office", code: "EC-008", description: "Decoration, Office Branding & Tools" },
  { type: "Expense", category: "Admin & Office", code: "EC-009", description: "Utensils (Kitchen/Office)" },
  { type: "Expense", category: "Finance & Banking", code: "EC-010", description: "Bank Charges & Transaction Fees" },
  { type: "Expense", category: "Finance & Banking", code: "EC-011", description: "Loan Interest Expense" },
  { type: "Expense", category: "Finance & Banking", code: "EC-012", description: "Discounts Allowed" },
  { type: "Expense", category: "Staff & HR", code: "EC-101", description: "Staff Salaries" },
  { type: "Expense", category: "Staff & HR", code: "EC-102", description: "NSSF / PPF Contributions" },
  { type: "Expense", category: "Staff & HR", code: "EC-103", description: "WCF Contributions" },
  { type: "Expense", category: "Staff & HR", code: "EC-104", description: "Staff Allowances / Bonus" },
  { type: "Expense", category: "Staff & HR", code: "EC-105", description: "Training & Capacity Building" },
  { type: "Expense", category: "Staff & HR", code: "EC-106", description: "Staff Meals / Refreshments" },
  { type: "Expense", category: "Staff & HR", code: "EC-107", description: "Office Uniforms & PPE" },
  { type: "Expense", category: "Staff & HR", code: "EC-108", description: "Wages (Casual Labour)" },
  { type: "Expense", category: "Staff & HR", code: "EC-109", description: "Travel Allowance / Per Diem" },
  { type: "Expense", category: "Operations & Field", code: "EC-201", description: "Fuel & Transport" },
  { type: "Expense", category: "Operations & Field", code: "EC-202", description: "Project Site Visits / Reconnaissance" },
  { type: "Expense", category: "Operations & Field", code: "EC-203", description: "Survey Team Costs" },
  { type: "Expense", category: "Operations & Field", code: "EC-204", description: "Government Bills / Approval Fees" },
  { type: "Expense", category: "Operations & Field", code: "EC-205", description: "Land Verification Field Costs" },
  { type: "Expense", category: "Operations & Field", code: "EC-206", description: "Drone Service / Aerial Survey" },
  { type: "Expense", category: "Operations & Field", code: "EC-207", description: "Site Planning" },
  { type: "Expense", category: "Operations & Field", code: "EC-208", description: "Field Clearing Costs" },
  { type: "Expense", category: "Operations & Field", code: "EC-209", description: "Pesticides / Chemicals" },
  { type: "Expense", category: "Operations & Field", code: "EC-210", description: "Site Tools & Consumables" },
  { type: "Expense", category: "Marketing & Sales", code: "EC-301", description: "Advertisement" },
  { type: "Expense", category: "Marketing & Sales", code: "EC-302", description: "Print Media & Flyers" },
  { type: "Expense", category: "Marketing & Sales", code: "EC-303", description: "Photography & Videography" },
  { type: "Expense", category: "Marketing & Sales", code: "EC-304", description: "Sales Events & Exhibitions" },
  { type: "Expense", category: "Marketing & Sales", code: "EC-305", description: "Broker Fees / External Commission" },
  { type: "Expense", category: "Marketing & Sales", code: "EC-306", description: "Valuation Fees" },
  { type: "Expense", category: "Technology & Systems", code: "EC-401", description: "Website Hosting & Domain" },
  { type: "Expense", category: "Technology & Systems", code: "EC-402", description: "Software Purchase / Licensing" },
  { type: "Expense", category: "Technology & Systems", code: "EC-403", description: "System Development Costs" },
  { type: "Expense", category: "Technology & Systems", code: "EC-404", description: "App Maintenance & Updates" },
  { type: "Expense", category: "Technology & Systems", code: "EC-405", description: "Tech Consultants / Outsourcing" },
  { type: "Expense", category: "Technology & Systems", code: "EC-406", description: "Professional Consultancy" },
  { type: "Expense", category: "Investment Gateway", code: "EC-501", description: "Investor Facilitation Costs" },
  { type: "Expense", category: "Investment Gateway", code: "EC-502", description: "Documentation Preparation" },
  { type: "Expense", category: "Investment Gateway", code: "EC-503", description: "Partnership Meetings" },
  { type: "Expense", category: "Investment Gateway", code: "EC-504", description: "Visa Processing Fees" },
  { type: "Expense", category: "Build With Oweru", code: "EC-601", description: "Material Purchasing Costs" },
  { type: "Expense", category: "Build With Oweru", code: "EC-602", description: "Contractor Payments" },
  { type: "Expense", category: "Build With Oweru", code: "EC-603", description: "Project Supervision Costs" },
  { type: "Expense", category: "Build With Oweru", code: "EC-604", description: "Equipment Hire" },
  { type: "Expense", category: "Build With Oweru", code: "EC-605", description: "Construction Drawings / Design Fees" },
  { type: "Expense", category: "Build With Oweru", code: "EC-606", description: "Site Clearing & Preparation" },
  { type: "Expense", category: "Build With Oweru", code: "EC-607", description: "Site Measurement Tools & PPE" },
];

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function filterRecords(
  records: LegacySelectionRecord[],
  filters: Partial<Pick<LegacySelectionRecord, "type" | "category" | "code">>,
) {
  return records.filter(
    (record) =>
      (!filters.type || record.type === filters.type) &&
      (!filters.category || record.category === filters.category) &&
      (!filters.code || record.code === filters.code),
  );
}

export function getLegacyTypeOptions(records: LegacySelectionRecord[]) {
  return unique(records.map((record) => record.type));
}

export function getLegacyCategoryOptions(records: LegacySelectionRecord[], type?: string) {
  return unique(filterRecords(records, { type }).map((record) => record.category));
}

export function getLegacyCodeOptions(
  records: LegacySelectionRecord[],
  type?: string,
  category?: string,
) {
  return unique(filterRecords(records, { type, category }).map((record) => record.code));
}

export function getLegacyDescriptionOptions(
  records: LegacySelectionRecord[],
  type?: string,
  category?: string,
  code?: string,
) {
  return unique(filterRecords(records, { type, category, code }).map((record) => record.description));
}

export function findLegacyRecordByField(
  records: LegacySelectionRecord[],
  field: keyof LegacySelectionRecord,
  value: string,
) {
  return records.find((record) => record[field] === value) ?? null;
}