#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import re
from collections import defaultdict

with open("public/data/fipiTasksBank9_15.json", "r", encoding="utf-8") as f:
    bank = json.load(f)

t11 = [q for q in bank if str(q.get("task")) == "11"]

word_to_solved = defaultdict(set)
for q in t11:
    for r in q.get("rows", []):
        for w, sw in zip(r.get("words", []), r.get("solvedWords", [])):
            w_c = re.sub(r"[\u0301;]", "", w).strip()
            sw_c = re.sub(r"[\u0301;]", "", sw).strip()
            word_to_solved[w_c].add(sw_c)

print(f"Total unique word entries: {len(word_to_solved)}")
conflicts = {w: s for w, s in word_to_solved.items() if len(s) > 1}
print(f"Conflicts (same word with different solved words): {len(conflicts)}")
for w, s in conflicts.items():
    print(f"  {w} -> {s}")

