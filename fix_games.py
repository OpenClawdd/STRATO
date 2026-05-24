import json

with open("public/assets/games.json", "r") as f:
    text = f.read()

import re
text = re.sub(r'<<<<<<< HEAD\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> origin/main\n', r'\1', text)

try:
    data = json.loads(text)
    print("Valid json")
    with open("public/assets/games.json", "w") as f:
        f.write(text)
except json.JSONDecodeError as e:
    print(e)
    # let's try just taking the whole block since it's probably missing a bracket or something if we just take HEAD
