from playwright.sync_api import sync_playwright
import time
import os

def run():
    # Make sure we use the right URL path format
    file_url = f"file://{os.path.abspath('public/benchmark.html')}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        print(f"Navigating to {file_url}")
        page.goto(file_url)

        # Wait for benchmark to complete
        print("Waiting for benchmark to finish...")
        for _ in range(30):
            result = page.evaluate("window.benchmarkResults")
            if result:
                print(f"\nResults: {result}")
                seq = result['seqTime']
                conc = result['concTime']
                improvement = ((seq - conc) / seq) * 100
                print(f"Improvement: {improvement:.2f}%")
                break
            time.sleep(1)
        else:
            print("Benchmark timed out")

        browser.close()

if __name__ == "__main__":
    run()
