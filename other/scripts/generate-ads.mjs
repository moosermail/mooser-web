import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const OUT = "/Users/creayollc/EMAILS/mooser-web/landing/assets/ads";
const APP = "https://app.mooser.email";
const LOGO_PATH = "/Users/creayollc/EMAILS/mooser-web/app/public/logo.png";

// Brand palette (from globals.css dark theme)
const B = {
  bg: "#0a0a0a",
  bgLight: "#111111",
  card: "#171717",
  fg: "#f2f2f2",
  text: "#ededed",
  textMuted: "rgba(237,237,237,0.45)",
  grey: "#888888",
  mid: "#2a2a2a",
  accent: "#f59e0b", // gold theme
  accentGlow: "rgba(245,158,11,0.15)",
  danger: "#e53e3e",
  success: "#38a169",
  border: "rgba(255,255,255,0.08)",
};

const logoBase64 = fs.readFileSync(LOGO_PATH).toString("base64");
const logoDataUrl = `data:image/png;base64,${logoBase64}`;

fs.mkdirSync(OUT, { recursive: true });

// Shared HTML components
const noise = `<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;opacity:0.035;"><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#grain)"/></svg>`;

const dotGrid = `<div style="position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,0.06) 1px,transparent 1px);background-size:24px 24px;mask-image:radial-gradient(ellipse 60% 50% at 50% 40%,black 20%,transparent 70%);-webkit-mask-image:radial-gradient(ellipse 60% 50% at 50% 40%,black 20%,transparent 70%);pointer-events:none;"></div>`;

const ambientGlow = `<div style="position:absolute;top:-120px;left:50%;width:600px;height:400px;transform:translateX(-50%);background:radial-gradient(ellipse,rgba(245,158,11,0.12) 0%,transparent 70%);pointer-events:none;"></div>`;

const shadow = "0 1px 2px rgba(0,0,0,0.08),0 4px 8px rgba(0,0,0,0.08),0 12px 24px rgba(0,0,0,0.12),0 24px 48px rgba(0,0,0,0.16),0 48px 96px rgba(0,0,0,0.2)";

function badge(label, value) {
  return `<div style="background:rgba(255,255,255,0.06);backdrop-filter:blur(16px);border:1px solid ${B.border};border-radius:12px;padding:11px 14px;text-align:center;flex:1;">
    <div style="font-size:10px;font-weight:500;color:${B.textMuted};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;font-family:'Space Grotesk',sans-serif;">${label}</div>
    <div style="font-size:13px;font-weight:600;color:${B.text};letter-spacing:-0.01em;font-family:'Space Grotesk',sans-serif;">${value}</div>
  </div>`;
}

function ctaPill(text) {
  return `<div style="display:inline-flex;align-items:center;gap:6px;background:${B.accent};color:#1a1200;font-size:13px;font-weight:600;padding:10px 24px;border-radius:999px;letter-spacing:-0.01em;font-family:'Space Grotesk',sans-serif;">${text} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg></div>`;
}

function logoBlock() {
  return `<div style="display:flex;align-items:center;gap:10px;">
    <img src="${logoDataUrl}" width="28" height="28" style="border-radius:6px;" />
    <span style="font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:0.08em;color:${B.accent};">MOOSERMAIL</span>
  </div>`;
}

// Mock inbox UI
function inboxMock() {
  const emails = [
    { from: "Sarah Chen", subject: "Q4 Report ready for review", time: "2:34 PM", unread: true, pinned: true },
    { from: "Bob Martinez", subject: "Re: API integration timeline", time: "1:15 PM", unread: true, flagged: true },
    { from: "Alice Johnson", subject: "New deployment notification", time: "11:42 AM", unread: false },
    { from: "Dev Team", subject: "CI/CD pipeline update", time: "9:18 AM", unread: false },
    { from: "Jane Park", subject: "Design review feedback", time: "Yesterday", unread: true },
  ];

  const rows = emails.map(e => `
    <div style="display:flex;align-items:center;padding:10px 14px;border-bottom:1px solid ${B.mid};gap:8px;">
      ${e.unread ? `<div style="width:6px;height:6px;border-radius:50%;background:${B.accent};flex-shrink:0;"></div>` : '<div style="width:6px;flex-shrink:0;"></div>'}
      <div style="flex:1;min-width:0;">
        <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
          <span style="font-size:12px;font-weight:${e.unread ? 700 : 400};color:${B.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.from}</span>
          <span style="font-size:10px;color:${B.grey};flex-shrink:0;margin-left:8px;">${e.time}</span>
        </div>
        <div style="font-size:11px;color:${B.grey};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:${e.unread ? 600 : 400};">${e.subject}</div>
      </div>
    </div>
  `).join("");

  return `
    <div style="width:380px;background:${B.card};border-radius:14px;border:1px solid ${B.border};box-shadow:${shadow};overflow:hidden;position:relative;z-index:3;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid ${B.mid};">
        <div style="display:flex;align-items:center;gap:8px;">
          <img src="${logoDataUrl}" width="20" height="20" style="border-radius:4px;" />
          <span style="font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:0.08em;color:${B.text};">INBOX</span>
          <span style="font-size:9px;padding:2px 7px;border-radius:100px;background:${B.accent};color:#1a1200;font-family:'Bebas Neue',sans-serif;letter-spacing:0.06em;">3 NEW</span>
        </div>
        <div style="display:flex;gap:4px;">
          <div style="font-size:9px;padding:3px 8px;border-radius:4px;background:${B.mid};color:${B.grey};font-family:'Bebas Neue',sans-serif;letter-spacing:0.06em;">ALL</div>
          <div style="font-size:9px;padding:3px 8px;border-radius:4px;background:transparent;color:${B.grey};font-family:'Bebas Neue',sans-serif;letter-spacing:0.06em;">FLAGGED</div>
        </div>
      </div>
      ${rows}
    </div>`;
}

// Generate hero ad (square)
function heroSquare() {
  return `<!DOCTYPE html><html><head>
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head><body style="margin:0;padding:0;width:1200px;height:1200px;overflow:hidden;">
    <div style="width:1200px;height:1200px;background:linear-gradient(160deg,${B.bg} 0%,${B.bgLight} 35%,${B.bg} 65%,${B.bgLight} 100%);position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px;">
      ${ambientGlow}
      ${dotGrid}
      ${noise}

      <div style="position:relative;z-index:3;display:flex;flex-direction:column;align-items:center;text-align:center;">
        ${logoBlock()}

        <h1 style="font-family:'Bebas Neue',sans-serif;font-size:64px;font-weight:400;color:${B.text};letter-spacing:-0.02em;line-height:1.05;margin:28px 0 12px;max-width:700px;">
          THE MISSING <em style="color:${B.accent};font-style:italic;">INBOX</em> FOR RESEND
        </h1>

        <p style="font-family:'Space Grotesk',sans-serif;font-size:16px;color:${B.textMuted};margin-bottom:32px;letter-spacing:0.02em;">
          Read, reply, compose. Templates, triggers, cron, pipes. Free forever.
        </p>

        <div style="position:relative;">
          <div style="position:absolute;width:500px;height:240px;left:50%;top:50%;transform:translate(-50%,-40%);background:radial-gradient(ellipse,${B.accentGlow} 0%,transparent 70%);filter:blur(40px);pointer-events:none;z-index:0;"></div>
          ${inboxMock()}
        </div>

        <div style="display:flex;gap:8px;margin-top:28px;">
          ${badge("PRICE", "$0 FOREVER")}
          ${badge("TEMPLATES", "{{VARIABLES}}")}
          ${badge("MCP", "12 AI TOOLS")}
          ${badge("PIPES", "AUTO-PROCESS")}
        </div>
      </div>
    </div>
  </body></html>`;
}

// Landscape ad
function heroLandscape() {
  return `<!DOCTYPE html><html><head>
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head><body style="margin:0;padding:0;width:1200px;height:628px;overflow:hidden;">
    <div style="width:1200px;height:628px;background:linear-gradient(160deg,${B.bg} 0%,${B.bgLight} 35%,${B.bg} 65%,${B.bgLight} 100%);position:relative;display:flex;align-items:center;padding:0 60px;gap:40px;">
      ${ambientGlow}
      ${dotGrid}
      ${noise}

      <div style="flex:1;position:relative;z-index:3;">
        ${logoBlock()}
        <h1 style="font-family:'Bebas Neue',sans-serif;font-size:52px;font-weight:400;color:${B.text};letter-spacing:-0.02em;line-height:1.05;margin:20px 0 12px;">
          THE MISSING<br /><em style="color:${B.accent};font-style:italic;">INBOX</em> FOR RESEND
        </h1>
        <p style="font-family:'Space Grotesk',sans-serif;font-size:14px;color:${B.textMuted};margin-bottom:24px;">
          Read, reply, compose. Templates, triggers, cron, pipes. Free forever.
        </p>
        ${ctaPill("CREATE FREE ACCOUNT")}
      </div>

      <div style="position:relative;z-index:3;">
        <div style="position:absolute;width:440px;height:220px;left:50%;top:50%;transform:translate(-50%,-40%);background:radial-gradient(ellipse,${B.accentGlow} 0%,transparent 70%);filter:blur(40px);pointer-events:none;"></div>
        ${inboxMock()}
      </div>
    </div>
  </body></html>`;
}

// OG Image
function ogImage() {
  return `<!DOCTYPE html><html><head>
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head><body style="margin:0;padding:0;width:1200px;height:630px;overflow:hidden;">
    <div style="width:1200px;height:630px;background:linear-gradient(160deg,${B.bg} 0%,${B.bgLight} 50%,${B.bg} 100%);position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;">
      ${ambientGlow}
      ${dotGrid}
      ${noise}
      <div style="position:relative;z-index:3;text-align:center;">
        <img src="${logoDataUrl}" width="64" height="64" style="border-radius:12px;margin-bottom:20px;" />
        <h1 style="font-family:'Bebas Neue',sans-serif;font-size:72px;font-weight:400;color:${B.text};letter-spacing:-0.01em;line-height:1;">MOOSERMAIL</h1>
        <p style="font-family:'Space Grotesk',sans-serif;font-size:20px;color:${B.textMuted};margin-top:8px;">The missing inbox for Resend. Free forever.</p>
      </div>
    </div>
  </body></html>`;
}

// Feature ad: Automations
function automationsAd() {
  const pipeRows = [
    { name: "Forward support", match: "from:support", action: "Forward to team@co.com", on: true },
    { name: "Slack alerts", match: "subj:urgent", action: "Webhook to Slack", on: true },
    { name: "Auto-reply sales", match: "subj:pricing", action: "Reply with template", on: true },
    { name: "Hide newsletters", match: "from:newsletter", action: "Auto-hide", on: false },
  ];

  const rows = pipeRows.map(p => `
    <div style="display:flex;align-items:center;padding:9px 14px;border-bottom:1px solid ${B.mid};gap:8px;">
      <div style="width:6px;height:6px;border-radius:50%;background:${p.on ? B.success : B.grey};flex-shrink:0;"></div>
      <div style="flex:1;">
        <div style="font-size:12px;font-weight:600;color:${B.text};">${p.name}</div>
        <div style="font-size:10px;color:${B.grey};">${p.match} -> ${p.action}</div>
      </div>
    </div>`).join("");

  const mock = `<div style="width:380px;background:${B.card};border-radius:14px;border:1px solid ${B.border};box-shadow:${shadow};overflow:hidden;position:relative;z-index:3;">
    <div style="padding:12px 14px;border-bottom:1px solid ${B.mid};display:flex;align-items:center;gap:8px;">
      <span style="font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:0.08em;color:${B.text};">AUTOMATIONS</span>
      <div style="display:flex;gap:4px;margin-left:auto;">
        <div style="font-size:9px;padding:3px 8px;border-radius:4px;background:${B.mid};color:${B.text};font-family:'Bebas Neue',sans-serif;">PIPES</div>
        <div style="font-size:9px;padding:3px 8px;border-radius:4px;color:${B.grey};font-family:'Bebas Neue',sans-serif;">TRIGGERS</div>
        <div style="font-size:9px;padding:3px 8px;border-radius:4px;color:${B.grey};font-family:'Bebas Neue',sans-serif;">CRON</div>
      </div>
    </div>
    ${rows}
  </div>`;

  return `<!DOCTYPE html><html><head>
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head><body style="margin:0;padding:0;width:1200px;height:1200px;overflow:hidden;">
    <div style="width:1200px;height:1200px;background:linear-gradient(160deg,${B.bg} 0%,${B.bgLight} 35%,${B.bg} 65%,${B.bgLight} 100%);position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px;">
      ${ambientGlow} ${dotGrid} ${noise}
      <div style="position:relative;z-index:3;display:flex;flex-direction:column;align-items:center;text-align:center;">
        ${logoBlock()}
        <h1 style="font-family:'Bebas Neue',sans-serif;font-size:58px;font-weight:400;color:${B.text};letter-spacing:-0.02em;line-height:1.05;margin:28px 0 12px;">
          YOUR INBOX ON <em style="color:${B.accent};font-style:italic;">AUTOPILOT</em>
        </h1>
        <p style="font-family:'Space Grotesk',sans-serif;font-size:16px;color:${B.textMuted};margin-bottom:32px;">
          Pipes auto-process every email. Webhook, forward, reply, tag, or hide.
        </p>
        <div style="position:relative;">
          <div style="position:absolute;width:500px;height:240px;left:50%;top:50%;transform:translate(-50%,-40%);background:radial-gradient(ellipse,${B.accentGlow} 0%,transparent 70%);filter:blur(40px);pointer-events:none;"></div>
          ${mock}
        </div>
        <div style="display:flex;gap:8px;margin-top:28px;">
          ${badge("PIPES", "AUTO-PROCESS")}
          ${badge("TRIGGERS", "ONE-URL API")}
          ${badge("CRON", "SCHEDULED")}
          ${badge("MCP", "AI AGENTS")}
        </div>
      </div>
    </div>
  </body></html>`;
}

// Render all ads
async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });

  const ads = [
    { name: "hero-square", html: heroSquare(), w: 1200, h: 1200 },
    { name: "hero-landscape", html: heroLandscape(), w: 1200, h: 628 },
    { name: "og-image", html: ogImage(), w: 1200, h: 630 },
    { name: "automations-square", html: automationsAd(), w: 1200, h: 1200 },
  ];

  for (const ad of ads) {
    const page = await browser.newPage();
    await page.setViewport({ width: ad.w, height: ad.h, deviceScaleFactor: 2 });
    await page.setContent(ad.html, { waitUntil: "networkidle0" });
    await new Promise(r => setTimeout(r, 1000)); // wait for fonts

    const pngPath = path.join(OUT, `${ad.name}.png`);
    const jpgPath = path.join(OUT, `${ad.name}.jpg`);
    await page.screenshot({ path: pngPath, type: "png" });
    await page.screenshot({ path: jpgPath, type: "jpeg", quality: 90 });
    console.log(`Generated: ${ad.name} (${ad.w}x${ad.h})`);
    await page.close();
  }

  // Now capture real screenshots of the live app
  console.log("\nCapturing live app screenshots...");

  // Login first
  const loginPage = await browser.newPage();
  await loginPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await loginPage.goto(`${APP}/login`, { waitUntil: "networkidle0" });

  // Take login screenshot
  await loginPage.screenshot({ path: path.join(OUT, "screenshot-login.png"), type: "png" });
  console.log("Captured: login");

  // Take landing page screenshots
  const landingPage = await browser.newPage();
  await landingPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await landingPage.goto("https://mooser.email", { waitUntil: "networkidle0" });
  await landingPage.screenshot({ path: path.join(OUT, "screenshot-landing-hero.png"), type: "png" });
  console.log("Captured: landing hero");

  // Scroll to features
  await landingPage.evaluate(() => window.scrollBy(0, 1200));
  await new Promise(r => setTimeout(r, 500));
  await landingPage.screenshot({ path: path.join(OUT, "screenshot-landing-features.png"), type: "png" });
  console.log("Captured: landing features");

  // Scroll to pricing
  await landingPage.evaluate(() => window.scrollBy(0, 1200));
  await new Promise(r => setTimeout(r, 500));
  await landingPage.screenshot({ path: path.join(OUT, "screenshot-landing-pricing.png"), type: "png" });
  console.log("Captured: landing pricing");

  await browser.close();
  console.log(`\nAll ads and screenshots saved to ${OUT}`);
}

main().catch(console.error);
