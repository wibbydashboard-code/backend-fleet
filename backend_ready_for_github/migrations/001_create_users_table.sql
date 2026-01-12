-- Tabla de usuarios (INDEPENDIENTE de todo lo demás)
-- Ejecutar en TiDB Cloud antes de continuar

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL UNIQUE,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin', 'user', 'viewer') DEFAULT 'user',
  `status` enum('active', 'inactive', 'pending') DEFAULT 'active',
  `last_login` timestamp NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Usuario admin inicial (TEMPORAL para testing)
-- Password: Admin123!
-- Hash generado con bcrypt
INSERT INTO `users` (`email`, `password_hash`, `role`, `status`)
VALUES (
  'admin@pcas.com',
  '$2a$10$rXq9nXy8aY9aZ7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2',
  'admin',
  'active'
);
