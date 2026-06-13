/**
 * Force-update ALL shop passwords to known correct values.
 * Run: node fix_passwords.js
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const http = require('http');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

async function fixAllPasswords() {
  if (!DATABASE_URL) {
    console.error('❌ No DATABASE_URL found');
    process.exit(1);
  }
  
  const sql = neon(DATABASE_URL);
  
  // ALL known passwords — force update
  const fixes = [
    { phone: '01012345678', password: 'mohamed123', name: 'مطعم الضيافة' },
    { phone: '01017603874', password: 'mohamed123', name: 'HASA/altyp' },
    { phone: '01112891062', password: 'asmaa123',  name: '????/As' },
    { phone: '01101489119', password: 'asmaa123',  name: 'Asmaa' },
    { phone: '01000000000', password: 'changeme123', name: 'عيادة د. أحمد' },
    { phone: '2',           password: 'test123',  name: '٢' },
  ];
  
  console.log('🔧 Force-updating ALL passwords...\n');
  
  for (const fix of fixes) {
    const hash = await bcrypt.hash(fix.password, 12);
    await sql`UPDATE shops SET owner_password = ${hash} WHERE owner_phone = ${fix.phone}`;
    const ok = await bcrypt.compare(fix.password, hash);
    console.log(`  ${fix.name.padEnd(20)} | ${fix.phone.padEnd(15)} | pw='${fix.password}' | hash=${ok ? '✅ verified' : '❌ FAILED'}`);
  }
  
  // Verify ALL shops
  console.log('\n📋 Verification — all shops:');
  const shops = await sql`SELECT name, owner_phone, owner_password FROM shops ORDER BY name`;
  for (const s of shops) {
    const pw = s.owner_password || '';
    const isBcrypt = pw.startsWith('$2') && pw.length > 50;
    console.log(`  ${s.name.padEnd(20)} | ${s.owner_phone.padEnd(15)} | ${isBcrypt ? '✅ bcrypt' : '❌ NOT bcrypt'} (len=${pw.length})`);
  }
  
  // Test login
  console.log('\n🔐 Testing login...');
  for (const fix of fixes) {
    await new Promise((resolve) => {
      const body = JSON.stringify({ phone: fix.phone, password: fix.password });
      const req = http.request('http://localhost:3004/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          const ok = res.statusCode === 200;
          console.log(`  ${fix.name.padEnd(20)} | ${ok ? '✅ Login OK' : `❌ Login FAIL (${res.statusCode})`}`);
          resolve();
        });
      });
      req.on('error', (e) => { console.log(`  ${fix.name.padEnd(20)} | ❌ ${e.message}`); resolve(); });
      req.write(body);
      req.end();
    });
  }
  
  console.log('\n🏁 Done!');
}

fixAllPasswords().catch(e => { console.error('❌', e); process.exit(1); });
