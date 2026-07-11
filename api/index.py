from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random
import asyncio
from playwright.async_api import async_playwright

app = FastAPI(title="Would You Rather API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

async def scrape_question(qid: int):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = await context.new_page()
        
        try:
            await page.goto(f"https://wouldurather.io/?id={qid}", 
                          wait_until="domcontentloaded", 
                          timeout=20000)
            
            await asyncio.sleep(3)
            
            result = await page.evaluate("""() => {
                const texts = Array.from(document.querySelectorAll('h1, h2, p, div, strong, span'))
                    .map(el => el.textContent.trim())
                    .filter(t => t.length > 25);
                
                // Remove unwanted text
                const clean = texts.filter(t => 
                    !t.includes("Would You Rather IO") && 
                    !t.includes("security") && 
                    !t.includes("Verification") &&
                    !t.includes("Add your question below")
                );
                
                return {
                    id: """ + str(qid) + """,
                    optionA: clean[0] || "Option A not found",
                    optionB: clean[1] || "Option B not found"
                };
            }""")
            
            await browser.close()
            return result
            
        except Exception as e:
            await browser.close()
            return {"id": qid, "optionA": "Error", "optionB": str(e)[:80]}

@app.get("/api/random")
async def get_random():
    qid = random.randint(100, 900)
    return await scrape_question(qid)

@app.get("/api/id/{id}")
async def get_by_id(id: int):
    return await scrape_question(id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
# For Vercel Serverless
handler = app
