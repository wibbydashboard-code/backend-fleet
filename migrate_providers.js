import mysql from 'mysql2/promise';

async function migrateProviders() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fleet_db'
  });

  try {
    console.log('🔄 Iniciando migración de tabla providers...');

    const [columns] = await conn.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'providers'
    `, [process.env.DB_NAME || 'fleet_db']);

    const existingColumns = columns.map(c => c.COLUMN_NAME);

    if (!existingColumns.includes('rfc')) {
      await conn.query(`ALTER TABLE providers ADD COLUMN rfc VARCHAR(20) NULL AFTER type`);
      console.log('✅ Columna rfc agregada');
    }

    if (!existingColumns.includes('contact_name')) {
      await conn.query(`ALTER TABLE providers ADD COLUMN contact_name VARCHAR(255) NULL AFTER rfc`);
      console.log('✅ Columna contact_name agregada');
    }

    if (!existingColumns.includes('contact_email')) {
      await conn.query(`ALTER TABLE providers ADD COLUMN contact_email VARCHAR(255) NULL AFTER contact_name`);
      console.log('✅ Columna contact_email agregada');
    }

    if (!existingColumns.includes('contact_phone')) {
      await conn.query(`ALTER TABLE providers ADD COLUMN contact_phone VARCHAR(50) NULL AFTER contact_email`);
      console.log('✅ Columna contact_phone agregada');
    }

    if (!existingColumns.includes('status')) {
      await conn.query(`ALTER TABLE providers ADD COLUMN status VARCHAR(20) DEFAULT 'Activo' AFTER contact_phone`);
      console.log('✅ Columna status agregada');
    }

    await conn.query(`
      UPDATE providers 
      SET type = 'arrendador' 
      WHERE type = 'financial'
    `);
    console.log('✅ Tipos actualizados (financial -> arrendador)');

    await conn.query(`
      UPDATE providers 
      SET type = 'aseguradora' 
      WHERE type = 'insurance'
    `);
    console.log('✅ Tipos actualizados (insurance -> aseguradora)');

    const [rows] = await conn.query('SELECT COUNT(*) as count FROM providers WHERE status IS NULL');
    if (rows[0].count > 0) {
      await conn.query(`UPDATE providers SET status = 'Activo' WHERE status IS NULL`);
      console.log('✅ Status inicializado para providers existentes');
    }

    console.log('\n🎯 Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

migrateProviders();