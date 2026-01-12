-- PASO 1: Agregar tenant_id a tabla units
ALTER TABLE units ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id;
ALTER TABLE units ADD INDEX idx_tenant_id (tenant_id);

-- PASO 2: Agregar tenant_id a tabla contracts
ALTER TABLE contracts ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id;
ALTER TABLE contracts ADD INDEX idx_tenant_id (tenant_id);

-- PASO 3: Agregar tenant_id a tabla payments
ALTER TABLE payments ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id;
ALTER TABLE payments ADD INDEX idx_tenant_id (tenant_id);

-- Validación: Verificar que todas las tablas tienen tenant_id
SELECT
  'units' as table_name,
  COUNT(*) as total_records,
  COUNT(tenant_id) as records_with_tenant
FROM units
UNION ALL
SELECT
  'contracts' as table_name,
  COUNT(*) as total_records,
  COUNT(tenant_id) as records_with_tenant
FROM contracts
UNION ALL
SELECT
  'payments' as table_name,
  COUNT(*) as total_records,
  COUNT(tenant_id) as records_with_tenant
FROM payments;
