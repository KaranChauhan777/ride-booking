const express = require('express');
const redisClient = require('./redis-client');
const app = express();

const PORT = 4001;
let isFree = true;
let freeSince = Date.now(); // temporary default, neeche se update hoga

// startup pe Redis se purana freeSince padhne ki koshish karo
async function loadFreeSince() {
  const saved = await redisClient.get('driver:1:freeSince');
  if (saved) {
    freeSince = parseInt(saved);
    console.log(`Driver-1: Redis se purana freeSince mila — ${new Date(freeSince).toISOString()}`);
  } else {
    console.log('Driver-1: Naya driver, fresh freeSince set kiya');
  }
}
loadFreeSince();

app.get('/status', (req, res) => {
  res.json({ driver: 'Driver-1', free: isFree, freeSince: freeSince });
});

app.post('/assign-ride', (req, res) => {
  if (!isFree) {
    return res.status(400).json({ message: 'Driver-1 already busy' });
  }
  isFree = false;
  const rideRecord = JSON.stringify({
    driver: 'Driver-1',
    assignedAt: new Date().toISOString(),
  });
  redisClient.lPush('ride-history', rideRecord);
  console.log('🚗 Driver-1: Ride assigned!');

  setTimeout(() => {
    isFree = true;
    freeSince = Date.now();
    redisClient.set('driver:1:freeSince', freeSince.toString());
    console.log('✅ Driver-1: Ride complete, ab free hoon');
  }, 5000);

  res.json({ message: 'Driver-1 accepted the ride', driver: 'Driver-1' });
});

app.listen(PORT, () => {
  console.log(`Driver-1 apna server chala raha hai port ${PORT} par`);
});