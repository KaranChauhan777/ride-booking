const express = require('express');
const app = express();
const PORT = 3000;

const drivers = [
  'http://localhost:4001',
  'http://localhost:4002',
  'http://localhost:4003',
];

app.get('/request-ride', async (req, res) => {
  console.log('\n📱 User ne ride mangi...');

  let driverStatuses = [];

  // Step 1: sabse pehle sabka status poochho (sirf padhne ke liye, lock nahi)
  for (const driverUrl of drivers) {
    try {
      const statusRes = await fetch(`${driverUrl}/status`);
      const statusData = await statusRes.json();
      if (statusData.free) {
        driverStatuses.push({ url: driverUrl, ...statusData });
      }
    } catch (err) {
      console.log(`⚠️  ${driverUrl} respond nahi kar raha`);
    }
  }

  if (driverStatuses.length === 0) {
    console.log('❌ Koi driver free nahi mila');
    return res.status(503).json({ message: 'Sorry, abhi koi driver free nahi hai' });
  }

  // Step 2: sabse zyada idle wale ko pehle try karne ke liye sort karo
  driverStatuses.sort((a, b) => a.freeSince - b.freeSince);

  // Step 3: sorted order mein ek-ek karke ATOMIC assign try karo
  // agar race mein haar gaya (koi aur pehle le gaya), agle ko try karo
  for (const driver of driverStatuses) {
    try {
      const assignRes = await fetch(`${driver.url}/assign-ride`, { method: 'POST' });
      if (assignRes.ok) {
        const assignData = await assignRes.json();
        console.log(`✅ ${assignData.driver} ko ride mili (idle priority se)`);
        return res.json({ message: `Ride assigned to ${assignData.driver}` });
      }
      console.log(`⏭️  ${driver.driver} race mein haar gaya, agla try kar rahe hain`);
    } catch (err) {
      console.log(`⚠️  ${driver.url} respond nahi kar raha`);
    }
  }

  console.log('❌ Sab busy ho gaye race mein');
  res.status(503).json({ message: 'Sorry, abhi koi driver free nahi hai' });
});

app.listen(PORT, () => {
  console.log(`Main server chal raha hai http://localhost:${PORT}`);
  console.log('Ride mangne ke liye browser mein kholo: http://localhost:3000/request-ride\n');
});