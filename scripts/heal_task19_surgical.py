#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import sqlite3
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CANONICAL_INSTRUCTION = "Расставьте знаки препинания: укажите все цифры, на месте которых в предложении должны стоять запятые."
CANONICAL_TOPIC = "Знаки препинания в сложноподчинённом предложении"
CANONICAL_RULE = "Знаки препинания в сложноподчинённом предложении (СПП) с придаточными."
CANONICAL_TARGET = "ЗАПЯТЫЕ"

def clean_nf_solution(raw_html: str) -> str:
    if not raw_html:
        return ""
    t = html.unescape(raw_html)
    t = re.sub(r"[\xad\u200b-\u200f\ufeff]", "", t)
    t = re.sub(r"<p>\s*<strong>\s*Источник\b.*?$", "", t, flags=re.I | re.S)
    t = re.sub(r"<p>\s*<strong>\s*Ответ\b.*?$", "", t, flags=re.I | re.S)
    t = re.sub(r"<strong>\s*Ответ\b.*?(?:</p>|$)", "", t, flags=re.I)
    t = re.sub(r"<strong>\s*Источник\b.*?(?:</p>|$)", "", t, flags=re.I)
    t = re.sub(r"<br\s*/?>", "\n", t, flags=re.I)
    t = re.sub(r"</p>|</div>|</li>", "\n", t, flags=re.I)
    t = re.sub(r"<[^>]+>", "", t)
    t = t.replace("\xa0", " ").replace("\u202f", " ")
    lines = [re.sub(r"\s+", " ", l).strip() for l in t.splitlines() if re.sub(r"\s+", " ", l).strip()]
    if lines and re.match(r"^решение:?$", lines[0], re.I):
        lines = lines[1:]
    return "\n".join(lines)

def clean_shk_solution(raw_html: str) -> str:
    if not raw_html:
        return ""
    t = html.unescape(raw_html)
    t = re.sub(r"<!--.*?-->", "", t, flags=re.S)
    t = re.sub(r"[\xad\u200b-\u200f\ufeff]", "", t)
    t = re.sub(r"<br\s*/?>", "\n", t, flags=re.I)
    t = re.sub(r"</p>|</div>|</li>", "\n", t, flags=re.I)
    t = re.sub(r"<[^>]+>", "", t)
    t = t.replace("\xa0", " ").replace("\u202f", " ")
    lines = []
    for l in t.splitlines():
        cl = re.sub(r"\s+", " ", l).strip()
        if not cl:
            continue
        if cl in (
            "Грамматические основы",
            "Союзные слова",
            "Союзы",
            "Придаточная часть выделена цветом",
            "Придаточные части выделены цветом",
            "Главная часть выделена цветом",
            "Союзы и союзные слова"
        ):
            continue
        if re.match(r"^\(,\)$", cl):
            continue
        lines.append(cl)
    return "\n".join(lines)

def extract_digit_explanation(full_expl: str, digit: int) -> str:
    lines = full_expl.split("\n")
    matches = []
    d_str = str(digit)
    header_pat = re.compile(
        rf"(?:(?:[Цц]ифр[аы]|позици[яи]|на месте)\s+)?\b{d_str}\b(?:\s*,\s*\d+)*\s*[-–—:]"
        rf"|\b{d_str}\s*[-–—:]"
        rf"|[Зз]апят(?:ая|ые)\s+в\s+цифр(?:е|ах)\s+(?:(?:\d+\s*(?:,|и)\s*)*){d_str}\b"
        rf"|[Цц]ифр(?:а|ы)\s+(?:(?:\d+\s*(?:,|и)\s*)*){d_str}\b",
        re.I
    )
    for l in lines:
        if header_pat.search(l):
            matches.append(l.strip())
    if matches:
        return " ".join(matches)
    return ""

def main():
    print("Loading primary sources...")
    with open(ROOT / ".cache/neofamily_4_22.json", "r", encoding="utf-8") as f:
        nf_raw = json.load(f)
    nf_tasks = {str(item["id"]): item for item in nf_raw.get("19", [])}

    con = sqlite3.connect("/home/sergei/ege_trainer/ege_trainer.db")
    cur = con.cursor()
    cur.execute("""
        SELECT k.id, k.solution_html, k.answer_text, th.name
        FROM tasks k
        JOIN themes th ON k.theme_id = th.id
        JOIN parent_topics p ON th.parent_topic_id = p.id
        WHERE p.subject_id = 2 AND p.exam_position = 19
    """)
    shk_tasks = {str(r[0]): {"solution_html": r[1], "answer_text": r[2], "theme_name": r[3]} for r in cur.fetchall()}
    con.close()

    print(f"Loaded {len(nf_tasks)} NF and {len(shk_tasks)} SHK tasks.")

    fipi_path = ROOT / "public/data/fipiTasksBank.json"
    fipi_9_15_path = ROOT / "public/data/fipiTasksBank9_15.json"
    sprint_path = ROOT / "public/data/sprintBank.json"
    sprint_9_15_path = ROOT / "public/data/sprintBank9_15.json"

    with open(fipi_path, "r", encoding="utf-8") as f:
        all_fipi = json.load(f)
    with open(sprint_path, "r", encoding="utf-8") as f:
        all_sprint = json.load(f)

    clean_solutions_cache = {}
    fipi_19_count = 0
    for q in all_fipi:
        if str(q.get("task")) != "19":
            continue
        fipi_19_count += 1
        qid = q["id"]

        q["instruction"] = CANONICAL_INSTRUCTION
        q["topic"] = CANONICAL_TOPIC
        q["rule"] = CANONICAL_RULE
        q["target"] = CANONICAL_TARGET

        full_sol = ""
        source_label = q.get("source", "")
        if qid.startswith("nf-19-"):
            ext_id = qid.replace("nf-19-", "")
            orig = nf_tasks.get(ext_id)
            if orig:
                full_sol = clean_nf_solution(orig.get("solution", ""))
                source_label = "NeoFamily · Реальный ЕГЭ / ФИПИ"
        elif qid.startswith("shk-19-"):
            ext_id = qid.replace("shk-19-", "")
            orig = shk_tasks.get(ext_id)
            if orig:
                full_sol = clean_shk_solution(orig.get("solution_html", ""))
                source_label = f"Школково · {orig.get('theme_name', '19. СПП')}"

        if not full_sol:
            full_sol = "Запятая ставится на границе главной и придаточной частей сложноподчинённого предложения (СПП)."

        clean_solutions_cache[qid] = full_sol
        q["source"] = source_label
        q["explanation"] = full_sol

        sentence = q.get("sentence", "")
        gap_digits = [int(m) for m in re.findall(r"\((\d+)\)", sentence)]
        correct_indices = sorted(q.get("correctIndices", []))

        new_rows = []
        for d in gap_digits:
            is_comma = d in correct_indices
            d_expl = extract_digit_explanation(full_sol, d)
            if not d_expl:
                comma_str = "запятая ставится" if is_comma else "запятая не нужна"
                d_expl = f"Позиция ({d}) — {comma_str}. {full_sol}"
            
            row_expl = full_sol if d == 1 else d_expl
            new_rows.append({
                "words": [f"Позиция ({d})"],
                "solvedWords": [f"({d}) — {'запятая ставится' if is_comma else 'запятая не нужна'}"],
                "letter": "," if is_comma else "—",
                "isCorrectRow": is_comma,
                "explanation": row_expl,
            })
        q["rows"] = new_rows

    print(f"Healed {fipi_19_count} FIPI questions.")

    # Match sprint cards
    sent_to_fipi = {}
    for q in all_fipi:
        if str(q.get("task")) == "19":
            s_key = re.sub(r"\s+", " ", q.get("sentence", "")).strip()[:80]
            sent_to_fipi[s_key] = q

    sprint_19_count = 0
    for s in all_sprint:
        if str(s.get("task")) != "19":
            continue
        sprint_19_count += 1
        
        ctx = s.get("context", "")
        m_digit = re.search(r"\((\d+)\)", s.get("prefix", "") or ctx)
        digit = int(m_digit.group(1)) if m_digit else 1
        
        matched_q = None
        for s_key, fq in sent_to_fipi.items():
            if s_key in ctx:
                matched_q = fq
                break
        
        is_comma = False
        full_sol = ""
        if matched_q:
            is_comma = digit in matched_q.get("correctIndices", [])
            full_sol = clean_solutions_cache.get(matched_q["id"], "")
        else:
            is_comma = s.get("answer") == "ЗАПЯТАЯ НУЖНА"
            full_sol = "Запятая ставится на границе главной и придаточной частей СПП."

        ans_lbl = "ЗАПЯТАЯ НУЖНА" if is_comma else "БЕЗ ЗАПЯТОЙ"
        s["answer"] = ans_lbl
        s["options"] = ["ЗАПЯТАЯ НУЖНА", "БЕЗ ЗАПЯТОЙ"]
        s["prefix"] = f"Нужна ли запятая на месте ({digit})?"
        s["topic"] = CANONICAL_TOPIC
        s["rule"] = CANONICAL_RULE
        
        comma_str = "запятая ставится" if is_comma else "запятая не нужна"
        d_expl = extract_digit_explanation(full_sol, digit) if full_sol else ""
        if d_expl:
            s["explanation"] = f"Позиция ({digit}) — {comma_str}. {d_expl}"
        elif full_sol:
            s["explanation"] = f"Позиция ({digit}) — {comma_str}. {full_sol.splitlines()[0]}"
        else:
            s["explanation"] = f"Позиция ({digit}) — {comma_str} по правилу обособления придаточных частей в СПП."

    print(f"Healed {sprint_19_count} Sprint cards.")

    # Write files atomically
    for path, data in [
        (fipi_path, all_fipi),
        (fipi_9_15_path, all_fipi),
        (sprint_path, all_sprint),
        (sprint_9_15_path, all_sprint)
    ]:
        tmp_path = path.with_suffix(".tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        tmp_path.replace(path)
        print(f"Written {path.name} successfully.")

if __name__ == "__main__":
    main()
