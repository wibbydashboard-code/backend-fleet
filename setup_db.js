import mysql from 'mysql2/promise';

async function setupDatabase() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('✅ Conectado a MySQL server');

    // Create database if not exists
    await conn.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'fleet_db'} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Base de datos '${process.env.DB_NAME || 'fleet_db'}' verificada`);

    await conn.query(`USE ${process.env.DB_NAME || 'fleet_db'}`);

    // Create tables (simplified, no FKs to avoid prepared statement issues)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS providers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        contact_info TEXT,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS units (
        id INT PRIMARY KEY AUTO_INCREMENT,
        economic_number VARCHAR(50) NOT NULL,
        license_plate VARCHAR(50) NOT NULL,
        serial_number VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        brand VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        year INT NOT NULL,
        assigned_company_id INT NOT NULL,
        assigned_provider_id INT,
        status VARCHAR(50) DEFAULT 'Activo',
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        contract_number VARCHAR(255) NOT NULL,
        provider_id INT NOT NULL,
        unit_id INT NOT NULL,
        contracting_company_id INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        term_months INT NOT NULL,
        monthly_rent DECIMAL(10,2) NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS insurance_policies (
        id INT PRIMARY KEY AUTO_INCREMENT,
        policy_number VARCHAR(255) NOT NULL,
        provider_id INT NOT NULL,
        unit_id INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        premium_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'Vigente',
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        contract_id INT,
        insurance_policy_id INT,
        provider_id INT,
        payment_date DATE,
        period VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        type VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Pendiente',
        due_date DATE,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tablas creadas/verificadas');

    // Insert test data
    const [providerCount] = await conn.query('SELECT COUNT(*) as c FROM providers');
    if (providerCount[0].c === 0) {
      await conn.query("INSERT INTO providers (name, type) VALUES ('Paccar Financial', 'financial'), ('Axa Seguros', 'insurance')");
      console.log('✅ Datos de prueba: providers insertados');
    }

    const [companyCount] = await conn.query('SELECT COUNT(*) as c FROM companies');
    if (companyCount[0].c === 0) {
      await conn.query("INSERT INTO companies (name) VALUES ('Intra'), ('Icold'), ('Administrativos Corp.')");
      console.log('✅ Datos de prueba: companies insertados');
    }

    const [unitCount] = await conn.query('SELECT COUNT(*) as c FROM units');
    if (unitCount[0].c === 0) {
      await conn.query(`
        INSERT INTO units (economic_number, license_plate, serial_number, type, brand, model, year, assigned_company_id, assigned_provider_id)
        VALUES ('I262', '59UK3W', 'SN12345', 'Caja Refrigerada', 'UTILITY', '3000R', 2024, 2, 1),
               ('T757', '84AJ3D', 'SN67890', 'Tractocamion', 'Kenworth', 'T680', 2023, 1, 1)
      `);
      console.log('✅ Datos de prueba: units insertados');
    }

    const [contractCount] = await conn.query('SELECT COUNT(*) as c FROM contracts');
    if (contractCount[0].c === 0) {
      await conn.query(`
        INSERT INTO contracts (contract_number, provider_id, unit_id, contracting_company_id, start_date, end_date, term_months, monthly_rent)
        VALUES ('Paccar-CR-262', 1, 1, 2, '2024-12-01', '2029-11-30', 60, 24108.52),
               ('TIP-Multi-05', 1, 2, 1, '2023-06-15', '2026-06-14', 36, 35000.00)
      `);
      console.log('✅ Datos de prueba: contracts insertados');
    }

    const [policyCount] = await conn.query('SELECT COUNT(*) as c FROM insurance_policies');
    if (policyCount[0].c === 0) {
      await conn.query(`
        INSERT INTO insurance_policies (policy_number, provider_id, unit_id, start_date, end_date, premium_amount)
        VALUES ('VCI844830100', 2, 1, '2025-02-18', '2026-01-24', 5000.00),
               ('GNP-TR-987', 2, 2, '2025-01-01', '2025-12-31', 6000.00)
      `);
      console.log('✅ Datos de prueba: insurance_policies insertados');
    }

    const [paymentCount] = await conn.query('SELECT COUNT(*) as c FROM payments');
    if (paymentCount[0].c === 0) {
      await conn.query(`
        INSERT INTO payments (contract_id, insurance_policy_id, provider_id, period, amount, type, status, payment_date, due_date)
        VALUES (1, NULL, 1, 'Julio 2025', 24108.52, 'rent', 'Pagado', '2025-07-05', '2025-07-31'),
               (1, NULL, 1, 'Junio 2025', 24108.52, 'rent', 'Pagado', '2025-06-04', '2025-06-30'),
               (1, NULL, 1, 'Mayo 2025', 24108.52, 'rent', 'Pagado', '2025-05-05', '2025-05-31'),
               (1, NULL, 1, 'Agosto 2025', 24108.52, 'insurance', 'Pendiente', NULL, '2025-08-31')
      `);
      console.log('✅ Datos de prueba: payments insertados');
    }

    console.log('\n🎯 Base de datos lista para pruebas');
    await conn.end();
  } catch (error) {
    console.error('❌ Error en setup:', error.message);
    process.exit(1);
  }
}

setupDatabase();