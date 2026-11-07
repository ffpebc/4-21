#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json

with open("public/data/fipiTasksBank.json") as f:
    fipi = json.load(f)
with open("public/data/sprintBank.json") as f:
    sprint = json.load(f)
with open("src/data/starterBank.json") as f:
    starter = json.load(f)

t11_fipi = [q for q in fipi if str(q.get("task")) == "11"]
t11_sprint = [q for q in sprint if str(q.get("task")) == "11"]
t11_starter_fipi = [q for q in starter.get("fipi", []) if str(q.get("task")) == "11"]
t11_starter_sprint = [q for q in starter.get("sprint", []) if str(q.get("task")) == "11"]

print("================ TASK 11 VERIFICATION REPORT ================")
print(f"Total Task 11 FIPI prototypes:       {len(t11_fipi)}")
print(f"Total Task 11 Sprint questions:     {len(t11_sprint)}")
print(f"StarterBank Task 11 FIPI questions: {len(t11_starter_fipi)}")
print(f"StarterBank Task 11 Sprint cards:   {len(t11_starter_sprint)}")

# Check 1: Formulation
canonical_instr = "Укажите варианты ответов, в которых во всех словах одного ряда пропущена одна и та же буква. Запишите номера ответов."
instr_ok = all(q.get("instruction") == canonical_instr for q in t11_fipi)
print(f"1. Canonical Formulations:          {'100% OK' if instr_ok else 'FAILED'}")

# Check 2: Row counts & words
rows_ok = all(len(q.get("rows", [])) == 5 for q in t11_fipi)
words_ok = all(all(len(r.get("words", [])) == len(r.get("solvedWords", [])) == 2 for r in q.get("rows", [])) for q in t11_fipi)
print(f"2. Task Structure (5 rows x 2 wds):  {'100% OK' if rows_ok and words_ok else 'FAILED'}")

# Check 3: Answer keys & letters
ans_ok = True
for q in t11_fipi:
    ans = sorted(q.get("correctIndices", []))
    derived = [idx for idx, r in enumerate(q.get("rows", []), 1) if r.get("isCorrectRow")]
    if ans != derived or not ans:
        ans_ok = False
        break
print(f"3. Answer Keys & Row Alignment:     {'100% OK' if ans_ok else 'FAILED'}")

# Check 4: Explanations
expl_ok = True
for q in t11_fipi:
    for r in q.get("rows", []):
        exp = r.get("explanation", "")
        if len(exp) < 25 or "пишется «»" in exp or "согласно правилу словообразования данной части речи" in exp:
            expl_ok = False
            break
print(f"4. Pedagogy & Explanations:         {'100% OK' if expl_ok else 'FAILED'}")

print("==============================================================")
