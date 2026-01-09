#!/usr/bin/env node

import 'dotenv/config';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fleet_db',
  port: process.env.DB_PORT || 3306,
  connectTimeout: 60000,
  ssl: (process.env.RENDER || process.env.NODE_ENV === 'production')
    ? { 
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      }
    : false
};

async function testConnection() {
  console.log('🔍 Probando conexión a MySQL...');
  console.log('Host:', dbConfig.host);
  console.log('User:', dbConfig.user);
  console.log('Database:', dbConfig.database);
  console.log('SSL:', !!dbConfig.ssl);
  console.log('');

  try {
    const conn = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión exitosa!');
    
    // Test query
    const [rows] = await conn.execute('SELECT COUNT(*) as count FROM units');
    console.log('📊 Unidades en BD:', rows[0].count);
    
    const [rows2] = await conn.execute('SELECT COUNT(*) as count FROM contracts');
    console.log('📋 Contratos en BD:', rows2[0].count);
    
    await conn.end();
    console.log('\n✅ Todo correcto! La conexión a MySQL funciona.');
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    console.error('\nCódigos de error comunes:');
    console.error('- ECONNREFUSED: Host incorrecto o firewall');
    console.error('- ACCESS_DENIED: Usuario/contraseña incorrectos');
    console.error('- EPROTO: Error SSL/TLS');
    console.error('- ER_DBACCESS_DENIED_ERROR: Usuario sin permisos en BD');
    console.error('\nVerifica las variables de entorno en tu archivo .env');
    process.exit(1);
  }
}

testConnection();
