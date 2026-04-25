import json
import time
import random
import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

TARGETS = [
    "https://g-65j.pages.dev/projects",
    "https://fmhy.net/",
    "https://splash.best/"
]

EXISTING_GAMES_FILE = "public/assets/games.json"
OUTPUT_FILE = "scraped_games.json"

def get_existing_urls():
    if not os.path.exists(EXISTING_GAMES_FILE):
        return set()
    try:
        with open(EXISTING_GAMES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            urls = set()
            for game in data:
                u = game.get('url') or game.get('iframe_url') or game.get('u')
                if u:
                    urls.add(u.strip().lower())
            return urls
    except Exception as e:
        print(f"Error reading existing games: {e}")
        return set()

def infer_tags(title):
    title_lower = title.lower()
    tags = []
    keywords = {
        'action': ['gun', 'strike', 'war', 'battle', 'fight', 'action'],
        'puzzle': ['puzzle', 'math', 'brain', 'logic', 'sudoku'],
        'racing': ['car', 'drift', 'race', 'driving', 'moto'],
        'sports': ['basketball', 'soccer', 'football', 'tennis', 'sports', 'bowl'],
        'io': ['io', 'slither', 'agar', 'hole'],
        'arcade': ['arcade', 'run', 'jump', 'dash', 'surfer']
    }
    for tag, words in keywords.items():
        if any(word in title_lower for word in words):
            tags.append(tag)

    if not tags:
        tags.append("other")
    return tags

def scrape_site(url, existing_urls):
    print(f"Targeting: {url}")
    scraped = []
    skipped = 0
    
    try:
        delay = random.uniform(0.8, 1.5)
        time.sleep(delay)

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, 'html.parser')

        # Generic heuristic: Find a tags that might represent games
        for a_tag in soup.find_all('a', href=True):
            game_url = urljoin(url, a_tag['href'])
            
            # Normalize url for dedup
            norm_url = game_url.strip().lower()
            if norm_url in existing_urls:
                skipped += 1
                continue

            img_tag = a_tag.find('img')
            if not img_tag:
                continue

            thumbnailUrl = urljoin(url, img_tag.get('src', ''))
            
            title = ""
            heading = a_tag.find(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
            if heading and heading.text.strip():
                title = heading.text.strip()
            elif img_tag.get('alt'):
                title = img_tag.get('alt').strip()
            elif a_tag.text.strip():
                title = a_tag.text.strip()
            
            if not title or len(title) < 2:
                continue

            if title.lower() in ['home', 'contact', 'about', 'privacy', 'terms', 'github', 'discord', 'settings']:
                continue

            game_data = {
                'title': title,
                'url': game_url,
                'thumbnailUrl': thumbnailUrl,
                'category': 'other',
                'tags': infer_tags(title),
                'source': urlparse(url).netloc
            }
            
            scraped.append(game_data)
            existing_urls.add(norm_url)

    except Exception as e:
        print(f"Error scraping {url}: {e}")

    return scraped, skipped

def main():
    existing_urls = get_existing_urls()
    print(f"Loaded {len(existing_urls)} existing game URLs for deduplication.")

    all_scraped = []
    total_skipped = 0

    for target in TARGETS:
        scraped, skipped = scrape_site(target, existing_urls)
        all_scraped.extend(scraped)
        total_skipped += skipped

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_scraped, f, indent=4)

    print(f"\n--- HEIST SUMMARY ---")
    print(f"Scraped {len(all_scraped)} games from {len(TARGETS)} sites.")
    print(f"Skipped {total_skipped} duplicate games.")

if __name__ == "__main__":
    main()
