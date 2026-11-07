#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import re

with open("public/data/fipiTasksBank9_15.json", "r", encoding="utf-8") as f:
    bank = json.load(f)

t11 = [q for q in bank if str(q.get("task")) == "11"]

issues = []

for q in t11:
    qid = q["id"]
    for r_idx, r in enumerate(q.get("rows", []), 1):
        words = r.get("words", [])
        solved = r.get("solvedWords", [])
        expl = r.get("explanation", "").strip()
        
        # 1. Empty or very short
        if len(expl) < 20:
            issues.append((qid, r_idx, "Too short", expl))
            continue
            
        # 2. Check if both words are mentioned in explanation
        for w, sw in zip(words, solved):
            # clean w: remove (..), .., ellipsis
            w_stem = re.sub(r"[\(\)\.\…\s\u0301]+", "", w).lower()
            # take first 4-5 chars
            root = w_stem[:4] if len(w_stem) >= 4 else w_stem
            if root not in expl.lower():
                issues.append((qid, r_idx, f"Word root {root} ({w}) not in explanation", expl[:100]))
                
        # 3. Check for unfinished sentences
        if expl.endswith("—") or expl.endswith("или") or expl.endswith("поэтому"):
            issues.append((qid, r_idx, "Unfinished sentence", expl[-50:]))
            
        # 4. Check for broken quote pairs
        if expl.count("«") != expl.count("»"):
            issues.append((qid, r_idx, "Unbalanced Russian quotes", expl[:100]))
            
        # 5. Check for double spaces or broken syntax
        if "  " in expl:
            issues.append((qid, r_idx, "Double spaces in explanation", expl[:80]))

print(f"Total explanation issues: {len(issues)}")
for item in issues[:30]:
    print(item)
if len(issues) > 30:
    print(f"... and {len(issues) - 30} more")
