db = db.getSiblingDB("finance_db");

db.payroll.insertMany([
  {
    docId: "PAY-001",
    nationalId: "DZ-1001",
    employeeMatricule: "EMP-001",
    name: { first: "Amine", last: "Bensaid" },
    monthlySalaryDzd: 455000,
    bonusDzd: 80000,
    currency: "DZD",
    riskLevel: "LOW",
    visibleToRoles: ["ADMIN", "HR_MANAGER", "FINANCE_OFFICER"]
  },
  {
    docId: "PAY-002",
    nationalId: "DZ-2044",
    employeeMatricule: "EMP-002",
    name: { first: "Sarah", last: "Mansouri" },
    monthlySalaryDzd: 610000,
    bonusDzd: 120000,
    currency: "DZD",
    riskLevel: "MEDIUM",
    visibleToRoles: ["ADMIN", "HR_MANAGER", "FINANCE_OFFICER"]
  },
  {
    docId: "PAY-003",
    nationalId: "DZ-3003",
    employeeMatricule: "EMP-003",
    name: { first: "Yacine", last: "Haddad" },
    monthlySalaryDzd: 350000,
    bonusDzd: 55000,
    currency: "DZD",
    riskLevel: "LOW",
    visibleToRoles: ["ADMIN", "HR_MANAGER", "FINANCE_OFFICER"]
  },
  {
    docId: "PAY-004",
    nationalId: "DZ-5005",
    employeeMatricule: "EMP-005",
    name: { first: "Nour", last: "Ait Salem" },
    monthlySalaryDzd: 390000,
    bonusDzd: 70000,
    currency: "DZD",
    riskLevel: "HIGH",
    visibleToRoles: ["ADMIN", "FINANCE_OFFICER"]
  },
  {
    docId: "PAY-005",
    nationalId: "DZ-6006",
    employeeMatricule: "EMP-007",
    name: { first: "Tarek", last: "Bouzid" },
    monthlySalaryDzd: 650000,
    bonusDzd: 150000,
    currency: "DZD",
    riskLevel: "LOW",
    visibleToRoles: ["ADMIN", "HR_MANAGER", "FINANCE_OFFICER"]
  },
  {
    docId: "PAY-006",
    nationalId: "DZ-7007",
    employeeMatricule: "EMP-008",
    name: { first: "Kenza", last: "Belkacem" },
    monthlySalaryDzd: 380000,
    bonusDzd: 60000,
    currency: "DZD",
    riskLevel: "LOW",
    visibleToRoles: ["ADMIN", "HR_MANAGER", "FINANCE_OFFICER"]
  },
  {
    docId: "PAY-007",
    nationalId: "DZ-8008",
    employeeMatricule: "C-771",
    name: { first: "Nour", last: "Ait Salem" },
    monthlySalaryDzd: 420000,
    bonusDzd: 50000,
    currency: "DZD",
    riskLevel: "MEDIUM",
    visibleToRoles: ["ADMIN", "FINANCE_OFFICER"]
  },
  {
    docId: "PAY-008",
    nationalId: "DZ-9009",
    employeeMatricule: "C-505",
    name: { first: "Hamza", last: "Chergui" },
    monthlySalaryDzd: 480000,
    bonusDzd: 75000,
    currency: "DZD",
    riskLevel: "HIGH",
    visibleToRoles: ["ADMIN", "FINANCE_OFFICER"]
  }
]);
