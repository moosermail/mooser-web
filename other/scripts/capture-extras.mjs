import puppeteer from "puppeteer";
import path from "path";

const OUT = "/Users/creayollc/EMAILS/mooser-web/landing/assets/ads";

async function clickButton(page, text) {
  const btns = await page.$$("button");
  for (const b of btns) {
    const t = await b.evaluate(el => el.textContent);
    if (t && t.trim() === text) { await b.click(); return true; }
  }
  // Try contains match
  for (const b of btns) {
    const t = await b.evaluate(el => el.textContent);
    if (t && t.includes(text)) { await b.click(); return true; }
  }
  return false;
}

async function capture(page, name) {
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUT, `${name}.png`), type: "png" });
  await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 92 });
  console.log("Captured: " + name);
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });

  // Templates tab
  const p1 = await browser.newPage();
  await p1.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await p1.goto("http://localhost:3333/demo", { waitUntil: "networkidle0" });
  await new Promise(r => setTimeout(r, 500));
  await clickButton(p1, "AUTOMATIONS");
  await new Promise(r => setTimeout(r, 300));
  await clickButton(p1, "TEMPLATES");
  await capture(p1, "demo-automations-templates");
  await p1.close();

  // Cron tab (need to add it to demo -- for now capture triggers which we have)
  // Already have triggers screenshot

  // Settings view
  const p2 = await browser.newPage();
  await p2.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await p2.goto("http://localhost:3333/demo", { waitUntil: "networkidle0" });
  await new Promise(r => setTimeout(r, 500));
  await clickButton(p2, "SETTINGS");
  await capture(p2, "demo-settings");
  await p2.close();

  await browser.close();
}
main().catch(console.error);
