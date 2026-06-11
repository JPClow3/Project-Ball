import dotenv from "dotenv";
dotenv.config();

const adminSecret = process.env.ADMIN_SECRET || "default_secret";
const url = process.env.PUBLIC_APP_URL || "http://localhost:4321";

async function runCron() {
  console.log(`[Cron] Running leaderboard refresh at ${new Date().toISOString()}`);
  try {
    const res = await fetch(`${url}/api/leaderboard/refresh`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminSecret}`
      }
    });
    if (res.ok) {
      console.log(`[Cron] Leaderboard refresh successful`);
    } else {
      console.error(`[Cron] Leaderboard refresh failed: ${res.status}`);
    }
  } catch (err) {
    console.error(`[Cron] Error running leaderboard refresh:`, err);
  }
}

// Run every 5 minutes (300,000 ms)
setInterval(runCron, 5 * 60 * 1000);

// Run immediately on start
runCron();
