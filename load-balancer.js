const express = require('express');
const redisClient = require('./redis-client');
const app = express();
const PORT = 5000;

app.use(express.static('public'));

const servers = [
  'http://localhost:3000',
  'http://localhost:3001',
];

const drivers = [
  { name: 'Driver-1', url: 'http://localhost:4001' },
  { name: 'Driver-2', url: 'http://localhost:4002' },
  { name: 'Driver-3', url: 'http://localhost:4003' },
];

let currentIndex = 0;

// ---- Rate limiter (fixed window, Redis INCR) ----
const RATE_LIMIT = 5;        // max requests
const WINDOW_SECONDS = 10;   // is window mein

async function rateLimiter(req, res, next) {
  const key = `rate:${req.ip}`;
  try {
    const count = await redisClient.incr(key);

    // expiry na ho (pehli request, ya expire set hone se pehle crash) toh set karo
    let ttl = await redisClient.ttl(key);
    if (ttl === -1) {
      await redisClient.expire(key, WINDOW_SECONDS);
      ttl = WINDOW_SECONDS;
    }

    if (count > RATE_LIMIT) {
      res.set('Retry-After', String(ttl));
      return res.status(429).json({ code: 'RATE_LIMITED', message: 'Too many requests, thodi der baad try karo' });
    }
  } catch (err) {
    // Redis down ho toh limiter bypass (fail-open), warna poora system band ho jayega
    console.log('⚠️ Rate limiter: Redis error, request allow kar rahe hain');
  }
  next();
}

app.get('/request-ride', rateLimiter, async (req, res) => {
  console.log('\n🌐 Load Balancer: request aayi');

  for (let attempt = 0; attempt < servers.length; attempt++) {
    const targetServer = servers[currentIndex];
    currentIndex = (currentIndex + 1) % servers.length;

    try {
      const response = await fetch(`${targetServer}/request-ride`);
      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Load Balancer: ${targetServer} ne handle kiya`);
        return res.json(data);
      }

      if (data.code === 'NOT_LEADER') {
        console.log(`⏭️  Load Balancer: ${targetServer} leader nahi hai, agla try kar rahe hain`);
        continue;
      }

      // leader ne jawab diya (jaise NO_DRIVERS) - ye "system down" nahi hai, seedha client ko do
      console.log(`ℹ️  Load Balancer: ${targetServer} ne reject kiya — ${data.message}`);
      return res.status(response.status).json(data);
    } catch (err) {
      console.log(`⚠️  Load Balancer: ${targetServer} down hai, agla try kar rahe hain`);
    }
  }

  console.log('❌ Load Balancer: koi leader available nahi');
  res.status(503).json({ code: 'NO_LEADER', message: 'Leader election chal raha hai, thodi der baad try karo' });
});

app.get('/request-ride', rateLimiter, async (req, res) => {
  console.log('\n🌐 Load Balancer: request aayi');

  // starting point EK BAAR fix karo (koi await nahi, isliye race nahi hoga)
  const start = currentIndex;
  currentIndex = (currentIndex + 1) % servers.length;

  for (let attempt = 0; attempt < servers.length; attempt++) {
    const targetServer = servers[(start + attempt) % servers.length];

    try {
      const response = await fetch(`${targetServer}/request-ride`);
      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Load Balancer: ${targetServer} ne handle kiya`);
        return res.json(data);
      }

      if (data.code === 'NOT_LEADER') {
        console.log(`⏭️  Load Balancer: ${targetServer} leader nahi hai, agla try kar rahe hain`);
        continue;
      }

      console.log(`ℹ️  Load Balancer: ${targetServer} ne reject kiya — ${data.message}`);
      return res.status(response.status).json(data);
    } catch (err) {
      console.log(`⚠️  Load Balancer: ${targetServer} down hai, agla try kar rahe hain`);
    }
  }

  console.log('❌ Load Balancer: koi leader available nahi');
  res.status(503).json({ code: 'NO_LEADER', message: 'Leader election chal raha hai, thodi der baad try karo' });
});