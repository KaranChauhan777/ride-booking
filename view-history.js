const redisClient = require('./redis-client');

async function showHistory() {
  const history = await redisClient.lRange('ride-history', 0, -1);

  console.log(`\nTotal rides recorded: ${history.length}\n`);

  history.forEach((record, index) => {
    const ride = JSON.parse(record);
    console.log(`${index + 1}. ${ride.driver} — ${ride.assignedAt}`);
  });

  process.exit();
}

showHistory();