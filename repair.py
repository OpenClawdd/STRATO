import json
import os

FILE_PATH = "public/assets/games.json"

def repair():
    if not os.path.exists(FILE_PATH):
        print("Error: games.json not found.")
        return

    try:
        with open(FILE_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"Loaded {len(data)} games. Repairing URLs...")

        for game in data:
            thumb = game.get('thumbnail', '')
            # If it's a hotlinked URL and not already proxied, wrap it
            if thumb.startswith('http') and "images.weserv.nl" not in thumb:
                game['thumbnail'] = f"https://images.weserv.nl/?url={thumb}&default=https://strato.best/assets/placeholder.png"

        with open(FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
        
        print("Repair complete. games.json is now valid and proxied.")

    except json.JSONDecodeError as e:
        print(f"JSON is broken! Error at line {e.lineno}, column {e.colno}")
        print("Attempting a forced brace fix...")
        # This is a 'hail mary' for missing commas
        raw = open(FILE_PATH, 'r').read()
        fixed = raw.replace('}{', '},{')
        with open(FILE_PATH, 'w') as f:
            f.write(fixed)
        print("Try running this script again to see if the JSON is fixed.")

if __name__ == "__main__":
    repair()