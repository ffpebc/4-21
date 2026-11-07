import json
import sqlite3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Load official reference stresses from ege.sqlite drill_words (10,016 words)
conn = sqlite3.connect("/home/sergei/код/russian ege/data/ege.sqlite")
cur = conn.cursor()
cur.execute("SELECT word_masked, correct_option, rule_explanation FROM drill_words WHERE type='stress'")
drill_stresses = {}
for masked, correct_opt, rule in cur.fetchall():
    drill_stresses[masked.strip().lower()] = (correct_opt.strip(), rule.strip())
conn.close()

# Also load EXTRA_STRESS_NORMS from sync_all_banks_to_primary_sources.py
from sync_all_banks_to_primary_sources import EXTRA_STRESS_NORMS

ref_norms = {}
for k, v in drill_stresses.items():
    ref_norms[k] = v[0]
for k, v in EXTRA_STRESS_NORMS.items():
    ref_norms[k.strip().lower()] = v.strip()

# Load app bank
with open(ROOT / "public/data/fipiTasksBank9_15.json", "r", encoding="utf-8") as f:
    app_bank = json.load(f)

app_t4 = [q for q in app_bank if str(q.get("task")) == "4"]

VOWELS_UPPER = set("АЕЁИОУЫЭЮЯ")
VOWELS_LOWER = set("аеёиоуыэюя")

def get_stressed_char(word: str) -> str:
    for ch in word:
        if ch in VOWELS_UPPER:
            return ch
    return ""

def norm_yo(s: str) -> str:
    return s.replace("Ё", "Е").replace("ё", "е")

# Audit every single row of all 688 questions
answer_key_discrepancies = []
explanation_discrepancies = []
unrecognized_words = set()

for q in app_t4:
    qid = q["id"]
    ans = q["correctIndices"]
    for idx, r in enumerate(q["rows"], 1):
        w = r["words"][0].strip()
        sw = r["solvedWords"][0].strip()
        is_correct = r["isCorrectRow"]
        expl = r["explanation"]
        
        bare_w = re.sub(r"\([^)]*\)", "", w).strip()
        base_key = norm_yo(bare_w.lower())
        
        # Check against reference norms
        known_norm = None
        for cand_key in [base_key, bare_w.lower()]:
            if cand_key in ref_norms:
                known_norm = ref_norms[cand_key]
                break
        
        if not known_norm:
            unrecognized_words.add(bare_w.lower())
            continue
            
        norm_vowel = get_stressed_char(known_norm)
        word_vowel = get_stressed_char(bare_w)
        
        # Is word stressed according to norm?
        word_is_truly_correct = (norm_yo(known_norm) == norm_yo(bare_w))
        
        # Does app agree?
        if is_correct != word_is_truly_correct:
            answer_key_discrepancies.append({
                "qid": qid,
                "row": idx,
                "word": w,
                "known_norm": known_norm,
                "app_isCorrect": is_correct,
                "truth_isCorrect": word_is_truly_correct,
                "expl": expl
            })
            
        # Does solvedWords match norm?
        if norm_yo(sw) != norm_yo(known_norm) and "отзыв" not in bare_w.lower():
            explanation_discrepancies.append({
                "qid": qid,
                "row": idx,
                "word": w,
                "solvedWord": sw,
                "known_norm": known_norm,
                "expl": expl
            })

print(f"Total Task 4 questions audited: {len(app_t4)} (3,440 rows)")
print(f"Answer key discrepancies against orthoepic dictionary: {len(answer_key_discrepancies)}")
print(f"Explanation/solvedWord discrepancies against orthoepic dictionary: {len(explanation_discrepancies)}")
print(f"Unrecognized words: {len(unrecognized_words)}")

if answer_key_discrepancies:
    print("\nSAMPLE ANSWER KEY DISCREPANCIES:")
    for d in answer_key_discrepancies[:10]:
        print(f"  {d['qid']} row {d['row']}: word='{d['word']}', known_norm='{d['known_norm']}', app_isCorrect={d['app_isCorrect']}, truth_isCorrect={d['truth_isCorrect']}")

if explanation_discrepancies:
    print("\nSAMPLE EXPLANATION DISCREPANCIES:")
    for d in explanation_discrepancies[:10]:
        print(f"  {d['qid']} row {d['row']}: word='{d['word']}', solved='{d['solvedWord']}', known='{d['known_norm']}'")

if unrecognized_words:
    print("\nUNRECOGNIZED WORDS:")
    print(sorted(unrecognized_words))
