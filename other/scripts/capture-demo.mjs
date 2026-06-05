import puppeteer from "puppeteer";
import path from "path";

const OUT = "/Users/creayollc/EMAILS/mooser-web/landing/assets/ads";
const BASE = "http://localhost:3333/demo";

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });

  const views = [
    { name: "demo-inbox", setup: null },
    { name: "demo-compose", setup: async (page) => { await page.click('button >> text=COMPOSE'); } },
    { name: "demo-automations-pipes", setup: async (page) => {
      const btns = await page.$$('button');
      for (const b of btns) { const t = await b.evaluate(el => el.textContent); if (t?.includes("AUTOMATIONS")) { await b.click(); break; } }
    }},
    { name: "demo-automations-triggers", setup: async (page) => {
      const btns = await page.$$('button');
      for (const b of btns) { const t = await b.evaluate(el => el.textContent); if (t?.includes("AUTOMATIONS")) { await b.click(); break; } }
      await new Promise(r => setTimeout(r, 300));
      const tabs = await page.$$('button');
      for (const b of tabs) { const t = await b.evaluate(el => el.textContent); if (t === "TRIGGERS") { await b.click(); break; } }
    }},
    { name: "demo-contacts", setup: async (page) => {
      const btns = await page.$$('button');
      for (const b of btns) { const t = await b.evaluate(el => el.textContent); if (t?.includes("CONTACTS")) { await b.click(); break; } }
    }},
    { name: "demo-analytics", setup: async (page) => {
      const btns = await page.$$('button');
      for (const b of btns) { const t = await b.evaluate(el => el.textContent); if (t?.includes("ANALYTICS")) { await b.click(); break; } }
    }},
    { name: "demo-settings", setup: async (page) => {
      const btns = await page.$$('button');
      for (const b of btns) { const t = await b.evaluate(el => el.textContent); if (t === "SETTINGS") { await b.click(); break; } }
    }},
  ];

  for (const v of views) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(BASE, { waitUntil: "networkidle0" });
    await new Promise(r => setTimeout(r, 500));

    if (v.setup) {
      try { await v.setup(page); } catch (e) { console.error(`Setup failed for ${v.name}:`, e.message); }
      await new Promise(r => setTimeout(r, 500));
    }

    await page.screenshot({ path: path.join(OUT, `${v.name}.png`), type: "png" });
    await page.screenshot({ path: path.join(OUT, `${v.name}.jpg`), type: "jpeg", quality: 92 });
    console.log(`Captured: ${v.name}`);
    await page.close();
  }

  await browser.close();
  console.log("All demo screenshots captured.");
}

main().catch(console.error);
