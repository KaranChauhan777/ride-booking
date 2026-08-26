const express = require('express');
const redisClient = require('./redis-client');
const app = express();

const PORT = 4003;
let isFree = true;
let freeSince = Date.now(); // temporary default, neeche se update hoga

// startup pe Redis se purana freeSince padhne ki koshish karo
async function loadFreeSince() {
  const saved = await redisClient.get('driver:3:freeSince');
  if (saved) {
    freeSince = parseInt(saved);
    console.log(`Driver-3: Redis se purana freeSince mila — ${new Date(freeSince).toISOString()}`);
  } else {
    console.log('Driver-3: Naya driver, fresh freeSince set kiya');
  }
}
loadFreeSince();

app.get('/status', (req, res) => {
  res.json({ driver: 'Driver-3', free: isFree, freeSince: freeSince });
});

app.post('/assign-ride', (req, res) => {
  if (!isFree) {
    return res.status(400).json({ message: 'Driver-3 already busy' });
  }
  isFree = false;
  const rideRecord = JSON.stringify({
  driver: 'Driver-3',
  assignedAt: new Date().toISOString(),
});
redisClient.lPush('ride-history', rideRecord);
  console.log('🚗 Driver-3: Ride assigned!');

  setTimeout(() => {
  isFree = true;
  freeSince = Date.now();
  redisClient.set('driver:3:freeSince', freeSince.toString()); // Redis mein bhi save karo
  console.log('✅ Driver-3: Ride complete, ab free hoon');
}, 5000);

  res.json({ message: 'Driver-3 accepted the ride', driver: 'Driver-3' });
});

app.listen(PORT, () => {
  console.log(`Driver-3 apna server chala raha hai port ${PORT} par`);
});