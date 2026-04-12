const fs = require('fs');

const data = {
  "IT": {
    "Director / Head": ["IT Support Services", "IT Capacity Management", "IT Governance", "IT Infrastructure Planning", "IT Strategy", "IT", "Cybersecurity", "IT Support", "IT Communications", "Information Systems and Technology", "Enterprise Architecture", "IT Infrastructure Strategy", "IT Infrastructure & Operations", "Cloud Technology", "IT Change Management", "IT Operations Excellence", "IT Analytics", "IT Security Operations", "IT Budget and Finance", "IT Development", "IT Integration", "IT Data Solutions", "IT Network Operations", "IT Systems", "IT Knowledge Management", "IT Service Management", "IT Program Management"],
    "Manager": ["IT Operations", "IT Support", "IT Projects", "IT Service Delivery", "Network", "Cybersecurity", "IT Infrastructure", "Cloud Operations", "IT Change", "IT Systems", "Applications", "IT Helpdesk", "Digital Transformation", "IT Vendor", "IT Risk", "IT Compliance", "IT Asset", "Software Development", "DevOps", "IT Quality Assurance"],
    "Senior Manager": ["IT Operations", "IT Support", "IT Projects", "IT Service Delivery", "Network", "Cybersecurity", "IT Infrastructure", "Cloud Operations", "IT Change", "IT Systems", "Applications", "IT Helpdesk", "Digital Transformation", "IT Vendor", "IT Risk", "IT Compliance", "IT Asset", "Software Development", "DevOps", "IT Quality Assurance"],
    "AVP / VP / SVP": ["Information Technology", "IT Operations", "Cybersecurity", "Cloud Infrastructure", "Enterprise Architecture", "IT Strategy", "Digital Transformation", "IT Service Delivery", "Software Engineering", "IT Governance & Risk", "IT Infrastructure", "IT Development", "Network Operations"],
    "Chief": ["Information Officer", "Technology Officer", "Digital Officer", "Information Security Officer", "Data & Technology Officer"]
  },
  "HR": {
    "Director / Head": ["Human Resources", "HR Operations", "HR Strategy", "Talent Acquisition", "Talent Management", "People & Culture", "Learning & Development", "Employee Relations", "HR Analytics", "Compensation & Benefits", "Diversity & Inclusion", "Organizational Development", "HR Business Partnering", "Workforce Planning", "HR Shared Services", "People Operations", "Employee Experience"],
    "Manager": ["HR", "Talent Acquisition", "HR Business Partnering", "Learning & Development", "Compensation & Benefits", "Employee Relations", "HR Operations", "Payroll", "Diversity & Inclusion", "HR Compliance", "Onboarding", "Performance Management", "Workforce Planning", "HR Analytics", "Organizational Development", "Employee Experience"],
    "Senior Manager": ["HR", "Talent Acquisition", "HR Business Partnering", "Learning & Development", "Compensation & Benefits", "Employee Relations", "HR Operations", "Payroll", "Diversity & Inclusion", "HR Compliance", "Onboarding", "Performance Management", "Workforce Planning", "HR Analytics", "Organizational Development", "Employee Experience"],
    "AVP / VP / SVP": ["Human Resources", "Talent Acquisition", "People & Culture", "Learning & Development", "Compensation & Benefits", "Employee Relations", "HR Operations", "Diversity Equity & Inclusion", "Organizational Development", "People Operations", "Talent Management"],
    "Chief": ["Human Resources Officer", "People Officer", "Talent Officer", "Culture Officer", "Diversity Officer"]
  },
  "Sales": {
    "Director / Head": ["Sales", "Sales Operations", "Sales Strategy", "Global Sales", "Regional Sales", "Inside Sales", "Enterprise Sales", "Channel Sales", "Field Sales", "Business Development", "Sales Enablement", "Key Accounts", "Direct Sales", "Sales Analytics", "Commercial Sales", "Partnerships", "Retail Sales", "Wholesale Sales"],
    "Manager": ["Sales", "Sales Operations", "Inside Sales", "Field Sales", "Channel Sales", "Enterprise Sales", "Business Development", "Sales Enablement", "Digital Sales", "Key Account", "Commercial Sales", "Retail Sales", "Wholesale Sales", "Partnerships", "Sales Analytics", "Account Management"],
    "Senior Manager": ["Sales", "Sales Operations", "Inside Sales", "Field Sales", "Channel Sales", "Enterprise Sales", "Business Development", "Sales Enablement", "Digital Sales", "Key Account", "Commercial Sales", "Retail Sales", "Wholesale Sales", "Partnerships", "Sales Analytics", "Account Management"],
    "AVP / VP / SVP": ["Sales", "Sales Operations", "Business Development", "Enterprise Sales", "Global Sales", "Channel Sales", "Inside Sales", "Field Sales", "Key Accounts", "Sales Strategy", "Commercial Sales", "Partnerships"],
    "Chief": ["Revenue Officer", "Sales Officer", "Commercial Officer", "Business Development Officer", "Growth Officer"]
  },
  "Marketing": {
    "Director / Head": ["Digital Marketing", "Marketing", "Marketing Operations", "Growth Marketing", "Brand Marketing", "Content Marketing", "Product Marketing", "Performance Marketing", "Marketing Analytics", "Demand Generation", "Social Media Marketing", "Marketing Communications", "Customer Marketing", "Integrated Marketing", "Campaign Management", "Marketing Strategy", "B2B Marketing", "B2C Marketing"],
    "Manager": ["Marketing", "Digital Marketing", "Brand", "Content Marketing", "Product Marketing", "Social Media", "Performance Marketing", "Demand Generation", "Email Marketing", "Marketing Analytics", "Campaign", "SEO & SEM", "Marketing Operations", "Customer Marketing", "Events Marketing", "B2B Marketing", "B2C Marketing"],
    "Senior Manager": ["Marketing", "Digital Marketing", "Brand", "Content Marketing", "Product Marketing", "Social Media", "Performance Marketing", "Demand Generation", "Email Marketing", "Marketing Analytics", "Campaign", "SEO & SEM", "Marketing Operations", "Customer Marketing", "Events Marketing", "B2B Marketing", "B2C Marketing"],
    "AVP / VP / SVP": ["Marketing", "Digital Marketing", "Brand Marketing", "Product Marketing", "Growth Marketing", "Marketing Operations", "Content Marketing", "Demand Generation", "Marketing Analytics", "Integrated Marketing", "Customer Marketing"],
    "Chief": ["Marketing Officer", "Brand Officer", "Digital Marketing Officer", "Marketing & Growth Officer", "Content Officer"]
  },
  "Finance": {
    "Director / Head": ["Finance", "Corporate Finance", "Treasury", "Financial Reporting", "Risk & Compliance", "Internal Audit", "Tax", "Budgeting & Forecasting", "Investor Relations", "Accounting", "Financial Operations", "Finance Transformation", "Financial Planning & Analysis", "Revenue Operations", "Financial Control"],
    "Manager": ["Finance", "Financial Planning & Analysis", "Accounting", "Treasury", "Tax", "Financial Reporting", "Internal Audit", "Risk Management", "Budget & Forecasting", "Corporate Finance", "Finance Operations", "Compliance", "Accounts Payable", "Accounts Receivable", "Revenue Accounting", "Financial Control"],
    "Senior Manager": ["Finance", "Financial Planning & Analysis", "Accounting", "Treasury", "Tax", "Financial Reporting", "Internal Audit", "Risk Management", "Budget & Forecasting", "Corporate Finance", "Finance Operations", "Compliance", "Accounts Payable", "Accounts Receivable", "Revenue Accounting", "Financial Control"],
    "AVP / VP / SVP": ["Finance", "Financial Planning & Analysis", "Corporate Finance", "Treasury", "Accounting", "Tax", "Internal Audit", "Risk Management", "Financial Reporting", "Finance Operations", "Investor Relations", "Financial Control"],
    "Chief": ["Financial Officer", "Accounting Officer", "Risk Officer", "Audit Executive", "Treasury Officer"]
  },
  "Data": {
    "Director / Head": ["Data Services", "Data Protection", "Data Engineering", "Data Science", "Data Analytics", "Data Governance", "Business Intelligence", "Data Architecture", "Data Strategy", "Machine Learning", "Data Products", "Data Platform", "Advanced Analytics", "Data Privacy", "AI & Data", "Data Infrastructure"],
    "Manager": ["Data Engineering", "Data Science", "Data Analytics", "Business Intelligence", "Data Governance", "Machine Learning", "Data Platform", "Data Products", "Data Visualization", "Database", "Data Privacy", "Analytics Engineering", "Data Operations", "Reporting & Insights", "AI & Data", "Data Infrastructure"],
    "Senior Manager": ["Data Engineering", "Data Science", "Data Analytics", "Business Intelligence", "Data Governance", "Machine Learning", "Data Platform", "Data Products", "Data Visualization", "Database", "Data Privacy", "Analytics Engineering", "Data Operations", "Reporting & Insights", "AI & Data", "Data Infrastructure"],
    "AVP / VP / SVP": ["Data", "Data Engineering", "Data Science", "Data Analytics", "Business Intelligence", "Data Governance", "Machine Learning & AI", "Data Platform", "Data Products", "Advanced Analytics", "Data Strategy"],
    "Chief": ["Data Officer", "Analytics Officer", "AI Officer", "Data Science Officer", "Intelligence Officer"]
  },
  "Logistics & Supply Chain": {
    "Director / Head": ["Logistics", "Logistics Operations", "Supply Chain", "Distribution", "Warehousing & Fulfillment", "Transportation", "Supply Chain Strategy", "Global Logistics", "Inventory Management", "Supply Chain Operations", "Last-Mile Delivery", "Import & Export", "Fleet Management", "Purchasing and Logistics", "Cold Chain"],
    "Manager": ["Logistics", "Supply Chain", "Distribution", "Warehouse", "Transportation", "Inventory", "Fulfillment", "Import & Export", "Last-Mile Delivery", "Supply Chain Operations", "Fleet", "Cold Chain", "Reverse Logistics", "Freight", "Network Planning", "Purchasing & Logistics"],
    "Senior Manager": ["Logistics", "Supply Chain", "Distribution", "Warehouse", "Transportation", "Inventory", "Fulfillment", "Import & Export", "Last-Mile Delivery", "Supply Chain Operations", "Fleet", "Cold Chain", "Reverse Logistics", "Freight", "Network Planning", "Purchasing & Logistics"],
    "AVP / VP / SVP": ["Supply Chain", "Logistics", "Distribution", "Transportation & Fleet", "Warehousing & Fulfillment", "Supply Chain Strategy", "Global Logistics", "Inventory Management", "Supply Chain Operations", "Last-Mile Delivery", "Procurement & Logistics"],
    "Chief": ["Supply Chain Officer", "Logistics Officer", "Operations & Supply Chain Officer", "Procurement & Logistics Officer", "Distribution Officer"]
  },
  "Procurement": {
    "Director / Head": ["Procurement", "Global Procurement", "Procurement Operations", "Sourcing and Procurement", "Procurement Strategy", "Strategic Sourcing", "Category Management", "Vendor Management", "Contract Management", "Supplier Relations", "Indirect Procurement", "Direct Procurement", "Procurement Transformation", "Procurement Analytics", "Spend Management", "Supplier Development"],
    "Manager": ["Procurement", "Sourcing", "Category", "Vendor Management", "Contract", "Supplier Relations", "Indirect Procurement", "Direct Procurement", "Procurement Operations", "Strategic Sourcing", "Procurement Compliance", "Spend Analytics", "Procurement Technology", "Global Sourcing", "Supplier Development", "Spend Management"],
    "Senior Manager": ["Procurement", "Sourcing", "Category", "Vendor Management", "Contract", "Supplier Relations", "Indirect Procurement", "Direct Procurement", "Procurement Operations", "Strategic Sourcing", "Procurement Compliance", "Spend Analytics", "Procurement Technology", "Global Sourcing", "Supplier Development", "Spend Management"],
    "AVP / VP / SVP": ["Procurement", "Strategic Sourcing", "Category Management", "Vendor Management", "Contract Management", "Global Procurement", "Procurement Operations", "Supplier Relations", "Indirect Procurement", "Spend Management", "Supplier Development"],
    "Chief": ["Procurement Officer", "Sourcing Officer", "Vendor Relations Officer", "Category Management Officer", "Supply & Procurement Officer"]
  },
  "Operations": {
    "Director / Head": ["Operations", "Business Operations", "Operational Excellence", "Process Improvement", "Facilities Management", "Quality Operations", "Production Operations", "Operations Strategy", "Operations Analytics", "Operations Transformation", "Service Operations", "Technical Operations", "Plant Operations", "Field Operations", "Operations Support"],
    "Manager": ["Operations", "Business Operations", "Process Improvement", "Facilities", "Quality Operations", "Production", "Operations Analytics", "Operational Excellence", "Plant Operations", "Field Operations", "Service Operations", "Technical Operations", "Operations Compliance", "Site Operations", "Operations Support", "Operations Projects"],
    "Senior Manager": ["Operations", "Business Operations", "Process Improvement", "Facilities", "Quality Operations", "Production", "Operations Analytics", "Operational Excellence", "Plant Operations", "Field Operations", "Service Operations", "Technical Operations", "Operations Compliance", "Site Operations", "Operations Support", "Operations Projects"],
    "AVP / VP / SVP": ["Operations", "Business Operations", "Operational Excellence", "Process Improvement", "Production Operations", "Quality Operations", "Facilities Management", "Field Operations", "Service Operations", "Operations Analytics", "Technical Operations"],
    "Chief": ["Operating Officer", "Business Operations Officer", "Operational Excellence Officer", "Production Officer", "Services Officer"]
  }
};

const templates = {
  "Director / Head": [
    "Director of {X}", "Head of {X}", "Senior Director of {X}", "Sr. Director of {X}", "Global Director of {X}", "Regional Director of {X}", "Area Director of {X}", "Group Director of {X}", "Executive Director of {X}", "Deputy Director of {X}", "International Director of {X}", "Divisional Director of {X}"
  ],
  "Manager": [
    "Manager of {X}", "Senior Manager of {X}", "Sr. Manager of {X}", "Area Manager {X}", "Regional Manager {X}", "Global Manager {X}", "National Manager {X}", "Deputy Manager {X}", "Group Manager {X}", "Corporate Manager {X}", "Country Manager {X}", "Divisional Manager {X}", "Assistant Manager {X}", "Associate Manager {X}", "Lead Manager {X}"
  ],
  "Senior Manager": [
    "Senior Manager {X}", "Sr. Manager {X}", "Group Senior Manager {X}", "Global Senior Manager {X}", "Regional Senior Manager {X}", "Lead Senior Manager {X}", "Principal Manager {X}", "Associate Senior Manager {X}", "Area Senior Manager {X}", "Deputy Senior Manager {X}", "National Senior Manager {X}", "International Senior Manager {X}", "Divisional Senior Manager {X}"
  ],
  "AVP / VP / SVP": [
    "VP of {X}", "Vice President of {X}", "SVP of {X}", "Senior Vice President of {X}", "AVP of {X}", "Assistant Vice President of {X}", "EVP of {X}", "Executive Vice President of {X}", "Group VP of {X}", "Global VP of {X}", "Regional VP of {X}"
  ],
  "Chief": [
    "Chief {X}", "Group Chief {X}", "Global Chief {X}", "Regional Chief {X}"
  ]
};

let csv = "#,Function,Level,Job Title\n";
let id = 1;

for (const [fn, levels] of Object.entries(data)) {
  for (const [level, subFns] of Object.entries(levels)) {
    for (const subFn of subFns) {
      for (const tmpl of templates[level]) {
        const title = tmpl.replace("{X}", subFn);
        csv += `${id},${fn},${level},${title}\n`;
        id++;
      }
    }
  }
}

fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/MSFT_titles_expanded_v2.csv', csv);
console.log("Generated " + (id - 1) + " titles.");
