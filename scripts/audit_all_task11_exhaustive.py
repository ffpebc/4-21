#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import glob
import html
import json
import os
import re
import sqlite3
import sys

def clean_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    txt = html.unescape(raw_html)
    txt = re.sub(r"[\xad\u200b-\u200f\ufeff]", "", txt)
    txt = re.sub(r"<br\s*/?>", "\n", txt, flags=re.I)
    txt = re.sub(r"</p>|</div>|</li>", "\n", txt, flags=re.I)
    txt = re.sub(r"<[^>]+>", "", txt)
    txt = txt.replace("\xa0", " ").replace("\u202f", " ")
    lines = []
    for ln in txt.splitlines():
        ln = re.sub(r"\s*\(?Взято из\b.*$", "", ln, flags=re.I)
        ln = re.sub(r"[ \t]+", " ", ln).strip()
        if ln:
            lines.append(ln)
    return "\n".join(lines)

def norm_yo(s: str) -> str:
    s = html.unescape(s or "")
    s = re.sub(r"[\xad\u200b-\u200f\ufeff\u0300\u0301]", "", s)
    s = s.translate(str.maketrans("ÁÓÉÍÚÝáóéíúý", "АОЕИУЫаоеиуы"))
    return s.replace("Ё", "Е").replace("ё", "е")

# 1. Load app bank
with open("public/data/fipiTasksBank9_15.json", "r", encoding="utf-8") as f:
    bank = json.load(f)
app_t11 = [q for q in bank if str(q.get("task")) == "11"]
print(f"Loaded {len(app_t11)} prototypes of Task 11.")

# 2. Load NeoFamily
with open(".cache/neofamily_4_22.json", "r", encoding="utf-8") as f:
    nf = json.load(f)
nf_raw = {}
for item in nf.get("11", []):
    iid = str(item.get("id") or item.get("task_id"))
    nf_raw[iid] = item

# 3. Load Shkolkovo DB and JSON
shk_raw = {}
if os.path.exists("/home/sergei/ege_trainer/ege_trainer.db"):
    conn = sqlite3.connect("/home/sergei/ege_trainer/ege_trainer.db")
    cur = conn.cursor()
    cur.execute("SELECT id, body_html, solution_html, answer_text, source_name FROM tasks")
    for row in cur.fetchall():
        shk_raw[str(row[0])] = {
            "id": str(row[0]),
            "body_html": row[1] or "",
            "solution_html": row[2] or "",
            "answer_text": row[3] or "",
            "source_name": row[4] or ""
        }
    conn.close()

for path in glob.glob(".cache/shkolkovo/*.json"):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    items = data if isinstance(data, list) else (data.get("items") or data.get("data") or [])
    for it in items:
        if isinstance(it, dict) and "id" in it:
            iid = str(it["id"])
            if iid not in shk_raw:
                shk_raw[iid] = {
                    "id": iid,
                    "body_html": it.get("body_html") or it.get("body") or "",
                    "solution_html": it.get("solution_html") or it.get("solution") or "",
                    "answer_text": it.get("answer_text") or it.get("answer") or "",
                    "source_name": it.get("source_name") or ""
                }

def parse_primary_rows(body_html: str):
    """Extract rows from primary source body_html."""
    txt = clean_html(body_html)
    # Rows usually look like:
    # 1) word1, word2
    # 2) word3, word4
    rows = {}
    lines = [ln.strip() for ln in txt.splitlines() if ln.strip()]
    for ln in lines:
        m = re.match(r"^([1-5])[\)\.]\s*(.+)$", ln)
        if m:
            rnum = int(m.group(1))
            row_txt = m.group(2).strip()
            # split words by comma or semicolon
            wds = [w.strip() for w in re.split(r"[,;]+", row_txt) if w.strip()]
            rows[rnum] = wds
    return rows

def parse_primary_answer(ans_str):
    if not ans_str:
        return []
    if isinstance(ans_str, list):
        ans_str = "".join(str(x) for x in ans_str)
    digits = [int(c) for c in re.findall(r"[1-5]", str(ans_str))]
    return sorted(set(digits))

# Containers for anomalies
mismatched_instructions = []
internal_consistency_errors = []
primary_source_word_mismatches = []
primary_source_answer_mismatches = []
explanation_issues = []
typos_in_solved_words = []

for q in app_t11:
    qid = q["id"]
    instruction = q.get("instruction", "").strip()
    rows = q.get("rows", [])
    correct_indices = sorted(q.get("correctIndices", []))
    
    # 1. Formulation / Instruction check
    canonical_instruction = "Укажите варианты ответов, в которых во всех словах одного ряда пропущена одна и та же буква. Запишите номера ответов."
    if instruction != canonical_instruction:
        mismatched_instructions.append((qid, instruction))
        
    # 2. Rows count & internal consistency
    if len(rows) != 5:
        internal_consistency_errors.append((qid, f"Row count {len(rows)} != 5"))
        
    derived_indices = []
    for r_idx, r in enumerate(rows, 1):
        words = r.get("words", [])
        solved = r.get("solvedWords", [])
        letter = r.get("letter", "")
        is_correct = r.get("isCorrectRow", False)
        expl = r.get("explanation", "").strip()
        
        if not words:
            internal_consistency_errors.append((qid, f"Row {r_idx} has no words"))
        if not solved:
            internal_consistency_errors.append((qid, f"Row {r_idx} has no solvedWords"))
        elif len(words) != len(solved):
            internal_consistency_errors.append((qid, f"Row {r_idx} words count {len(words)} != solvedWords count {len(solved)}"))
            
        # Check explanation
        if not expl:
            explanation_issues.append((qid, r_idx, "Empty explanation"))
        elif len(expl) < 15:
            explanation_issues.append((qid, r_idx, f"Very short explanation: {expl}"))
            
        # Check letter and isCorrectRow
        # Determine actual missing letters from solvedWords vs words
        row_letters = []
        for w, sw in zip(words, solved):
            # check uppercase letters in sw that are missing in w
            # Or capital letters in solved word
            caps = re.findall(r"[А-ЯЁ]", sw)
            # Filter out first letter if it was capitalized in original word
            # Usually gap in w is ".." or "..."
            # Let us find letters in sw at position of ".." in w
            # Or if caps is just the inserted letter
            pass
            
        if is_correct:
            derived_indices.append(r_idx)
            if letter == "—" or not letter:
                internal_consistency_errors.append((qid, f"Row {r_idx} isCorrectRow=True but letter='{letter}'"))
        else:
            if letter != "—" and letter != "":
                internal_consistency_errors.append((qid, f"Row {r_idx} isCorrectRow=False but letter='{letter}'"))
                
    if derived_indices != correct_indices:
        internal_consistency_errors.append((qid, f"correctIndices {correct_indices} != derived from isCorrectRow {derived_indices}"))
        
    # 3. Primary source verification
    prim = None
    prim_name = ""
    if "neofamily" in qid:
        num = qid.split("-")[-1]
        prim = nf_raw.get(num)
        prim_name = "NeoFamily"
    elif "shkolkovo" in qid:
        num = qid.split("-")[-1]
        prim = shk_raw.get(num)
        prim_name = "Shkolkovo"
        
    if prim:
        # Check primary answer
        prim_ans = []
        if prim_name == "NeoFamily":
            # NeoFamily has answers: [{"text": "134"}] or answer: "134" or correct_answers
            raw_a = prim.get("answer") or prim.get("correct_answer")
            if not raw_a and "answers" in prim and isinstance(prim["answers"], list) and len(prim["answers"]) > 0:
                raw_a = prim["answers"][0].get("text") or prim["answers"][0].get("answer")
            prim_ans = parse_primary_answer(raw_a)
            body_html = prim.get("task") or prim.get("text") or prim.get("body") or prim.get("question") or ""
            sol_html = prim.get("solution") or prim.get("explanation") or ""
        elif prim_name == "Shkolkovo":
            prim_ans = parse_primary_answer(prim.get("answer_text"))
            body_html = prim.get("body_html", "")
            sol_html = prim.get("solution_html", "")
            
        if prim_ans and prim_ans != correct_indices:
            primary_source_answer_mismatches.append({
                "id": qid,
                "source": prim_name,
                "app_ans": correct_indices,
                "prim_ans": prim_ans,
                "rows": [f"{r.get('words')} -> {r.get('solvedWords')} ({r.get('letter')})" for r in rows],
                "sol": clean_html(sol_html)[:300]
            })
            
        # Parse primary rows and compare words
        prim_rows = parse_primary_rows(body_html)
        if prim_rows and len(prim_rows) == 5:
            for r_idx in range(1, 6):
                app_w = [re.sub(r"\s+", " ", w).strip().lower() for w in rows[r_idx - 1].get("words", [])]
                p_w = [re.sub(r"\s+", " ", w).strip().lower() for w in prim_rows.get(r_idx, [])]
                # Compare without dots/gaps
                app_clean = [re.sub(r"[\.\(\)\s]+", "", w) for w in app_w]
                p_clean = [re.sub(r"[\.\(\)\s]+", "", w) for w in p_w]
                if app_clean != p_clean:
                    primary_source_word_mismatches.append({
                        "id": qid,
                        "source": prim_name,
                        "row": r_idx,
                        "app_words": rows[r_idx - 1].get("words"),
                        "prim_words": prim_rows.get(r_idx)
                    })

print("=== AUDIT RESULTS ===")
print(f"Mismatched instructions: {len(mismatched_instructions)}")
print(f"Internal consistency errors: {len(internal_consistency_errors)}")
for err in internal_consistency_errors[:10]:
    print("  IC Error:", err)
    
print(f"Primary source answer mismatches: {len(primary_source_answer_mismatches)}")
for err in primary_source_answer_mismatches:
    print(f"  Ans Mismatch in {err['id']} ({err['source']}): App={err['app_ans']} vs Primary={err['prim_ans']}")

print(f"Primary source word mismatches: {len(primary_source_word_mismatches)}")
for err in primary_source_word_mismatches[:15]:
    print(f"  Word Mismatch in {err['id']} row {err['row']}: App={err['app_words']} vs Primary={err['prim_words']}")

print(f"Explanation issues: {len(explanation_issues)}")
for err in explanation_issues[:10]:
    print("  Expl Issue:", err)
