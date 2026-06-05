import puppeteer from "puppeteer";
import path from "path";

const OUT = "/Users/creayollc/EMAILS/mooser-web/landing/assets/ads";

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto("http://localhost:3333/demo", { waitUntil: "networkidle0" });
  await new Promise(r => setTimeout(r, 500));

  // Click + COMPOSE button
  const btns = await page.$$("button");
  for (const b of btns) {
    const t = await b.evaluate(el => el.textContent);
    if (t && t.includes("COMPOSE")) { await b.click(); break; }
  }
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({ path: path.join(OUT, "demo-compose.png"), type: "png" });
  await page.screenshot({ path: path.join(OUT, "demo-compose.jpg"), type: "jpeg", quality: 92 });
  console.log("Captured: compose");

  await browser.close();
}
main().catch(console.error);
