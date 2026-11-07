#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import re

with open("public/data/fipiTasksBank9_15.json", "r", encoding="utf-8") as f:
    bank = json.load(f)

t11 = [q for q in bank if str(q.get("task")) == "11"]

def extract_inserted_letter(w, sw):
    # Remove parens like "(награда)"
    w_clean = re.sub(r"\([^)]+\)", "", w).strip()
    sw_clean = re.sub(r"\([^)]+\)", "", sw).strip()
    
    # Capital letters in sw_clean:
    # If first letter is capitalized, ignore it unless it was the gap
    caps = []
    for i, c in enumerate(sw_clean):
        if c.isupper():
            # If it is first letter and w_clean also starts with uppercase or gap wasn't at start
            if i == 0 and not (w_clean.startswith("..") or w_clean.startswith("…")):
                continue
            caps.append(c)
    if caps:
        return "".join(caps)
    # If no caps, maybe suffix -к- where nothing is inserted (e.g. резкий, немецкий)
    if ".." in w_clean and re.search(r"[кК]ий", sw_clean):
        return ""
    return None

row_discrepancies = []
word_extractions = []

for q in t11:
    qid = q["id"]
    for r_idx, r in enumerate(q.get("rows", []), 1):
        words = r.get("words", [])
        solved = r.get("solvedWords", [])
        row_letter = r.get("letter", "")
        is_correct = r.get("isCorrectRow", False)
        
        extracted_letters = []
        for w, sw in zip(words, solved):
            let = extract_inserted_letter(w, sw)
            extracted_letters.append((w, sw, let))
            
        lets = [item[2] for item in extracted_letters]
        
        # Check matching
        # In task 11, both words should have the exact same letter for is_correct=True
        # Note: E and Ё can be considered equivalent in some rows
        w1_let = lets[0] if len(lets) > 0 else None
        w2_let = lets[1] if len(lets) > 1 else None
        
        # Normalize E/Ё
        norm1 = "Е" if w1_let in ("Е", "Ё") else w1_let
        norm2 = "Е" if w2_let in ("Е", "Ё") else w2_let
        
        same = (w1_let == w2_let and w1_let is not None and w1_let != "") or (norm1 == norm2 and norm1 == "Е")
        
        if is_correct != same:
            row_discrepancies.append({
                "id": qid,
                "row": r_idx,
                "words": words,
                "solved": solved,
                "extracted": lets,
                "row_letter": row_letter,
                "is_correct": is_correct,
                "same": same
            })

print(f"Total row discrepancies between extracted letters and isCorrectRow: {len(row_discrepancies)}")
for d in row_discrepancies:
    print(d)
