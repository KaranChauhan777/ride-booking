# 🚗 Distributed Ride-Booking System

A mini Uber-like ride-booking system built from scratch to learn and demonstrate core **distributed systems concepts** — not just the theory, but working, testable implementations of each one.

Built with a "problem-first" approach: every concept below was added *because* a real bug or limitation showed up during development, not because a checklist said so.

---

## 🏗️ Architecture

```
                    ┌─────────────────┐
        User ─────► │  Load Balancer   │  (port 5000)
                    │  round-robin +   │
                    │  auto-skip dead  │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                              ▼
     ┌─────────────────┐           ┌─────────────────┐
     │  main-server-1   │           │  main-server-2   │
     │   (port 3000)    │◄─────────►│   (port 3001)    │
     │                  │  compete   │                  │
     │  LEADER or       │  for lock  │  LEADER or       │
     │  STANDBY         │            │  STANDBY         │
     └────────┬─────────┘           └────────┬─────────┘
              │                               │
              └───────────────┬───────────────┘
                               ▼
              ┌────────────────────────────────┐
              │      Driver-1 / Driver-2 / Driver-3      │
              │   (atomic lock, race-safe assign)         │
              └────────────────┬───────────────┘
                                ▼
                        ┌───────────────┐
                        │     Redis      │
                        │ • ride history │
                        │ • idle-time    │
                        │ • leader lock  │
                        └───────────────┘
```

---

## 🧠 Concepts implemented (and why)

### 1. Distributed communication
Every box in the diagram above is an **independent Node.js process** talking to the others purely over HTTP. No shared memory, no function calls across services — this is the foundation every other concept builds on.

### 2. Fault tolerance
Every network call is wrapped so that one dead service never brings down the whole request. If a driver or a main-server doesn't respond, the caller tries the next one instead of crashing.

### 3. Load balancing — two different strategies
- **Driver level:** "longest idle first" — the driver who's been free the longest gets priority, instead of always picking driver #1.
- **Main-server level:** simple round-robin between two main-servers.

### 4. Race conditions & atomic operations
**The bug that taught me the most.** Early version: the main-server *checked* if a driver was free, then made a *separate* call to assign the ride. Two simultaneous requests could both see "free" before either assignment landed — and both got the same driver.

Fix: collapsed check + lock into a single atomic step inside the driver itself (`if (!isFree) reject; else lock immediately`). The main-server now optimistically picks the best (most idle) candidate, but always confirms via one atomic call — falling back to the next candidate if it loses the race.

Verified with a script that fires two requests in parallel (`Promise.all`) — before the fix, both landed on the same driver. After the fix, they never do.

### 5. Redundancy & failover (Active-Active)
Two main-servers run simultaneously behind the load balancer. If one goes down, the load balancer detects the failed request and automatically retries on the other — no dropped requests.

### 6. Data persistence across restarts
Ride history and each driver's "idle since" timestamp are stored in **Redis**, not just in-memory variables. Restarting a driver process no longer wipes its history or resets its fairness ranking — only the truly transient state (`isFree`, mid-flight ride) lives in RAM.

### 7. Leader Election (the advanced one)
Only one main-server should be considered "primary" for future stateful responsibilities. Implemented using **Redis's atomic `SET NX EX`**:
- Every server repeatedly tries to acquire a `leader-lock` key that only one holder can hold at a time.
- The current leader sends a heartbeat every 2s to renew its lock (5s TTL).
- If the leader crashes, it stops renewing — the lock expires — and the standby (which was quietly retrying the whole time) claims leadership within seconds.
- The load balancer detects a "not leader" response (503) from the standby and transparently retries the actual leader.

**Tested live:** killed the active leader's process mid-run. Within ~5 seconds, the standby printed `👑 Main ab LEADER hoon!` and started serving requests — zero manual intervention.

---

## 🛠️ Tech stack

- **Node.js + Express** — all services (drivers, main-servers, load balancer)
- **Redis** (via Docker) — persistence + distributed locking
- **concurrently** — runs all 6 processes with a single command

---

## ▶️ Running it

```bash
# 1. Start Redis (via Docker)
docker start redis-server   # or: docker run -d --name redis-server -p 6379:6379 redis

# 2. Install dependencies
npm install

# 3. Run everything (3 drivers + 2 main-servers + load balancer)
npm start
```

Then hit: `http://localhost:5000/request-ride`

To view persisted ride history:
```bash
node view-history.js
```

To test the race condition fix directly:
```bash
node test-race.js
```

---

## 📌 What's next

- Extract idle-priority + Redis state into a cleaner shared module
- Consistent hashing for driver partitioning at larger scale
- A lightweight dashboard to visualize leader status and driver load in real time

---

*Built as a hands-on learning project to understand distributed systems by breaking things and fixing them — not by reading about them first.*