#!/usr/bin/env node
/**
 * Health check for Vercel deployment
 * Works regardless of working directory
 */

const https = require('https');
const http = require('http');

const url = 'https://tawabeer-mu.vercel.app/api/health';
const TIMEOUT = 10000; // 10 seconds

function makeRequest(urlString) {
  return new Promise((resolve, reject) => {
    const mod = urlString.startsWith('https') ? https : http;
    const req = mod.get(urlString, { headers: { 'User-Agent': 'HealthCheck/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const body = JSON.parse(data);
            resolve(body);
          } catch {
            resolve({ status: 'ok' });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(TIMEOUT, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function main() {
  try {
    const body = await makeRequest(url);
    if (body.status === 'ok') {
      console.log('OK');
      process.exit(0);
    } else {
      const failed = Object.entries(body.checks || {})
        .filter(([_, v]) => String(v).includes('❌'))
        .map(([k, v]) => `${k}=${v}`);
      console.log(`DEGRADED: ${failed.join(', ')}`);
      process.exit(1);
    }
  } catch (e) {
    console.log(`DOWN: ${e.message}`);
    process.exit(1);
  }
}

main();
