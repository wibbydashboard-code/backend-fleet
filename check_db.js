import mysql from 'mysql2/promise';

async function checkTables() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'fleet_db'
    });

    console.log('✅ Conexión a MySQL exitosa');

    const tables = ['providers', 'contracts', 'insurance_policies', 'payments'];
    for (const table of tables) {
      const [rows] = await conn.execute(`SHOW TABLES LIKE '${table}'`);
      if (rows.length > 0) {
        console.log(`✅ Tabla '${table}' existe`);
      } else {
        console.log(`❌ Tabla '${table}' NO existe - BLOQUEO`);
      }
    }

    // Check critical columns
    console.log('\nVerificando columnas críticas:');
    const criticalCols = {
      'payments': ['due_date'],
      'contracts': ['monthly_rent'],
      'insurance_policies': ['premium_amount']
    };

    for (const [table, cols] of Object.entries(criticalCols)) {
      for (const col of cols) {
        const [rows] = await conn.execute(`SHOW COLUMNS FROM ${table} LIKE '${col}'`);
        if (rows.length > 0) {
          console.log(`✅ ${table}.${col} existe`);
        } else {
          console.log(`❌ ${table}.${col} NO existe - BLOQUEO`);
        }
      }
    }

    // Check SELECT-only permissions
    const [grants] = await conn.execute("SHOW GRANTS FOR CURRENT_USER");
    console.log('\nPermisos de usuario:');
    console.log(grants[0]);

    await conn.end();
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    process.exit(1);
  }
}

checkTables();