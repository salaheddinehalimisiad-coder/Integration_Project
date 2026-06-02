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
    nationalId: "FR-2044",
    employeeMatricule: "EMP-002",
    name: { first: "Claire", last: "Martin" },
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
  }
]);
