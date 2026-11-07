#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Memory-efficient exhaustive audit for all Task 21 prototypes.
"""

import json
import sqlite3
import re
import html
import gc

def clean_html_text(raw_html: str) -> str:
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

def detect_primary_mark(body_html: str) -> str:
    txt = clean_html_text(body_html)
    before_1 = re.split(r'\(\s*1\s*\)', txt)[0].lower()
    if "тире" in before_1:
        return "ТИРЕ"
    elif "двоеточи" in before_1:
        return "ДВОЕТОЧИЕ"
    elif "запят" in before_1:
        return "ЗАПЯТАЯ"
    return "ТИРЕ"

def parse_answer_tokens(raw_ans, max_num):
    if isinstance(raw_ans, list):
        ans_parts = [str(x).strip() for x in raw_ans if str(x).strip()]
    else:
        ans_parts = [p.strip() for p in re.split(r'(?:\s+или\s+|//|[\n,;/|]+)', str(raw_ans or '')) if p.strip()]
    
    groups = []
    for p in ans_parts:
        toks = [int(x) for x in re.findall(r'\d+', p)]
        if len(toks) >= 2 and all(x <= max_num for x in toks):
            g = sorted(set(toks))
            if g not in groups:
                groups.append(g)
        elif len(toks) == 1:
            s = str(toks[0])
            res = []
            i = 0
            while i < len(s):
                if i + 2 <= len(s) and int(s[i:i+2]) <= max_num and int(s[i:i+2]) >= 10:
                    res.append(int(s[i:i+2]))
                    i += 2
                else:
                    res.append(int(s[i]))
                    i += 1
            if len(res) >= 2 and all(x <= max_num for x in res):
                g = sorted(set(res))
                if g not in groups:
                    groups.append(g)
    return groups

def main():
    print("Loading Task 21 prototypes...")
    with open("public/data/fipiTasksBank.json", "r", encoding="utf-8") as f:
        all_q = json.load(f)
    t21_list = [q for q in all_q if str(q.get("task")) == "21"]
    del all_q
    gc.collect()

    print(f"Loaded {len(t21_list)} Task 21 prototypes.")

    # Load only Task 21 from NeoFamily
    with open(".cache/neofamily_4_22.json", "r", encoding="utf-8") as f:
        nf_raw = json.load(f)
    nf_map = {str(item["id"]): item for item in nf_raw.get("21", [])}
    del nf_raw
    gc.collect()

    con = sqlite3.connect("/home/sergei/ege_trainer/ege_trainer.db")
    cur = con.cursor()

    formulation_mismatches = []
    placeholder_rows = []
    ocr_corruptions = []
    html_in_rows = []
    answer_mismatches = []
    missing_mark_in_answer_sent = []
    row_alignment_mismatches = []
    explanation_issues = []

    for q in t21_list:
        qid = q["id"]
        raw_id = qid.split("-")[-1]

        if qid.startswith("nf-"):
            prim = nf_map.get(raw_id)
            if not prim:
                continue
            prim_body = prim.get("question", "")
            prim_ans = prim.get("answer", "")
            prim_sol = clean_html_text(prim.get("solution", ""))
        else:
            cur.execute("SELECT body_html, answer_text, solution_html FROM tasks WHERE id = ?", (raw_id,))
            row = cur.fetchone()
            if not row:
                continue
            prim_body = row[0] or ""
            prim_ans = row[1] or ""
            prim_sol = clean_html_text(row[2] or "")

        # 1. Formulation check
        prim_mark = detect_primary_mark(prim_body)
        inst = q.get("instruction", "")
        app_mark = "ТИРЕ" if "ТИРЕ" in inst else ("ДВОЕТОЧИЕ" if "ДВОЕТОЧИЕ" in inst else ("ЗАПЯТАЯ" if "ЗАПЯТА" in inst else "UNKNOWN"))
        if prim_mark != app_mark:
            formulation_mismatches.append({"id": qid, "prim": prim_mark, "app": app_mark})

        # 2. Sentences check
        app_rows = q.get("rows", [])
        for idx, row in enumerate(app_rows, 1):
            w = row["words"][0] if row.get("words") else ""
            if w.startswith("Предложение ("):
                placeholder_rows.append({"id": qid, "row": idx})
            if re.search(r"<[^>]+>", w):
                html_in_rows.append({"id": qid, "row": idx, "text": w})
            if "(З)" in w or "(з)" in w or re.search(r"«3а\b", w):
                ocr_corruptions.append({"id": qid, "row": idx, "text": w})

        # 3. Answer check
        groups = parse_answer_tokens(prim_ans, len(app_rows))
        app_corr = q.get("correctIndices", [])
        if groups and app_corr not in groups:
            answer_mismatches.append({"id": qid, "app": app_corr, "prim": groups})

        for idx, row in enumerate(app_rows, 1):
            is_corr = idx in app_corr
            if row.get("isCorrectRow") != is_corr:
                row_alignment_mismatches.append({"id": qid, "row": idx})
            expected_letter = str(idx) if is_corr else "—"
            if row.get("letter") != expected_letter:
                row_alignment_mismatches.append({"id": qid, "row": idx, "letter": row.get("letter")})

        for cidx in app_corr:
            if 1 <= cidx <= len(app_rows):
                sent_txt = app_rows[cidx - 1]["words"][0]
                has_mark = False
                if app_mark == "ТИРЕ":
                    has_mark = bool(re.search(r"[-–—−―]", sent_txt))
                elif app_mark == "ДВОЕТОЧИЕ":
                    has_mark = ":" in sent_txt
                elif app_mark == "ЗАПЯТАЯ":
                    has_mark = "," in sent_txt
                if not has_mark:
                    missing_mark_in_answer_sent.append({"id": qid, "cidx": cidx, "mark": app_mark})

        # 4. Explanation check
        expl = q.get("explanation", "")
        if not expl or len(expl.strip()) < 10:
            explanation_issues.append({"id": qid, "type": "empty_or_short"})

    con.close()

    print("\n=== AUDIT RESULTS FOR TASK 21 ===")
    print(f"Total prototypes verified: {len(t21_list)}")
    print(f"Formulation mismatches: {len(formulation_mismatches)}")
    print(f"Placeholder rows: {len(placeholder_rows)}")
    print(f"OCR corruptions: {len(ocr_corruptions)}")
    print(f"HTML in rows: {len(html_in_rows)}")
    print(f"Answer mismatches: {len(answer_mismatches)}")
    print(f"Missing punctuation mark in answer sentences: {len(missing_mark_in_answer_sent)}")
    print(f"Row alignment mismatches: {len(row_alignment_mismatches)}")
    print(f"Explanation issues: {len(explanation_issues)}")

if __name__ == "__main__":
    main()
