import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent

with open(ROOT / "public/data/fipiTasksBank9_15.json", "r", encoding="utf-8") as f:
    app_bank = json.load(f)

app_t4 = [q for q in app_bank if str(q.get("task")) == "4"]

all_words = {}
for q in app_t4:
    for idx, r in enumerate(q.get("rows", []), 1):
        w = r["words"][0].strip()
        sw = r.get("solvedWords", [""])[0].strip()
        is_ok = r.get("isCorrectRow")
        expl = r.get("explanation", "").strip()
        let = r.get("letter", "")
        key = re.sub(r"\([^)]*\)", "", w).strip().lower()
        if key not in all_words:
            all_words[key] = {
                "instances": [],
                "solved_variants": set(),
                "correct_appearances": 0,
                "wrong_appearances": 0,
            }
        all_words[key]["instances"].append((q["id"], idx, w, sw, is_ok, expl))
        all_words[key]["solved_variants"].add(sw)
        if is_ok:
            all_words[key]["correct_appearances"] += 1
        else:
            all_words[key]["wrong_appearances"] += 1

print(f"Total unique base words in Task 4: {len(all_words)}")

# Check for contradictions: does any word have multiple different solvedWords?
contradictory_words = []
for k, data in all_words.items():
    clean_solved = set(re.sub(r"\([^)]*\)", "", s).strip() for s in data["solved_variants"])
    if len(clean_solved) > 1:
        contradictory_words.append((k, clean_solved, data["instances"][:3]))

print(f"Contradictory solvedWords: {len(contradictory_words)}")
for k, variants, inst in contradictory_words:
    print(f"  Word: '{k}' has multiple solved variants: {variants}")
