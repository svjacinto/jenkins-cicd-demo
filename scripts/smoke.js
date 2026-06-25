const targetUrl = process.argv[2];

if (!targetUrl) {
  console.error('Usage: node scripts/smoke.js <url>');
  process.exit(2);
}

async function runSmokeTest() {
  const response = await fetch(targetUrl, { method: 'GET' });

  if (!response.ok) {
    throw new Error(`Smoke test failed: ${targetUrl} returned ${response.status}`);
  }

  const body = await response.json();

  if (body.status !== 'UP') {
    throw new Error(`Smoke test failed: expected UP, got ${JSON.stringify(body)}`);
  }

  console.log(`Smoke test passed for ${targetUrl}`);
}

runSmokeTest().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
