const BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    return true;
  } catch (e) {
    console.error(`FAIL: ${name} —`, e.message);
    return false;
  }
}

let passed = 0;
let total = 0;

async function run() {
  total++;
  if (
    await check("GET /video/getall", async () => {
      const r = await fetch(`${BASE}/video/getall?page=1&limit=1`);
      if (!r.ok) throw new Error(`status ${r.status}`);
    })
  )
    passed++;

  total++;
  if (
    await check("POST /download/video requires auth (401)", async () => {
      const r = await fetch(`${BASE}/download/video/507f1f77bcf86cd799439011`, {
        method: "POST",
      });
      if (r.status !== 401) throw new Error(`expected 401, got ${r.status}`);
    })
  )
    passed++;

  total++;
  if (
    await check("POST /payment/create-order requires auth (401)", async () => {
      const r = await fetch(`${BASE}/payment/create-order`, { method: "POST" });
      if (r.status !== 401) throw new Error(`expected 401, got ${r.status}`);
    })
  )
    passed++;

  total++;
  if (
    await check("GET /payment/plans returns 3 plans", async () => {
      const r = await fetch(`${BASE}/payment/plans`);
      if (!r.ok) throw new Error(`status ${r.status}`);
      const data = await r.json();
      if (!Array.isArray(data.plans) || data.plans.length !== 3) {
        throw new Error(`expected 3 plans, got ${data.plans?.length}`);
      }
      const monthly = data.plans.find((p) => p.id === "monthly");
      if (!monthly?.amountInr) throw new Error("monthly plan missing amountInr");
    })
  )
    passed++;

  total++;
  if (
    await check("GET /payment/watch-plans returns bronze/silver/gold", async () => {
      const r = await fetch(`${BASE}/payment/watch-plans`);
      if (!r.ok) throw new Error(`status ${r.status}`);
      const data = await r.json();
      if (!Array.isArray(data.plans) || data.plans.length !== 3) {
        throw new Error(`expected 3 watch plans, got ${data.plans?.length}`);
      }
      const gold = data.plans.find((p) => p.id === "gold");
      if (!gold?.unlimited) throw new Error("gold plan should be unlimited");
    })
  )
    passed++;

  total++;
  if (
    await check("GET /watchtime/status returns free tier for guests", async () => {
      const r = await fetch(`${BASE}/watchtime/status`);
      if (!r.ok) throw new Error(`status ${r.status}`);
      const data = await r.json();
      if (data.tier !== "free" || data.limitSeconds !== 300) {
        throw new Error(`expected free/300s, got ${data.tier}/${data.limitSeconds}`);
      }
    })
  )
    passed++;

  total++;
  if (
    await check("POST /payment/watch/create-order requires auth (401)", async () => {
      const r = await fetch(`${BASE}/payment/watch/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "bronze" }),
      });
      if (r.status !== 401) throw new Error(`expected 401, got ${r.status}`);
    })
  )
    passed++;

  total++;
  if (
    await check("GET /context/appearance returns theme", async () => {
      const r = await fetch(`${BASE}/context/appearance`);
      if (!r.ok) throw new Error(`status ${r.status}`);
      const data = await r.json();
      if (!["light", "dark"].includes(data.theme)) {
        throw new Error(`invalid theme ${data.theme}`);
      }
    })
  )
    passed++;

  total++;
  if (
    await check("GET /comment/languages returns list", async () => {
      const r = await fetch(`${BASE}/comment/languages`);
      if (!r.ok) throw new Error(`status ${r.status}`);
      const data = await r.json();
      if (!Array.isArray(data.languages) || data.languages.length < 3) {
        throw new Error("expected languages array");
      }
    })
  )
    passed++;

  console.log(`\n${passed}/${total} API route checks passed`);
  process.exit(passed === total ? 0 : 1);
}

run();
