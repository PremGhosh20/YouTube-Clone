import { chromium, devices } from "playwright";

const BASE = "https://you-tube-clone-one-eosin.vercel.app";
const VIDEO_ID = "6a48bc005a1f1272f93eec8d";

const results = [];

function pass(name, detail = "") {
  results.push({ ok: true, name, detail });
}

function fail(name, detail = "") {
  results.push({ ok: false, name, detail });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices["iPhone 13"] });
const page = await context.newPage();

try {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  pass("Home loads", `title: ${await page.title()}`);

  const viewport = page.viewportSize();
  pass("Mobile viewport", `${viewport?.width}x${viewport?.height}`);

  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 2;
  });
  if (overflow) fail("No horizontal scroll on home", "page overflows viewport");
  else pass("No horizontal scroll on home");

  const menu = page.getByRole("button", { name: "Open menu" });
  if (await menu.count()) {
    await menu.click();
    await page.waitForTimeout(400);
    const drawer = page.locator("aside.fixed");
    if (await drawer.isVisible()) pass("Hamburger opens sidebar drawer");
    else fail("Hamburger opens sidebar drawer", "drawer not visible");
    const size = page.viewportSize();
    if (size) {
      await page.mouse.click(size.width - 10, size.height / 2);
    }
    await page.waitForTimeout(300);
  } else {
    fail("Hamburger menu present");
  }

  const searchLink = page.getByRole("link", { name: "Search" });
  if (await searchLink.count()) pass("Mobile search icon visible");
  else fail("Mobile search icon visible");

  await page.goto(`${BASE}/watch/${VIDEO_ID}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  pass("Watch page loads");

  const watchOverflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 2;
  });
  if (watchOverflow) fail("No horizontal scroll on watch", "page overflows viewport");
  else pass("No horizontal scroll on watch");

  const contrast = await page.evaluate(() => {
    const samples = [
      document.querySelector("h1"),
      ...Array.from(document.querySelectorAll("h3")).slice(0, 2),
      document.querySelector(".bg-muted"),
    ].filter(Boolean);

    function luminance(rgb) {
      const [r, g, b] = rgb.map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    function parseColor(color) {
      const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return null;
      return [Number(m[1]), Number(m[2]), Number(m[3])];
    }

    let bad = 0;
    for (const el of samples) {
      const style = getComputedStyle(el);
      const fg = parseColor(style.color);
      const bg = parseColor(style.backgroundColor);
      if (!fg || !bg) continue;
      const l1 = luminance(fg);
      const l2 = luminance(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      if (ratio < 3) bad += 1;
    }
    return { bad, checked: samples.length };
  });

  if (contrast.bad === 0) pass("Watch page text contrast", `checked ${contrast.checked} elements`);
  else fail("Watch page text contrast", `${contrast.bad} low-contrast elements`);

  const titleVisible = await page.locator("h1").first().isVisible();
  if (titleVisible) pass("Video title visible on watch page");
  else fail("Video title visible on watch page");
} catch (error) {
  fail("Mobile test run", error.message);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"} - ${r.name}${r.detail ? `: ${r.detail}` : ""}`);
}
console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
