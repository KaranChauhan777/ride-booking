const express = require('express');
const redisClient = require('./redis-client');
const app = express();

const PORT = 4003;
let isFree = true;
let freeSince = Date.now();

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
    console.log('✅ Driver-3: Ride complete, ab free hoon');
  }, 5000);

  res.json({ message: 'Driver-3 accepted the ride', driver: 'Driver-3' });
});

app.listen(PORT, () => {
  console.log(`Driver-3 apna server chala raha hai port ${PORT} par`);
});