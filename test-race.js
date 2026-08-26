async function testRace() {
  console.log('Dono requests ek saath bhej rahe hain...\n');

  const [res1, res2] = await Promise.all([
    fetch('http://localhost:3000/request-ride').then(r => r.json()),
    fetch('http://localhost:3000/request-ride').then(r => r.json()),
  ]);

  console.log('Request 1 result:', res1);
  console.log('Request 2 result:', res2);
}

testRace();