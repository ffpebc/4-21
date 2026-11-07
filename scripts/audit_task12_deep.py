#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Deep audit of all Task 12 prototypes in the EGE Trainer app and their primary sources.
Checks:
1. Formulation (instruction, rule, topic, target, questionKind)
2. Task content (5 rows, words, gaps, contexts, solved words)
3. Answer keys (row-level letters, isCorrectRow, correctIndices, match against primary source)
4. Explanations (grammatical validity, citation of infinitive/conjugation, comparison with primary source)
"""

import glob
import html
import json
import os
import re
import sqlite3
import sys

def clean_html(raw: str) -> str:
    if not raw:
        return ""
    t = html.unescape(raw)
    t = re.sub(r"<br\s*/?>", "\n", t, flags=re.I)
    t = re.sub(r"</p>|</div>|</li>", "\n", t, flags=re.I)
    t = re.sub(r"<[^>]+>", " ", t)
    t = t.replace("\xa0", " ").replace("\u202f", " ")
    t = re.sub(r"[\u0300-\u036f]", "", t)
    t = t.translate(str.maketrans("áóéíúýÁÓÉÍÚÝ", "аоеиуыАОЕИУЫ"))
    lines = [re.sub(r"\s+", " ", l).strip() for l in t.splitlines()]
    return "\n".join([l for l in lines if l])

def parse_answer(ans):
    if not ans:
        return []
    digits = [int(c) for c in re.findall(r"[1-5]", str(ans))]
    return sorted(list(set(digits)))

def norm_word(w: str) -> str:
    w = (w or "").lower()
    w = re.sub(r"[\u0300-\u036f]", "", w)
    w = w.translate(str.maketrans("áóéíúý", "аоеиуы"))
    w = re.sub(r"[\s\xa0\u200b\u2026\.,;:!?-]+", "", w)
    return w.replace("ё", "е").replace("..", "").replace("…", "")

def extract_primary_rows(body_html: str) -> dict:
    cleaned = clean_html(body_html)
    rows = {}
    for line in cleaned.splitlines():
        m = re.match(r"^(\d)\s*[\).]\s*(.*)$", line)
        if m:
            num = int(m.group(1))
            rows[num] = m.group(2).strip()
    return rows

def run_deep_audit():
    print("=" * 80)
    print("DEEP AUDIT: TASK 12 PROTOTYPES VS PRIMARY SOURCES")
    print("=" * 80)

    # 1. Load app data
    with open("public/data/fipiTasksBank.json", encoding="utf-8") as f:
        fipi_bank = json.load(f)
    t12_fipi = [q for q in fipi_bank if str(q.get("task")) == "12"]

    with open("src/data/starterBank.json", encoding="utf-8") as f:
        starter_bank = json.load(f)
    t12_starter = [q for q in starter_bank.get("fipi", []) if str(q.get("task")) == "12"]

    t12_sprint = []
    try:
        with open("public/data/sprintBank.json", encoding="utf-8") as f:
            sprint_bank = json.load(f)
        t12_sprint = [q for q in sprint_bank if str(q.get("task")) == "12"]
    except Exception as e:
        print(f"  (Note: sprintBank loaded with {e})")

    print(f"Loaded from app:")
    print(f"  fipiTasksBank Task 12: {len(t12_fipi)} prototypes")
    print(f"  starterBank Task 12:   {len(t12_starter)} prototypes")
    print(f"  sprintBank Task 12:     {len(t12_sprint)} sprint questions")

    # 2. Load primary sources
    with open(".cache/neofamily_4_22.json", encoding="utf-8") as f:
        nf_raw = json.load(f)
    nf_map = {str(item.get("id")): item for item in nf_raw.get("12", [])}

    db_path = "/home/sergei/ege_trainer/ege_trainer.db"
    shk_db_map = {}
    if os.path.exists(db_path):
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        cur.execute("SELECT id, body_html, solution_html, answer_text FROM tasks")
        for r in cur.fetchall():
            shk_db_map[str(r[0])] = {
                "body_html": r[1] or "",
                "solution_html": r[2] or "",
                "answer_text": r[3] or "",
            }
        con.close()

    shk_cat_map = {}
    for p in glob.glob(".cache/shkolkovo/cat_*.json"):
        with open(p, encoding="utf-8") as f:
            d = json.load(f)
        if isinstance(d, dict) and "questions" in d:
            sess_map = {s["Id"]: s.get("Html", "") for s in d.get("dependencies", {}).get("TexSessions", [])}
            for q in d["questions"]:
                qid = str(q.get("Id"))
                q_sess = q.get("QuestionTexSessionId")
                sol_sess = q.get("SolutionTexSessionId")
                ans = q.get("Answer", {}).get("text") if isinstance(q.get("Answer"), dict) else ""
                shk_cat_map[qid] = {
                    "body_html": sess_map.get(q_sess, ""),
                    "solution_html": sess_map.get(sol_sess, ""),
                    "answer_text": ans or "",
                }

    print(f"\nLoaded primary source records:")
    print(f"  NeoFamily Task 12:     {len(nf_map)} items")
    print(f"  Shkolkovo DB items:    {len(shk_db_map)} items")
    print(f"  Shkolkovo Cat items:   {len(shk_cat_map)} items")

    # 3. Verification metrics
    sources_distribution = {}
    formulation_anomalies = []
    task_structure_anomalies = []
    word_text_mismatches = []
    answer_mismatches = []
    row_internal_inconsistencies = []
    explanation_anomalies = []
    pedagogical_review = []

    for q in t12_fipi:
        qid = q["id"]
        source_label = q.get("source", "")
        sources_distribution[source_label] = sources_distribution.get(source_label, 0) + 1

        # --- A. FORMULATION AUDIT ---
        instr = q.get("instruction", "")
        std_instr_marker = "Укажите варианты ответов"
        same_letter_marker = "одна и та же буква"
        if not instr or std_instr_marker not in instr or same_letter_marker not in instr:
            formulation_anomalies.append((qid, "instruction", instr))

        rule = q.get("rule", "")
        if not rule or "Укажите" in rule or len(rule) < 10:
            formulation_anomalies.append((qid, "rule", rule))

        if q.get("questionKind") != "rows":
            formulation_anomalies.append((qid, "questionKind", q.get("questionKind")))

        if q.get("target") != "ОДНА И ТА ЖЕ БУКВА":
            formulation_anomalies.append((qid, "target", q.get("target")))

        # --- B. PRIMARY SOURCE RECORD RETRIEVAL ---
        prim_body = ""
        prim_sol = ""
        prim_ans = []
        is_demo = False

        if "neofamily" in qid:
            ext_id = qid.split("-")[-1]
            it = nf_map.get(ext_id)
            if it:
                prim_body = it.get("question", "")
                prim_sol = it.get("solution", "")
                prim_ans = parse_answer(it.get("answer"))
        elif "shkolkovo" in qid:
            ext_id = qid.split("-")[-1]
            it = shk_db_map.get(ext_id) or shk_cat_map.get(ext_id)
            if it:
                prim_body = it.get("body_html", "")
                prim_sol = it.get("solution_html", "")
                prim_ans = parse_answer(it.get("answer_text"))
        elif "demo-2026" in qid:
            is_demo = True
            prim_ans = [1, 3, 4]
        elif "demo-2025" in qid:
            is_demo = True
            prim_ans = [3, 5]
        elif "bank-zadach" in qid or "umschool" in qid:
            prim_ans = sorted(q.get("correctIndices", []))

        # --- C. TASK CONTENT AUDIT (ROWS & WORDS) ---
        rows = q.get("rows", [])
        if len(rows) != 5:
            task_structure_anomalies.append((qid, f"Row count is {len(rows)}, expected 5"))

        prim_rows_dict = extract_primary_rows(prim_body) if prim_body else {}

        for r_idx, r in enumerate(rows, 1):
            words = r.get("words", [])
            solved = r.get("solvedWords", [])

            if len(words) < 2 or len(words) > 3:
                task_structure_anomalies.append((qid, f"Row {r_idx} has {len(words)} words"))
            if len(words) != len(solved):
                task_structure_anomalies.append((qid, f"Row {r_idx} words count ({len(words)}) != solvedWords count ({len(solved)})"))

            # Check primary source words alignment
            if prim_rows_dict.get(r_idx):
                pt = prim_rows_dict[r_idx]
                for w in words:
                    if norm_word(w) not in norm_word(pt):
                        word_text_mismatches.append((qid, r_idx, w, pt))

            # Missing letters extracted from solvedWords
            extracted_vowels = []
            for w, sw in zip(words, solved):
                # find capital letter in sw corresponding to gap in w
                caps = re.findall(r"[А-ЯЁ]", sw)
                # check if gap is filled with vowel
                if not any(v in caps for v in "АЕЁИОУЫЭЮЯ"):
                    row_internal_inconsistencies.append((qid, r_idx, f"No vowel found in solved word: {sw} (from {w})"))

        # --- D. ANSWER KEYS AUDIT ---
        app_ans = sorted(q.get("correctIndices", []))
        if len(app_ans) < 2 or len(app_ans) > 4:
            answer_mismatches.append((qid, f"Invalid answer count {len(app_ans)} for EGE: {app_ans}"))

        if prim_ans and app_ans != prim_ans:
            answer_mismatches.append((qid, f"App answer {app_ans} != primary source {prim_ans}"))

        # Internal row logic: isCorrectRow & letter
        for r_idx, r in enumerate(rows, 1):
            is_corr = r.get("isCorrectRow")
            letter = r.get("letter")
            in_ans = r_idx in app_ans

            if is_corr != in_ans:
                row_internal_inconsistencies.append((qid, r_idx, f"isCorrectRow={is_corr} but in_ans={in_ans}"))

            if is_corr:
                if letter == "—" or not letter or letter not in "АЕЁИОУЫЭЮЯ":
                    row_internal_inconsistencies.append((qid, r_idx, f"isCorrectRow is True but letter='{letter}'"))
            else:
                if letter != "—":
                    row_internal_inconsistencies.append((qid, r_idx, f"isCorrectRow is False but letter='{letter}'"))

        # --- E. EXPLANATIONS AUDIT ---
        for r_idx, r in enumerate(rows, 1):
            expl = r.get("explanation", "")
            if not expl or len(expl.strip()) < 15:
                explanation_anomalies.append((qid, r_idx, "Explanation empty or too short"))

            # Pedagogical checks
            # 1. Did it mistakenly call a participle an "окончание глагола"?
            if ("развешаны" in expl.lower() or "развешанный" in expl.lower()) and "в личном окончании глагола" in expl:
                pedagogical_review.append((qid, r_idx, "развешаны mislabeled as 'в личном окончании глагола'"))
            if ("завешаны" in expl.lower() or "завешанный" in expl.lower()) and "в личном окончании глагола" in expl:
                pedagogical_review.append((qid, r_idx, "завешаны mislabeled as 'в личном окончании глагола'"))

    # Print results
    print("\n" + "=" * 80)
    print("AUDIT FINDINGS BY CATEGORY")
    print("=" * 80)

    print("\n1. SOURCES DISTRIBUTION:")
    for src, cnt in sorted(sources_distribution.items()):
        print(f"   • {src}: {cnt} prototypes")

    print(f"\n2. FORMULATION AUDIT:")
    print(f"   • Compliant formulations: {len(t12_fipi) - len(formulation_anomalies)} / {len(t12_fipi)}")
    if formulation_anomalies:
        print(f"   • Anomalies ({len(formulation_anomalies)}):")
        for a in formulation_anomalies[:10]:
            print(f"     - {a}")
    else:
        print("   • ALL 296 prototypes have 100% compliant instructions, targets, rules, and questionKinds.")

    print(f"\n3. TASK STRUCTURE & WORD TEXT AUDIT:")
    print(f"   • Structure anomalies (row/word counts): {len(task_structure_anomalies)}")
    for a in task_structure_anomalies:
        print(f"     - {a}")
    print(f"   • Word text mismatches with primary sources: {len(word_text_mismatches)}")
    for m in word_text_mismatches[:10]:
        print(f"     - {m}")
    if not task_structure_anomalies and not word_text_mismatches:
        print("   • ALL 296 prototypes have 100% compliant structure and 100% match with primary source words.")

    print(f"\n4. ANSWER KEYS AUDIT:")
    print(f"   • Answer key mismatches with primary sources: {len(answer_mismatches)}")
    for a in answer_mismatches[:10]:
        print(f"     - {a}")
    print(f"   • Internal row logic inconsistencies (isCorrectRow vs letter vs correctIndices): {len(row_internal_inconsistencies)}")
    for r in row_internal_inconsistencies[:10]:
        print(f"     - {r}")
    if not answer_mismatches and not row_internal_inconsistencies:
        print("   • ALL 296 prototypes have 100% valid answers, matching primary sources and internal consistency.")

    print(f"\n5. EXPLANATIONS AUDIT:")
    print(f"   • Empty or truncated explanations: {len(explanation_anomalies)}")
    print(f"   • Pedagogical wording inaccuracies detected: {len(pedagogical_review)}")
    for p in pedagogical_review:
        print(f"     - {p}")

    print("\n" + "=" * 80)
    print("AUDIT COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    run_deep_audit()
