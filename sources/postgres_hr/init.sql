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
('AI', 'AI Lab', 'DZ');

INSERT INTO employees(matricule, first_name, last_name, email, birth_date, salary_eur, dept_id, status) VALUES
('EMP-001', 'Amine', 'Bensaid', 'amine.bensaid@corp.dz', '1995-03-14', 3200, 1, 'active'),
('EMP-002', 'Claire', 'Martin', 'claire.martin@corp.fr', '1990-07-09', 4100, 3, 'active'),
('EMP-003', 'Yacine', 'Haddad', 'yacine.haddad@corp.dz', '1998-11-21', 2700, 4, 'active'),
('EMP-004', 'Sarah', 'Mekki', 'sarah.mekki@corp.dz', '1992-01-22', 3900, 2, 'active'),
('EMP-005', 'Nour', 'Ait Salem', 'nour.aitsalem@corp.dz', '1997-09-10', 2500, 6, 'active'),
('EMP-006', 'Omar', 'Trabelsi', 'omar.trabelsi@corp.tn', '1991-12-04', 3000, 5, 'inactive');
