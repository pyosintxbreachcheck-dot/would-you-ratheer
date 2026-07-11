import { chromium } from 'playwright-core';
import chromiumPkg from '@sparticuz/chromium';
import Fastify from 'fastify';

const fastify = Fastify({ logger: true });

async function scrapeQuestion(qid) {
  let browser = null;
  try {
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

    await page.waitForTimeout(2500);

    const result = await page.evaluate((id) => {
      const texts = Array.from(document.querySelectorAll('h1, h2, p, div, strong, span'))
        .map(el => el.textContent.trim())
        .filter(t => t.length > 25);

      const clean = texts.filter(t =>
        !t.includes("Would You Rather IO") &&
        !t.includes("security") &&
        !t.includes("Verification") &&
        !t.includes("Add your question below")
      );

      return {
        id: id,
        optionA: clean[0] || "Option A not found",
        optionB: clean[1] || "Option B not found"
      };
    }, qid);

    return result;

  } catch (error) {
    console.error(error);
    return {
      id: qid,
      optionA: "Error",
      optionB: error.message.slice(0, 100)
    };
  } finally {
    if (browser) await browser.close();
  }
}

// Random Question
fastify.get('/api/random', async (request, reply) => {
  const qid = Math.floor(Math.random() * (900 - 100 + 1)) + 100;
  const data = await scrapeQuestion(qid);
  return data;
});

// By ID
fastify.get('/api/id/:id', async (request, reply) => {
  const id = parseInt(request.params.id);
  const data = await scrapeQuestion(id);
  return data;
});

fastify.get('/', async () => {
  return { message: "Would You Rather API Running ✅" };
});

// Vercel ke liye export
export default async function handler(req, res) {
  await fastify.ready();
  fastify.server.emit('request', req, res);
}
