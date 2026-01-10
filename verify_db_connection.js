import dotenv from 'dotenv';
import { getStats } from './repository.js';
import path from 'path';

// Force load .env.production for verification
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });

console.log('--- DB Connection Verification ---');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('SSL Mode:', (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') ? 'Enabled (rejectUnauthorized: false)' : 'Disabled');

async function verify() {
    try {
        console.log('Attempting to fetch stats...');
        const stats = await getStats();
        console.log('✅ Connection Successful!');
        console.log('Stats received:', stats);
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection Failed:', error.message);
        if (error.code) console.error('Error Code:', error.code);
        process.exit(1);
    }
}

verify();
