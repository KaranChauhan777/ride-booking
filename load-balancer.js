const express = require('express');
const app = express();
const PORT = 5000;

// dono main-servers ke address
const servers = [
  'http://localhost:3000',
  'http://localhost:3001',
];

let currentIndex = 0; // round-robin ke liye - kaun agli baari hai

// yeh function check karta hai ek server zinda hai ya nahi
async function isServerAlive(serverUrl) {
  try {
    // koi bhi halka request bhej ke dekhte hain response aata hai ya nahi
    const res = await fetch(`${serverUrl}/request-ride`, { method: 'GET' });
    return true; // response aaya, matlab zinda hai
  } catch (err) {
    return false; // fetch fail hua, matlab server down hai
  }
}

app.get('/request-ride', async (req, res) => {
  console.log('\n🌐 Load Balancer: request aayi');

  // 2 baar try karenge (2 servers hain), agar dono fail toh error
  for (let attempt = 0; attempt < servers.length; attempt++) {
    const targetServer = servers[currentIndex];
    currentIndex = (currentIndex + 1) % servers.length; // agli baari ke liye round-robin

    try {
      const response = await fetch(`${targetServer}/request-ride`);
      const data = await response.json();
      console.log(`✅ Load Balancer: ${targetServer} ne handle kiya`);
      return res.json(data);
    } catch (err) {
      console.log(`⚠️  Load Balancer: ${targetServer} down hai, agla try kar rahe hain`);
    }
  }

  // agar dono main-servers hi down hain
  console.log('❌ Load Balancer: dono main-servers down hain');
  res.status(503).json({ message: 'Sorry, poora system abhi down hai' });
});

app.listen(PORT, () => {
  console.log(`Load Balancer chal raha hai http://localhost:${PORT}`);
  console.log('Yahan se ride mango: http://localhost:5000/request-ride\n');
});