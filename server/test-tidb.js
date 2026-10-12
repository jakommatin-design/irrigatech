import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function testConnection() {
  console.log('Connecting to TiDB Cloud...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.TIDB_HOST || 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
      port: parseInt(process.env.TIDB_PORT || '4000', 10),
      user: process.env.TIDB_USER,
      password: process.env.TIDB_PASSWORD,
      database: process.env.TIDB_DATABASE || 'irrigatech',
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
      }
    });

    console.log('✅ Successfully connected to TiDB Cloud!');
    const [rows] = await connection.query('SELECT VERSION() as version, DATABASE() as db, NOW() as server_time');
    console.log('TiDB Server Info:', rows[0]);
    
    await connection.end();
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  }
}

testConnection();
