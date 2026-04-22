import asyncio
import json
import os
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig
from crawl4ai.extraction_strategy import JsonCssExtractionStrategy

# --- CONFIGURATION ---
TARGET_DOMAINS = [
    "http://Selenite.cc",
    "https://g-65j.pages.dev/projects",
    "https://fmhy.net/",
    "https://uunnblockedgames.weebly.com/bloons-tower-defense-5---works.html",
    "https://vapor.onl/",
    "https://splash.best/",
    "https://infamous.qzz.io/",
    "https://programming.writing.lecture.learning.literature.mybgarage.cl/",
    "https://chips.moktanram.com.np/g.html",
    "https://ismenirbytesm.gerenna.com/",
    "https://learn.gls-drone-pilot.com/",
    "https://daydreamx.global.ssl.fastly.net/",
    "https://dtxb.eclipsecastellon.net/",
    "https://s3.amazonaws.com/ghst/index.html",
    "https://school.agreca.com.ar/",
    "https://noterplusbunny52.b-cdn.net/",
    "https://thesymiproject.org/",
    "https://pluh.aletiatours.com/",
    "https://keoffical.oneapp.dev/",
    "https://follownirbytes-ynevj.ns8.org/",
    "https://endis.rest/",
    "https://helptired8.notinthearchives.net/",
    "https://everest.rip/",
    "https://www.korona.lat/",
    "https://play.frogiee.one/",
    "https://ubghub.org/",
    "https://pizagame.com/",
    "https://startmyeducation.top/",
    "https://byod.geeked.wtf/"
]

# Extraction Schema for Game Sites
GAME_SCHEMA = {
    "name": "Game Discovery",
    "baseSelector": ".game-card, .game-item, .game, a[href*='/game/']", # Broad selectors
    "fields": [
        {
            "name": "title",
            "selector": "h2, h3, .title, .name, p",
            "type": "text"
        },
        {
            "name": "thumbnail",
            "selector": "img",
            "type": "attribute",
            "attribute": "src"
        },
        {
            "name": "iframe_url",
            "selector": "iframe, a[href*='index.html']",
            "type": "attribute",
            "attribute": "src"
        }
    ]
}

async def crawl_site(crawler, url):
    print(f"[*] Crawling {url}...")
    try:
        config = CrawlerRunConfig(
            extraction_strategy=JsonCssExtractionStrategy(GAME_SCHEMA),
            process_iframes=True,
            remove_overlay_elements=True,
            magic=True # Bypass some simple bot detection
        )
        
        # Handle auth for specific site
        if "startmyeducation.top" in url:
            # Note: In a real script, you'd use a hook to type the password
            # This is a simplified representation
            pass

        result = await crawler.arun(url=url, config=config)
        
        if result.success:
            print(f"[+] Successfully extracted data from {url}")
            return {
                "domain": url,
                "data": json.loads(result.extracted_content),
                "screenshot": result.screenshot_path if hasattr(result, 'screenshot_path') else None
            }
        else:
            print(f"[-] Failed to crawl {url}: {result.error_message}")
            return {"domain": url, "error": result.error_message}
            
    except Exception as e:
        print(f"[!] Error processing {url}: {str(e)}")
        return {"domain": url, "error": str(e)}

async def main():
    async with AsyncWebCrawler() as crawler:
        tasks = [crawl_site(crawler, domain) for domain in TARGET_DOMAINS]
        results = await asyncio.gather(*tasks)
        
        # Save aggregated results
        with open("heist_results.json", "w") as f:
            json.dump(results, f, indent=4)
            
        print("[*] Intelligence Heist Complete. Results saved to heist_results.json")

if __name__ == "__main__":
    asyncio.run(main())
