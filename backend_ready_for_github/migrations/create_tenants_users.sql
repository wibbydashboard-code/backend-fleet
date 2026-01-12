-- TABLA tenants
CREATE TABLE IF NOT EXISTS tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  status ENUM('active', 'suspended', 'deleted') NOT NULL DEFAULT 'active',
  settings JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_status (status),
  INDEX idx_slug (slug),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLA users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user', 'viewer') NOT NULL DEFAULT 'user',
  tenant_id INT NOT NULL,
  status ENUM('active', 'suspended', 'deleted') NOT NULL DEFAULT 'active',
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  INDEX idx_email (email),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_status (status),
  INDEX idx_deleted_at (deleted_at),
  UNIQUE INDEX idx_email_tenant (email, tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TENANT DEFAULT (para datos existentes)
INSERT INTO tenants (id, name, slug, status) VALUES (1, 'PCAS Default', 'default', 'active')
ON DUPLICATE KEY UPDATE name = 'PCAS Default', slug = 'default';

-- Validación
SELECT
  'tenants' as table_name,
  COUNT(*) as total_records
FROM tenants
UNION ALL
SELECT
  'users' as table_name,
  COUNT(*) as total_records
FROM users
UNION ALL
SELECT
  'units' as table_name,
  COUNT(*) as total_records
FROM units
UNION ALL
SELECT
  'contracts' as table_name,
  COUNT(*) as total_records
FROM contracts
UNION ALL
SELECT
  'payments' as table_name,
  COUNT(*) as total_records
FROM payments;
