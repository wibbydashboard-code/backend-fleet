-- Tabla de tenants (empresas clientes)
-- Ejecutar en TiDB Cloud antes de Fase 3b

CREATE TABLE IF NOT EXISTS `tenants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) NOT NULL UNIQUE,
  `status` enum('active', 'suspended', 'trial') DEFAULT 'active',
  `settings` json NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_slug` (`slug`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tenant por defecto (datos existentes)
INSERT INTO `tenants` (`name`, `slug`, `status`, `settings`)
VALUES (
  'PCAS Default',
  'default',
  'active',
  NULL
);

-- Usuario admin asociado al tenant por defecto
-- (esto se actualizará cuando se migre la tabla users)
-- UPDATE `users` SET `tenant_id` = 1 WHERE `id` = 1;
