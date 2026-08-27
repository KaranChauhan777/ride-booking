const redisClient = require('./redis-client');

// yeh batao ki tum kaun ho - command line se naam lenge
// chalane ka tareeka: node leader-election.js Server-A
const MY_NAME = process.argv[2] || 'Unknown';
const LOCK_KEY = 'leader-lock';
const LOCK_TTL_SECONDS = 5; // agar leader 5 sec mein renew na kare, lock expire

let isLeader = false;

async function tryBecomeLeader() {
  // SET with NX (only if not exists) and EX (auto-expire) - yeh ek hi atomic step hai
  const result = await redisClient.set(LOCK_KEY, MY_NAME, {
    NX: true,
    EX: LOCK_TTL_SECONDS,
  });

  if (result === 'OK') {
    // maine lock le liya, main Leader hoon
    if (!isLeader) {
      console.log(`👑 ${MY_NAME}: Main ab LEADER hoon!`);
    }
    isLeader = true;
  } else {
    // kisi aur ne pehle se lock liya hua hai
    if (isLeader) {
      console.log(`❌ ${MY_NAME}: Maine leadership khoi (lock kisi aur ne le liya)`);
    }
    isLeader = false;

    // dekhte hain abhi kaun leader hai (sirf info ke liye)
    const currentLeader = await redisClient.get(LOCK_KEY);
    console.log(`   ${MY_NAME}: abhi ${currentLeader} Leader hai, main STANDBY hoon`);
  }
}

async function renewLeadership() {
  // agar main Leader hoon, apna lock renew karo (taaki expire na ho)
  if (isLeader) {
    // EXPIRE command se sirf TTL reset kar dete hain
    await redisClient.expire(LOCK_KEY, LOCK_TTL_SECONDS);
    console.log(`💓 ${MY_NAME}: Leadership renew ki (heartbeat)`);
  }
}

async function loop() {
  while (true) {
    if (isLeader) {
      await renewLeadership();
    } else {
      await tryBecomeLeader();
    }
    // 2 second wait, phir dobara try/renew karo
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

console.log(`${MY_NAME} shuru ho raha hai, Leader banne ki koshish karega...`);
loop();