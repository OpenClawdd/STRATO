import json
import os

def merge_game_data(existing_file_path, expansion_file_path, output_file_path):
    """
    Loads game data from an expansion pack and merges it into the main games JSON file,
    skipping any games that already exist based on their title.
    """
    print("--- Starting Game Data Merge ---")

    # 1. Load existing games data
    try:
        with open(existing_file_path, 'r') as f:
            existing_games = json.load(f)
        print(f"Successfully loaded {len(existing_games)} existing games from {existing_file_path}.")
    except FileNotFoundError:
        print(f"Error: Existing games file not found at {existing_file_path}. Starting with an empty list.")
        existing_games = []
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {existing_file_path}. Please check the file format.")
        return
    except Exception as e:
        print(f"An unexpected error occurred while loading existing games: {e}")
        return

    # 2. Load expansion games data
    try:
        with open(expansion_file_path, 'r') as f:
            expansion_games = json.load(f)
        print(f"Successfully loaded {len(expansion_games)} expansion games from {expansion_file_path}.")
    except FileNotFoundError:
        print(f"Warning: Expansion pack file not found at {expansion_file_path}. No merging will occur.")
        expansion_games = []
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {expansion_file_path}. Please check the file format.")
        return
    except Exception as e:
        print(f"An unexpected error occurred while loading expansion games: {e}")
        return

    # 3. Identify existing titles
    existing_titles = set()
    for game in existing_games:
        # Assuming 'title' is the unique identifier field
        if 'title' in game:
            existing_titles.add(game['title'])
        # Fallback check for 'n' if 'title' is missing
        elif 'n' in game:
            existing_titles.add(game['n'])

    # 4. Merge and filter
    new_games_count = 0
    merged_games = list(existing_games) # Start with all existing games

    for game in expansion_games:
        title = game.get('title') or game.get('n')
        
        if title and title not in existing_titles:
            merged_games.append(game)
            existing_titles.add(title) # Add to set to prevent duplicates if expansion pack itself has them
            new_games_count += 1
        elif title:
            print(f"Skipping duplicate game: '{title}'")

    # 5. Save the updated list
    try:
        with open(output_file_path, 'w') as f:
            json.dump(merged_games, f, indent=4)
        print("\n--- Merge Complete ---")
        print(f"Total games saved: {len(merged_games)}")
        print(f"Added {new_games_count} new unique games.")
        print(f"Updated file saved successfully to {output_file_path}")
    except Exception as e:
        print(f"FATAL ERROR: Could not write to {output_file_path}. Reason: {e}")


if __name__ == "__main__":
    # Define file paths
    EXISTING_GAMES_PATH = "public/assets/games.json"
    EXPANSION_GAMES_PATH = "public/assets/strato_expansion_pack.json"
    OUTPUT_GAMES_PATH = "public/assets/games.json"

    merge_game_data(
        existing_file_path=EXISTING_GAMES_PATH,
        expansion_file_path=EXPANSION_GAMES_PATH,
        output_file_path=OUTPUT_GAMES_PATH
    )
