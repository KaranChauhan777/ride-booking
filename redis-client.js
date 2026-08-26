const { createClient } = require('redis');

const client = createClient(); // default: localhost:6379

client.on('error', (err) => console.log('Redis Error:', err));

client.connect();

module.exports = client;