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

app.get('/request-ride', async (req, res) => {
  console.log('\n🌐 Load Balancer: request aayi');

  for (let attempt = 0; attempt < servers.length; attempt++) {
    const targetServer = servers[currentIndex];
    currentIndex = (currentIndex + 1) % servers.length;

    try {
      const response = await fetch(`${targetServer}/request-ride`);

      if (!response.ok) {
        const errData = await response.json();
        console.log(`⏭️  Load Balancer: ${targetServer} — ${errData.message}, agla try kar rahe hain`);
        continue;
      }

      const data = await response.json();
      console.log(`✅ Load Balancer: ${targetServer} ne handle kiya`);
      return res.json(data);
    } catch (err) {
      console.log(`⚠️  Load Balancer: ${targetServer} down hai, agla try kar rahe hain`);
    }
  }

  console.log('❌ Load Balancer: koi server available nahi');
  res.status(503).json({ message: 'Sorry, poora system abhi down hai' });
});

// Naya endpoint - dashboard ke liye poore system ka snapshot deta hai
app.get('/system-status', async (req, res) => {
  const driverStatuses = await Promise.all(
    drivers.map(async (d) => {
      try {
        const r = await fetch(`${d.url}/status`);
        const data = await r.json();
        return { name: d.name, free: data.free, freeSince: data.freeSince, alive: true };
      } catch (err) {
        return { name: d.name, free: false, freeSince: null, alive: false };
      }
    })
  );

  let leader = null;
  try {
    leader = await redisClient.get('main-server-leader-lock');
  } catch (err) {
    leader = null;
  }

  let totalRides = 0;
  try {
    totalRides = await redisClient.lLen('ride-history');
  } catch (err) {
    totalRides = 0;
  }

  res.json({
    leader,
    servers: ['main-server-1', 'main-server-2'],
    drivers: driverStatuses,
    totalRides,
  });
});

app.listen(PORT, () => {
  console.log(`Load Balancer chal raha hai http://localhost:${PORT}`);
  console.log('Dashboard: http://localhost:5000\n');
});