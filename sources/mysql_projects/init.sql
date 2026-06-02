CREATE TABLE consultants (
  consultant_code VARCHAR(30) PRIMARY KEY,
  complete_name VARCHAR(160),
  mail VARCHAR(120),
  business_unit VARCHAR(100),
  active TINYINT
);

CREATE TABLE projects (
  project_code VARCHAR(30) PRIMARY KEY,
  label VARCHAR(120),
  client_name VARCHAR(120),
  state VARCHAR(20),
  start_dt DATETIME,
  end_dt DATETIME
);

CREATE TABLE assignments (
  consultant_code VARCHAR(30),
  project_code VARCHAR(30),
  job_title VARCHAR(80),
  allocation_percent INT,
  PRIMARY KEY (consultant_code, project_code)
);

INSERT INTO consultants VALUES
('EMP-001', 'Amine Bensaid', 'amine.bensaid@corp.dz', 'IT', 1),
('EMP-003', 'Yacine Haddad', 'yacine.haddad@corp.dz', 'Data', 1),
('C-771', 'Nour Ait Salem', 'nour.aitsalem@corp.dz', 'AI', 1),
('C-882', 'Meriem Khelifi', 'meriem.khelifi@corp.dz', 'Operations', 1),
('C-404', 'Omar Trabelsi', 'omar.trabelsi@corp.tn', 'Operations', 0);

INSERT INTO projects VALUES
('PRJ-AI', 'AI Risk Platform', 'Sonatrach Digital', 'ACTIVE', '2026-01-15', '2026-10-30'),
('PRJ-DW', 'Data Quality Hub', 'Algeria Telecom', 'ACTIVE', '2026-02-01', '2026-08-15'),
('PRJ-ERP', 'ERP Finance Migration', 'Numidia Bank', 'PAUSED', '2025-11-10', '2026-12-01'),
('PRJ-HR', 'HR Self Service', 'Sahara Group', 'CLOSED', '2025-02-10', '2025-12-30');

INSERT INTO assignments VALUES
('EMP-001', 'PRJ-AI', 'Lead Data Engineer', 80),
('EMP-003', 'PRJ-DW', 'Data Analyst', 70),
('C-771', 'PRJ-AI', 'ML Engineer', 90),
('C-882', 'PRJ-ERP', 'Business Analyst', 50),
('EMP-001', 'PRJ-DW', 'Integration Architect', 20);
