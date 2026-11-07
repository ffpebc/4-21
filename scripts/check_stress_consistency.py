import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent

with open(ROOT / "public/data/fipiTasksBank9_15.json", "r", encoding="utf-8") as f:
    app_bank = json.load(f)

app_t4 = [q for q in app_bank if str(q.get("task")) == "4"]

# Collect all (word, isCorrectRow, solvedWord, explanation)
words_map = {}
for q in app_t4:
    for r in q["rows"]:
        w = r["words"][0].strip()
        sw = r["solvedWords"][0].strip()
        is_ok = r["isCorrectRow"]
        
        # Extract main word and parenthetical context
        clean_w = re.sub(r"\([^)]*\)", "", w).strip()
        clean_sw = re.sub(r"\([^)]*\)", "", sw).strip()
        
        base_low = clean_w.lower().replace("ё", "е")
        if base_low not in words_map:
            words_map[base_low] = {
                "correct_variants": set(),
                "wrong_variants": set(),
                "solved_variants": set(),
                "all_raw": set(),
            }
        words_map[base_low]["all_raw"].add(w)
        words_map[base_low]["solved_variants"].add(clean_sw)
        if is_ok:
            words_map[base_low]["correct_variants"].add(clean_w)
        else:
            words_map[base_low]["wrong_variants"].add(clean_w)

print(f"Total unique base words: {len(words_map)}")

# Let's inspect words where solved_variants has more than 1 item, or where correct_variants has more than 1 item
suspicious = []
for base, d in sorted(words_map.items()):
    c_vars = d["correct_variants"]
    w_vars = d["wrong_variants"]
    s_vars = d["solved_variants"]
    
    # If a word appears as correct with different stresses
    if len(c_vars) > 1:
        suspicious.append((base, "MULTIPLE_CORRECT_STRESSES", c_vars, s_vars))
    # If a word is in both correct and wrong with the SAME stress
    overlap = c_vars.intersection(w_vars)
    if overlap:
        suspicious.append((base, "OVERLAP_CORRECT_AND_WRONG", overlap))
    # If solved variant has more than 1
    if len(s_vars) > 1:
        # Check if difference is only ё vs е
        yo_normalized = set(s.replace("Ё", "Е").replace("ё", "е") for s in s_vars)
        if len(yo_normalized) > 1:
            suspicious.append((base, "MULTIPLE_SOLVED_STRESSES", s_vars))

print(f"Suspicious word issues: {len(suspicious)}")
for s in suspicious:
    print(s)
