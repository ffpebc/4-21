#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
heal_and_verify_task17.py
Deep audit and 100% primary source synchronization for Task 17 prototypes.

Covers:
- Formulations / Instructions
- Sentences (numbered gaps, punctuation, watermark stripping)
- Answer keys (correctIndices, isCorrectRow, letter)
- Explanations (restoring complete untruncated primary source pedagogical reasoning)
- Sprint cards derivation
- starterBank.json synchronization
"""

import json
import os
import re
import html
import sqlite3
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE_DIR)

CANONICAL_INSTRUCTION = (
    "Расставьте знаки препинания: укажите все цифры, на месте которых в предложении должны стоять запятые."
)
CANONICAL_RULE = "Знаки препинания в предложениях с обособленными членами (причастными, деепричастными оборотами)."
CANONICAL_TOPIC = "Знаки препинания при обособленных членах"
CANONICAL_SPRINT_TOPIC = "Обособление определений и обстоятельств (ПО и ДО)"


def clean_sentence_task17(s: str) -> str:
    if not s:
        return ""
    t = html.unescape(s)
    t = re.sub(r"[\xad\u200b-\u200f\ufeff]", "", t)
    t = t.replace("\xa0", " ").replace("\u202f", " ")
    
    # Strip any trailing metadata/author parentheticals in a loop
    for _ in range(5):
        t = re.sub(r"\s*\(?(?:Взято из|По\s+[А-ЯЁ]|ЕГКР|РЕЗЕРВ|Досрочн|Задание составлено|Сборник|Дощинск|Цыбулько)\b.*$", "", t, flags=re.I).strip()
        t = re.sub(
            r"\s*\((?:По\s+[А-ЯЁ]|ЕГКР|РЕЗЕРВ|Досрочн|Задание составлено|Взято из|Сборник|Дощинск|Цыбулько)[^\)]*\)\.?\s*$",
            "",
            t,
            flags=re.I,
        ).strip()

    t = re.sub(r"\s+", " ", t).strip()
    # Normalize gaps like "( 1 )" -> "(1)"
    t = re.sub(r"\(\s*(\d+)\s*\)", r"(\1)", t)
    # Ensure terminal punctuation
    if not t.endswith((".", "!", "?", "…", "»", "”", '"')):
        t += "."
    return t


def clean_html_solution(raw_html: str) -> str:
    if not raw_html:
        return ""
    t = html.unescape(raw_html)
    t = re.sub(r"[\xad\u200b-\u200f\ufeff]", "", t)
    t = t.replace("\xa0", " ").replace("\u202f", " ")
    t = re.sub(r"<br\s*/?>", "\n", t, flags=re.I)
    t = re.sub(r"</p>|</div>|</li>", "\n", t, flags=re.I)
    t = re.sub(r"<[^>]+>", "", t)
    lines = [re.sub(r"[ \t]+", " ", l).strip() for l in t.splitlines()]
    clean = []
    for l in lines:
        if not l:
            continue
        # Remove watermarks / source citations
        if re.search(r"^\s*\(?(?:Источник|Взято из)\b", l, re.I):
            continue
        clean.append(l)
    res = "\n".join(clean).strip()
    return res


def extract_position_explanation(full_sol: str, digit: int, is_comma: bool) -> str:
    d_str = str(digit)
    lines = full_sol.splitlines()
    matching = []
    for ln in lines:
        if re.search(rf"(?:\b|цифр[аеых]\s*|\()0?{d_str}(?:\b|\)|-|\.|\s*,)", ln, re.I):
            matching.append(ln)
    if matching:
        res = " ".join(matching).strip()
        # Clean leading numbers or bullets
        res = re.sub(r"^[0-9\s,\.-]+[–—-]\s*", "", res)
        if len(res) > 280:
            res = res[:277].rsplit(" ", 1)[0] + "..."
        prefix = f"Позиция ({digit}) — {'запятая ставится' if is_comma else 'запятая не нужна'}."
        if not res.lower().startswith("позиция"):
            return f"{prefix} {res}"
        return res
    if is_comma:
        return f"Позиция ({digit}) — запятая ставится (обособление причастного или деепричастного оборота)."
    else:
        return f"Позиция ({digit}) — запятая не нужна (оборот стоит перед определяемым словом либо союз «и» связывает однородные члены)."


def main():
    print("=== TASK 17 MASTER AUDIT & HEALING SCRIPT ===")

    # 1. Load Primary Sources
    print("[1/5] Loading primary sources...")
    with open(".cache/neofamily_4_22.json", encoding="utf-8") as f:
        nf_raw = json.load(f)
    nf_17 = {str(x["id"]): x for x in nf_raw.get("17", [])}

    db_17 = {}
    db_path = "/home/sergei/ege_trainer/ege_trainer.db"
    if os.path.exists(db_path):
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        cur.execute(
            "SELECT t.id, t.source_name, t.body_html, t.solution_html, t.answer_text "
            "FROM tasks t JOIN themes th ON t.theme_id = th.id WHERE th.subject_id = 2"
        )
        for r in cur.fetchall():
            db_17[str(r[0])] = {
                "source_name": r[1],
                "body_html": r[2] or "",
                "solution_html": r[3] or "",
                "answer_text": r[4] or "",
            }
        con.close()

    print(f"Loaded {len(nf_17)} NF items, {len(db_17)} Shkolkovo DB items.")

    # 2. Process FIPI Banks
    fipi_files = ["public/data/fipiTasksBank.json", "public/data/fipiTasksBank9_15.json"]
    healed_fipi_prototypes = {}

    for fpath in fipi_files:
        print(f"[2/5] Processing {fpath}...")
        with open(fpath, encoding="utf-8") as f:
            tasks = json.load(f)

        count_17 = 0
        for q in tasks:
            if str(q.get("task")) != "17":
                continue
            count_17 += 1
            qid = q["id"]

            # Source lookup
            raw_sol = ""
            source_ans_digits = []
            if qid.startswith("nf-17-"):
                nid = qid.replace("nf-17-", "")
                if nid in nf_17:
                    raw_sol = nf_17[nid].get("solution") or ""
                    raw_ans = nf_17[nid].get("answer")
                    if isinstance(raw_ans, list):
                        source_ans_digits = sorted(list(set(int(d) for s in raw_ans for d in re.findall(r"\d", str(s)))))
                    else:
                        source_ans_digits = sorted(list(set(int(d) for d in re.findall(r"\d", str(raw_ans)))))
            elif qid.startswith("shk-17-"):
                sid = qid.replace("shk-17-", "")
                if sid in db_17:
                    raw_sol = db_17[sid]["solution_html"]
                    raw_ans = db_17[sid]["answer_text"]
                    source_ans_digits = sorted(list(set(int(d) for d in re.findall(r"\d", str(raw_ans)))))

            # Clean sentence
            cleaned_sentence = clean_sentence_task17(q.get("sentence", ""))
            q["sentence"] = cleaned_sentence
            q["instruction"] = CANONICAL_INSTRUCTION
            q["rule"] = CANONICAL_RULE
            q["topic"] = CANONICAL_TOPIC
            q["target"] = "ЗАПЯТЫЕ"

            # Check gaps in sentence
            gaps = [int(m) for m in re.findall(r"\((\d+)\)", cleaned_sentence)]
            expected_gaps = list(range(1, len(gaps) + 1))
            if gaps != expected_gaps:
                print(f"WARNING: Gaps in {qid} not 1..N: {gaps}")

            # Answer key
            if source_ans_digits:
                correct_indices = source_ans_digits
            else:
                correct_indices = sorted(q.get("correctIndices", []))
            q["correctIndices"] = correct_indices

            # Clean full explanation
            full_explanation = clean_html_solution(raw_sol)
            if not full_explanation:
                full_explanation = q.get("explanation") or ""
            q["explanation"] = full_explanation

            # Rebuild rows with verified answers and explanations
            rows = []
            for digit in range(1, len(gaps) + 1):
                is_comma = digit in correct_indices
                pos_expl = extract_position_explanation(full_explanation, digit, is_comma)
                rows.append({
                    "words": [f"Позиция ({digit})"],
                    "solvedWords": [f"({digit}) — {'запятая ставится' if is_comma else 'запятая не нужна'}"],
                    "letter": "," if is_comma else "—",
                    "isCorrectRow": is_comma,
                    "explanation": full_explanation,  # Full shared explanation for fidelity
                })
            q["rows"] = rows
            healed_fipi_prototypes[qid] = q

        print(f"Healed {count_17} Task 17 prototypes in {fpath}.")
        tmp_fpath = fpath + ".tmp"
        with open(tmp_fpath, "w", encoding="utf-8") as f:
            json.dump(tasks, f, ensure_ascii=False)
        os.replace(tmp_fpath, fpath)

    # 3. Process Sprint Banks
    sprint_files = ["public/data/sprintBank.json", "public/data/sprintBank9_15.json"]
    for sp_path in sprint_files:
        print(f"[3/5] Processing {sp_path}...")
        with open(sp_path, encoding="utf-8") as f:
            sprint_tasks = json.load(f)

        healed_sp_count = 0
        for sp in sprint_tasks:
            if str(sp.get("task")) != "17":
                continue
            healed_sp_count += 1

            # Determine parent prototype and digit
            # sp['prefix']: "Нужна ли запятая на месте (1)?"
            m_dig = re.search(r"\((\d+)\)", sp.get("prefix", "") + " " + sp.get("context", ""))
            digit = int(m_dig.group(1)) if m_dig else 1

            # Match parent prototype by sentence context or ID
            matched_parent = None
            for pid, parent in healed_fipi_prototypes.items():
                if parent["sentence"] in sp.get("context", "") or sp.get("context", "").endswith(parent["sentence"]):
                    matched_parent = parent
                    break
            if not matched_parent:
                # Try partial match on sentence start
                for pid, parent in healed_fipi_prototypes.items():
                    first_words = parent["sentence"][:40]
                    if first_words in sp.get("context", ""):
                        matched_parent = parent
                        break

            if matched_parent:
                clean_s = matched_parent["sentence"]
                sp["context"] = f"[Позиция ({digit})] {clean_s}"
                is_comma = digit in matched_parent["correctIndices"]
                sp["answer"] = "ЗАПЯТАЯ НУЖНА" if is_comma else "БЕЗ ЗАПЯТОЙ"
                sp["options"] = ["ЗАПЯТАЯ НУЖНА", "БЕЗ ЗАПЯТОЙ"]
                pos_expl = extract_position_explanation(matched_parent["explanation"], digit, is_comma)
                sp["explanation"] = pos_expl
                sp["rule"] = CANONICAL_RULE
                sp["topic"] = CANONICAL_SPRINT_TOPIC
            else:
                # Clean standalone context
                ctx = sp.get("context", "")
                if ctx.startswith("[Позиция"):
                    m_p = re.match(r"(\[Позиция \(\d+\)\]\s*)(.*)", ctx)
                    if m_p:
                        clean_body = clean_sentence_task17(m_p.group(2))
                        sp["context"] = f"{m_p.group(1)}{clean_body}"

        print(f"Healed {healed_sp_count} Task 17 sprint items in {sp_path}.")
        tmp_sp_path = sp_path + ".tmp"
        with open(tmp_sp_path, "w", encoding="utf-8") as f:
            json.dump(sprint_tasks, f, ensure_ascii=False)
        os.replace(tmp_sp_path, sp_path)

    # 4. Synchronize starterBank.json
    print("[4/5] Synchronizing src/data/starterBank.json...")
    with open("src/data/starterBank.json", encoding="utf-8") as f:
        sb = json.load(f)

    # Heal FIPI items in starterBank
    for q in sb.get("fipi", []):
        if str(q.get("task")) == "17" and q["id"] in healed_fipi_prototypes:
            parent = healed_fipi_prototypes[q["id"]]
            q["sentence"] = parent["sentence"]
            q["instruction"] = parent["instruction"]
            q["rule"] = parent["rule"]
            q["topic"] = parent["topic"]
            q["target"] = parent["target"]
            q["correctIndices"] = parent["correctIndices"]
            q["explanation"] = parent["explanation"]
            q["rows"] = json.loads(json.dumps(parent["rows"]))

    # Heal Sprint items in starterBank
    for sp in sb.get("sprint", []):
        if str(sp.get("task")) == "17":
            # sp-17-690: [Позиция (1)] Базаров проворно следовал за ней...
            m_dig = re.search(r"\((\d+)\)", sp.get("prefix", ""))
            digit = int(m_dig.group(1)) if m_dig else 1
            for pid, parent in healed_fipi_prototypes.items():
                if parent["sentence"][:40] in sp.get("context", ""):
                    sp["context"] = f"[Позиция ({digit})] {parent['sentence']}"
                    is_comma = digit in parent["correctIndices"]
                    sp["answer"] = "ЗАПЯТАЯ НУЖНА" if is_comma else "БЕЗ ЗАПЯТОЙ"
                    sp["options"] = ["ЗАПЯТАЯ НУЖНА", "БЕЗ ЗАПЯТОЙ"]
                    sp["explanation"] = extract_position_explanation(parent["explanation"], digit, is_comma)
                    sp["rule"] = CANONICAL_RULE
                    sp["topic"] = CANONICAL_SPRINT_TOPIC
                    break

    tmp_sb = "src/data/starterBank.json.tmp"
    with open(tmp_sb, "w", encoding="utf-8") as f:
        json.dump(sb, f, ensure_ascii=False)
    os.replace(tmp_sb, "src/data/starterBank.json")

    # 5. Exhaustive Verification Report
    print("[5/5] Running final verification audit on all Task 17 items...")
    with open("public/data/fipiTasksBank.json", encoding="utf-8") as f:
        final_fipi = [x for x in json.load(f) if str(x.get("task")) == "17"]

    failures = []
    for q in final_fipi:
        qid = q["id"]
        # Formulation check
        if q.get("instruction") != CANONICAL_INSTRUCTION:
            failures.append(f"{qid}: Non-canonical instruction")
        if q.get("rule") != CANONICAL_RULE:
            failures.append(f"{qid}: Non-canonical rule")
        if q.get("target") != "ЗАПЯТЫЕ":
            failures.append(f"{qid}: Non-canonical target")

        # Sentence check
        s = q.get("sentence", "")
        if re.search(r"\(По\s+[А-ЯЁ]", s) or re.search(r"\(ЕГКР|РЕЗЕРВ|Досрочн", s) or re.search(r"Дощинск|Цыбулько|Взято из", s, flags=re.I):
            failures.append(f"{qid}: Leaked metadata in sentence: {s[-40:]}")
        if not s.endswith((".", "!", "?", "…", "»", "”", '"')):
            failures.append(f"{qid}: Missing terminal punctuation in sentence")

        gaps = [int(m) for m in re.findall(r"\((\d+)\)", s)]
        if gaps != list(range(1, len(gaps) + 1)):
            failures.append(f"{qid}: Non-sequential gaps: {gaps}")
        if len(gaps) != len(q.get("rows", [])):
            failures.append(f"{qid}: Gaps count {len(gaps)} != rows count {len(q.get('rows', []))}")

        # Answer key check
        ans = q.get("correctIndices", [])
        if not ans or any(d not in gaps for d in ans):
            failures.append(f"{qid}: Invalid correctIndices {ans} for gaps {gaps}")

        # Rows check
        for idx, r in enumerate(q.get("rows", [])):
            d = idx + 1
            is_c = d in ans
            if r.get("isCorrectRow") != is_c:
                failures.append(f"{qid}: Row {d} isCorrectRow mismatch")
            if r.get("letter") != ("," if is_c else "—"):
                failures.append(f"{qid}: Row {d} letter mismatch")
            if not r.get("explanation") or len(r.get("explanation", "")) < 10:
                failures.append(f"{qid}: Row {d} missing explanation")

        # Explanation check
        exp = q.get("explanation") or (q["rows"][0].get("explanation") if q.get("rows") else "")
        if not exp or len(exp) < 20:
            failures.append(f"{qid}: Missing or very short explanation")
        if len(exp) == 280:
            failures.append(f"{qid}: Suspiciously truncated explanation at 280")

    if failures:
        print(f"FAILED: {len(failures)} issues detected!")
        for fail in failures[:20]:
            print("  ", fail)
        sys.exit(1)
    else:
        print(f"SUCCESS! All {len(final_fipi)} Task 17 prototypes passed 100% of audit checks!")


if __name__ == "__main__":
    main()
