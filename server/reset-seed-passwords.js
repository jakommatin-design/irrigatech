/**
 * IRRIGA-TECH — Seed Password Reset Script
 * Sets known passwords on the three demo seed accounts.
 * Run once: node reset-seed-passwords.js
 */
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const SEED_ACCOUNTS = [
  { id: 'user-01', email: 'john@irrigatech.io',  password: 'Farmer@2026' },
  { id: 'user-02', email: 'sarah@irrigatech.io', password: 'Farmer@2026' },
  { id: 'user-03', email: 'david@irrigatech.io', password: 'Farmer@2026' },
];

console.log('\n🔑 Irriga-Tech — Seed Account Password Reset\n');

for (const account of SEED_ACCOUNTS) {
  const hash = await bcrypt.hash(account.password, 10);
  db.updateUser(account.id, { password_hash: hash });
  console.log(`✅  ${account.email}  →  password set to "${account.password}"`);
}

console.log('\n✔  All seed account passwords updated. You can now log in.\n');
