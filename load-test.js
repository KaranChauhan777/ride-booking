// Load test - ek saath bahut saari requests bhejta hai aur result measure karta hai
// Chalane ka tareeka: node load-test.js [kitni requests bhejni hain]

const TOTAL_REQUESTS = parseInt(process.argv[2]) || 50;
const TARGET_URL = 'http://127.0.0.1:5000/request-ride';

async function sendOneRequest(id) {
  const start = Date.now();
  try {
    const res = await fetch(TARGET_URL);
    const data = await res.json();
    const duration = Date.now() - start;
    return { id, ok: res.ok, status: res.status, duration, message: data.message };
  } catch (err) {
    const duration = Date.now() - start;
    return { id, ok: false, status: 'ERROR', duration, message: err.message };
  }
}

async function runLoadTest() {
  console.log(`\n🚀 ${TOTAL_REQUESTS} requests ek saath bhej rahe hain...\n`);

  const startTime = Date.now();

  // sabhi requests EK SAATH fire karo (Promise.all)
  const promises = [];
  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    promises.push(sendOneRequest(i));
  }
  const results = await Promise.all(promises);

  const totalTime = Date.now() - startTime;

  // results analyze karo
  const successful = results.filter(r => r.ok);
  const failed = results.filter(r => !r.ok);
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const maxDuration = Math.max(...results.map(r => r.duration));
  const minDuration = Math.min(...results.map(r => r.duration));

  console.log('📊 RESULTS');
  console.log('─────────────────────────────────');
  console.log(`Total requests sent:     ${TOTAL_REQUESTS}`);
  console.log(`✅ Successful:            ${successful.length}`);
  console.log(`❌ Failed / rejected:     ${failed.length}`);
  console.log(`⏱️  Total time taken:      ${totalTime}ms`);
  console.log(`⏱️  Avg response time:     ${avgDuration.toFixed(0)}ms`);
  console.log(`⏱️  Fastest response:      ${minDuration}ms`);
  console.log(`⏱️  Slowest response:      ${maxDuration}ms`);
  console.log('─────────────────────────────────');

  // failed requests ka breakdown (kyun fail hui)
  if (failed.length > 0) {
    const reasons = {};
    failed.forEach(r => {
      reasons[r.message] = (reasons[r.message] || 0) + 1;
    });
    console.log('\n❌ Failure breakdown:');
    Object.entries(reasons).forEach(([reason, count]) => {
      console.log(`   ${count}x — ${reason}`);
    });
  }

  console.log('');
}

runLoadTest();