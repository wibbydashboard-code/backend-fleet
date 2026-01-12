-- Esquema de Base de Datos - PCAS Fleet Management v1.0
-- Generado para Hostinger MySQL

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

--
-- Estructura de tabla para la tabla `companies`
--

CREATE TABLE IF NOT EXISTS `companies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Estructura de tabla para la tabla `providers`
--

CREATE TABLE IF NOT EXISTS `providers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL,
  `contact_info` text,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Estructura de tabla para la tabla `units`
--

CREATE TABLE IF NOT EXISTS `units` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `economic_number` varchar(50) NOT NULL,
  `license_plate` varchar(50) NOT NULL,
  `serial_number` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `brand` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  `year` int(11) NOT NULL,
  `assigned_company_id` int(11) NOT NULL,
  `assigned_provider_id` int(11) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Activo',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Estructura de tabla para la tabla `contracts`
--

CREATE TABLE IF NOT EXISTS `contracts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `contract_number` varchar(255) NOT NULL,
  `provider_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `contracting_company_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `term_months` int(11) NOT NULL,
  `monthly_rent` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `contract_pdf_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Estructura de tabla para la tabla `insurance_policies`
--

CREATE TABLE IF NOT EXISTS `insurance_policies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `policy_number` varchar(255) NOT NULL,
  `provider_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `premium_amount` decimal(10,2) NOT NULL,
  `status` varchar(50) DEFAULT 'Vigente',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Estructura de tabla para la tabla `payments`
--

CREATE TABLE IF NOT EXISTS `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `contract_id` int(11) DEFAULT NULL,
  `insurance_policy_id` int(11) DEFAULT NULL,
  `provider_id` int(11) DEFAULT NULL,
  `payment_date` date DEFAULT NULL,
  `period` varchar(50) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Pendiente',
  `due_date` date DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_pdf_path` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos PRECARGADOS (Opcional, para no empezar en blanco)
--

INSERT INTO `companies` (`name`) VALUES
('Intra'),
('Icold'),
('Administrativos Corp.');

INSERT INTO `providers` (`name`, `type`) VALUES
('Paccar Financial', 'arrendador'),
('Axa Seguros', 'aseguradora'),
('TIP Mexico', 'arrendador'),
('GNP Seguros', 'aseguradora');
