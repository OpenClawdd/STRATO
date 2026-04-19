import os
import json
import time
from playwright.sync_api import sync_playwright

TARGETS = [
    "http://Selenite.cc", "https://g-65j.pages.dev/projects", "https://fmhy.net/", 
    "https://uunnblockedgames.weebly.com/bloons-tower-defense-5---works.html", "https://vapor.onl/", 
    "https://splash.best/", "https://infamous.qzz.io/", 
    "https://programming.writing.lecture.learning.literature.mybgarage.cl/", 
    "https://chips.moktanram.com.np/g.html", "https://ismenirbytesm.gerenna.com/", 
    "https://learn.gls-drone-pilot.com/", "https://daydreamx.global.ssl.fastly.net/", 
    "https://dtxb.eclipsecastellon.net/", "https://s3.amazonaws.com/ghst/index.html", 
    "https://school.agreca.com.ar/", "https://noterplusbunny52.b-cdn.net/", 
    "https://thesymiproject.org/", "https://pluh.aletiatours.com/", 
    "https://keoffical.oneapp.dev/", "https://follownirbytes-ynevj.ns8.org/", 
    "https://endis.rest/", "https://helptired8.notinthearchives.net/", 
    "https://everest.rip/", "https://www.korona.lat/", "https://play.frogiee.one/", 
    "https://ubghub.org/", "https://pizagame.com/", "https://startmyeducation.top/", 
    "https://byod.geeked.wtf/"
]

BATCH_SIZE = 3
EXPANSION_PACK_FILE = "public/assets/strato_expansion_pack.json"
INTEL_REPORT_FILE = "competitor_intel_report.md"

os.makedirs("public/assets/thumbnails", exist_ok=True)
os.makedirs("competitors", exist_ok=True)

def initialize_files():
    if not os.path.exists(EXPANSION_PACK_FILE):
        with open(EXPANSION_PACK_FILE, "w") as f:
            json.dump([], f)
    if not os.path.exists(INTEL_REPORT_FILE):
        with open(INTEL_REPORT_FILE, "w") as f:
            f.write("# STRATO Competitor Intelligence Report\n\n")

def append_to_json(new_data):
    with open(EXPANSION_PACK_FILE, "r") as f:
        data = json.load(f)
    data.extend(new_data)
    with open(EXPANSION_PACK_FILE, "w") as f:
        json.dump(data, f, indent=4)

def append_to_md(text):
    with open(INTEL_REPORT_FILE, "a") as f:
        f.write(text + "\n")

def run_heist():
    initialize_files()
    
    with sync_playwright() as p:
        for i in range(0, len(TARGETS), BATCH_SIZE):
            batch = TARGETS[i:i + BATCH_SIZE]
            print(f"\n--- INITIATING BATCH {i//BATCH_SIZE + 1} ---")
            
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            
            extracted_batch_data = []
            
            for url in batch:
                page = context.new_page()
                domain_name = url.split("//")[-1].split("/")[0]
                print(f"Target locked: {domain_name}")
                
                try:
                    page.goto(url, timeout=15000, wait_until="domcontentloaded")
                    time.sleep(3) 
                    
                    if "startmyeducation.top" in url:
                        print("Bypassing auth wall...")
                        page.fill("input[type='password']", "funni")
                        page.press("input[type='password']", "Enter")
                        time.sleep(3)
                    
                    screenshot_path = f"competitors/{domain_name.replace('.', '_')}.png"
                    page.screenshot(path=screenshot_path, full_page=True)
                    
                    titles = page.locator("h1, h2, h3, .game-title, .title").all_inner_texts()
                    iframes = [frame.get_attribute("src") for frame in page.locator("iframe").all()]
                    
                    page_content = page.content()
                    proxy_engine = "Unknown"
                    if "uv.config.js" in page_content or "/uv/" in page_content:
                        proxy_engine = "Ultraviolet (UV)"
                    elif "/scramjet/" in page_content or "/sj/" in page_content:
                        proxy_engine = "Scramjet"
                    elif "epoxy" in page_content or "bare-mux" in page_content:
                        proxy_engine = "Epoxy/Bare-Mux Detected"
                        
                    panic_btn = "Yes" if "panic" in page_content.lower() else "No"
                    
                    intel = f"## {domain_name}\n- **Proxy Engine**: {proxy_engine}\n- **Panic Button**: {panic_btn}\n- **Screenshot**: {screenshot_path}\n"
                    append_to_md(intel)
                    
                    extracted_batch_data.append({
                        "source": domain_name,
                        "titles_found": [t for t in titles if t.strip()][:10], 
                        "iframes_detected": [f for f in iframes if f][:10]
                    })
                    
                    print(f"Extraction complete for {domain_name}")
                    
                except Exception as e:
                    print(f"Mission failed for {domain_name} (Timeout/Blocked)")
                    append_to_md(f"## {domain_name}\n- Status: FAILED\n")
                
                finally:
                    page.close()
            
            append_to_json(extracted_batch_data)
            browser.close()
            print("Batch secured. Browser context destroyed. RAM cleared.")

if __name__ == "__main__":
    run_heist()