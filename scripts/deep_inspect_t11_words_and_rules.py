#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import re
import html

with open("public/data/fipiTasksBank9_15.json", "r", encoding="utf-8") as f:
    bank = json.load(f)

t11 = [q for q in bank if str(q.get("task")) == "11"]
print(f"Total Task 11 prototypes: {len(t11)}")

# Collect issues
semicolon_issues = []
capitalization_in_words = []
solved_word_issues = []
explanation_html_issues = []
explanation_empty_quotes = []
letter_mismatches = []
all_words_list = []

for q in t11:
    qid = q["id"]
    rows = q.get("rows", [])
    for r_idx, r in enumerate(rows, 1):
        words = r.get("words", [])
        solved = r.get("solvedWords", [])
        letter = r.get("letter", "")
        is_correct = r.get("isCorrectRow", False)
        expl = r.get("explanation", "")
        
        # Check html tags or entities in explanation
        if re.search(r"<[^>]+>|&[a-z]+;|<!--", expl):
            explanation_html_issues.append((qid, r_idx, expl[:100]))
            
        if "пишется «»" in expl or "буква «»" in expl or "« »" in expl:
            explanation_empty_quotes.append((qid, r_idx, expl[:100]))
            
        for w_idx, (w, sw) in enumerate(zip(words, solved)):
            all_words_list.append((qid, r_idx, w_idx, w, sw))
            
            # Check trailing punctuation or semicolons
            if re.search(r"[;,]$", w) or re.search(r"[;,]$", sw):
                semicolon_issues.append((qid, r_idx, w_idx, w, sw))
                
            # Check for strange capital letters inside word (not first char, not inserted char)
            # Find all capital letters in w
            caps_w = re.findall(r"[А-ЯЁ]", w)
            # If word is not like "(...)", check first char
            w_strip = re.sub(r"^\([^)]+\)\s*", "", w).strip()
            # If w_strip has capital letters after first char:
            if len(w_strip) > 1 and re.search(r"[А-ЯЁ]", w_strip[1:]):
                capitalization_in_words.append((qid, r_idx, w_idx, w, sw))
                
            # Check solved word: how many capital letters does sw have?
            # Normally, if w starts lowercase, sw should have exactly 1 capital letter (the missing letter).
            # If w starts uppercase, sw should have 2 capital letters (the first letter and the missing letter).
            sw_strip = re.sub(r"^\([^)]+\)\s*", "", sw).strip()
            caps_sw = re.findall(r"[А-ЯЁ]", sw_strip)
            if w_strip and w_strip[0].isupper():
                expected_caps = 2
            else:
                expected_caps = 1
                
            # If caps count != expected, record for inspection
            if len(caps_sw) != expected_caps:
                solved_word_issues.append((qid, r_idx, w_idx, w, sw, caps_sw))

print(f"Semicolon / punctuation issues in words: {len(semicolon_issues)}")
for item in semicolon_issues:
    print(" ", item)

print(f"\nInternal capitalization issues in words: {len(capitalization_in_words)}")
for item in capitalization_in_words:
    print(" ", item)

print(f"\nSolved word capitalization count anomalies: {len(solved_word_issues)}")
for item in solved_word_issues[:20]:
    print(" ", item)

print(f"\nHTML / unescaped entities in explanations: {len(explanation_html_issues)}")
for item in explanation_html_issues[:10]:
    print(" ", item)

print(f"\nEmpty quotes in explanations: {len(explanation_empty_quotes)}")
for item in explanation_empty_quotes[:10]:
    print(" ", item)

