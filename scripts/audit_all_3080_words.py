#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import re

with open("public/data/fipiTasksBank9_15.json", "r", encoding="utf-8") as f:
    bank = json.load(f)

t11 = [q for q in bank if str(q.get("task")) == "11"]

anomalies = []

for q in t11:
    qid = q["id"]
    for r_idx, r in enumerate(q.get("rows", []), 1):
        words = r.get("words", [])
        solved = r.get("solvedWords", [])
        letter = r.get("letter", "")
        is_correct = r.get("isCorrectRow", False)
        
        for w_idx, (w, sw) in enumerate(zip(words, solved)):
            # 1. Check if sw is empty
            if not sw:
                anomalies.append((qid, r_idx, w_idx, "Empty solved word", w, sw))
                continue
                
            # 2. Check if gap in w is unresolved in sw (e.g. contains .. or …)
            if ".." in sw or "…" in sw:
                anomalies.append((qid, r_idx, w_idx, "Unresolved gap in solved word", w, sw))
                
            # 3. Check if solved word still has semicolon or comma
            if ";" in sw or ";" in w:
                anomalies.append((qid, r_idx, w_idx, "Semicolon in word", w, sw))
                
            # 4. Check if base of w without gap matches sw without capital letter
            # normalize parentheses: "(награда) достоин"
            w_norm = re.sub(r"[\.\…\u0301]", "", w).lower().replace("ё", "е")
            sw_norm = re.sub(r"[\u0301]", "", sw).lower().replace("ё", "е")
            # If word is like "немец..кий" and solved is "немецкий", w_norm has "немецкий"
            if w_norm != sw_norm:
                # check if there is a mismatch
                anomalies.append((qid, r_idx, w_idx, "Base word mismatch", w, sw))

print(f"Total anomalies found: {len(anomalies)}")
for a in anomalies:
    print(a)

