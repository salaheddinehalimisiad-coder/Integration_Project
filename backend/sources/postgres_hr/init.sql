CREATE TABLE departments (
  dept_id SERIAL PRIMARY KEY,
  dept_code VARCHAR(20) UNIQUE NOT NULL,
  dept_name VARCHAR(100) NOT NULL,
  country VARCHAR(2)
);

CREATE TABLE employees (
  emp_id SERIAL PRIMARY KEY,
  matricule VARCHAR(30) UNIQUE NOT NULL,
  first_name VARCHAR(80),
  last_name VARCHAR(80),
  email VARCHAR(120) UNIQUE,
  birth_date DATE,
  salary_eur NUMERIC(12,2),
  dept_id INT REFERENCES departments(dept_id),
  status VARCHAR(20)
);

INSERT INTO departments(dept_code, dept_name, country) VALUES
('IT', 'Information Technology', 'DZ'),
('FIN', 'Finance', 'DZ'),
('HR', 'Human Resources', 'FR'),
('DATA', 'Data Office', 'DZ'),
('OPS', 'Operations', 'TN'),
('AI', 'AI Lab', 'DZ'),
('SEC', 'Cybersecurity', 'DZ');

INSERT INTO employees(matricule, first_name, last_name, email, birth_date, salary_eur, dept_id, status) VALUES
('EMP-001', 'Amine', 'Bensaid', 'amine.bensaid@corp.dz', '1995-03-14', 3200, 1, 'active'),
('EMP-002', 'Sarah', 'Mansouri', 'sarah.mansouri@corp.fr', '1990-07-09', 4100, 3, 'active'),
('EMP-003', 'Yacine', 'Haddad', 'yacine.haddad@corp.dz', '1998-11-21', 2700, 4, 'active'),
('EMP-004', 'Yasmine', 'Mekki', 'yasmine.mekki@corp.dz', '1992-01-22', 3900, 2, 'active'),
('EMP-005', 'Nour', 'Ait Salem', 'nour.aitsalem@corp.dz', '1997-09-10', 2500, 6, 'active'),
('EMP-006', 'Omar', 'Trabelsi', 'omar.trabelsi@corp.tn', '1991-12-04', 3000, 5, 'inactive'),
('EMP-007', 'Tarek', 'Bouzid', 'tarek.bouzid@corp.dz', '1988-05-15', 4500, 7, 'active'),
('EMP-008', 'Kenza', 'Belkacem', 'kenza.belkacem@corp.dz', '1993-08-30', 2800, 1, 'active'),
('EMP-009', 'Walid', 'Saidi', 'walid.saidi@corp.dz', '1996-02-18', 2600, 4, 'active'),
('EMP-010', 'Fatima', 'Allal', 'fatima.allal@corp.dz', '1985-10-25', 5200, 2, 'active'),
('EMP-011', 'Farid', 'Ziani', 'farid.ziani@corp.dz', '1989-06-12', 3800, 6, 'active'),
('EMP-012', 'Amira', 'Berrada', 'amira.berrada@corp.tn', '1994-04-05', 3100, 5, 'active'),
('EMP-013', 'Mehdi', 'Cherif', 'mehdi.cherif@corp.fr', '1990-09-22', 4300, 3, 'active'),
('EMP-014', 'Leila', 'Djouadi', 'leila.djouadi@corp.dz', '1995-11-11', 2900, 1, 'active'),
('EMP-015', 'Nabil', 'Khelifi', 'nabil.khelifi@corp.dz', '1987-03-08', 4700, 7, 'inactive');
