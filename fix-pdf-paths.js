import mysql from 'mysql2/promise';

async function fixPaths() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fleet_db'
  });

  await conn.execute(`UPDATE contracts SET contract_pdf_path = REPLACE(contract_pdf_path, '\', '/')`);
  
  const [rows] = await conn.execute('SELECT id, contract_number, contract_pdf_path FROM contracts WHERE contract_pdf_path IS NOT NULL');
  console.log('Updated paths:');
  console.log(JSON.stringify(rows, null, 2));
  
  await conn.end();
}

fixPaths().catch(console.error);
