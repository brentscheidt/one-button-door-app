#!/usr/bin/env node
// Simple smoke test for the One Button Door App backend.
// Usage: node scripts/smoke-test.js <ENDPOINT>
// Example: node scripts/smoke-test.js https://script.google.com/macros/s/XXXXX/exec

const fetch = require('node-fetch');

async function main() {
  const endpoint = process.argv[2];
  if (!endpoint) {
    console.error('Usage: node scripts/smoke-test.js <ENDPOINT>');
    process.exit(2);
  }

  try {
    console.log('GET', endpoint + '?mode=getPins');
    const r = await fetch(endpoint + '?mode=getPins');
    const j = await r.json();
    console.log('GET ok — received', Array.isArray(j) ? j.length + ' pins' : typeof j);

    const payload = {
      address: 'Smoke Test Address',
      lat: 33.0,
      lng: -112.0,
      status: 'Inspection',
      user: 'smoke-test@local',
      device: 'node-smoke',
      source: 'smoke-test',
      ts: new Date().toISOString()
    };

    console.log('POST log ->', payload);
    const pr = await fetch(endpoint + '?mode=log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const pj = await pr.json();
    console.log('POST response:', pj);
  } catch (err) {
    console.error('Smoke test failed:', err);
    process.exit(1);
  }
}

main();
