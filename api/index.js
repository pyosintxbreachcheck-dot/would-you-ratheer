import { chromium } from 'playwright-core';
import chromiumPkg from '@sparticuz/chromium';

export default async function handler(req, res) {
  let browser = null;

  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    
    let qid = 255;
    if (pathname.includes('/random')) {
      qid = Math.floor(Math.random() * 801) + 100;
    } else if (pathname.includes('/id/')) {
      qid = parseInt(pathname.split('/').pop()) || 255;
    }

    browser = await chromium.launch({
      args: chromiumPkg.args,
      executablePath: await chromiumPkg.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.goto(`https://wouldurather.io/?id=${qid}`, { 
      waitUntil: 'domcontentloaded', 
      timeout: 15000 
    });

    await page.waitForTimeout(2000);

    const data = await page.evaluate((id) => {
      const texts = Array.from(document.querySelectorAll('h1, h2, p, div, strong, span'))
        .map(el => el.textContent.trim())
        .filter(t => t.length > 25);

      const clean = texts.filter(t => 
        !t.includes("Would You Rather IO") && 
        !t.includes("security") && 
        !t.includes("Verification")
      );

      return {
        id: id,
        optionA: clean[0] || "Option A not found",
        optionB: clean[1] || "Option B not found"
      };
    }, qid);

    res.status(200).json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      id: qid,
      optionA: "Error",
      optionB: "Failed to scrape"
    });
  } finally {
    if (browser) await browser.close();
  }
}
