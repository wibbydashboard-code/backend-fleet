import mysql from 'mysql2/promise';

async function migrateContractPDF() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'fleet_db'
    });

    console.log('✅ Conectado a MySQL');

    await conn.query(`
      ALTER TABLE contracts
      ADD COLUMN contract_pdf_path VARCHAR(255) NULL
      AFTER is_active
    `);

    console.log('✅ Columna contract_pdf_path agregada a tabla contracts');
    await conn.end();
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ Columna contract_pdf_path ya existe');
    } else {
      console.error('❌ Error en migración:', error.message);
      process.exit(1);
    }
  }
}

migrateContractPDF();
