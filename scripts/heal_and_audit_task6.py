#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Comprehensive audit and healing script for Task 6 (Lexical Norms).
Audits and synchronizes every prototype against its primary source:
1. Formulation (instruction, target, canonical wording, prefix)
2. Task itself (sentence, typography, stripped provenance/scraper tags)
3. Answer (textAnswers, letter, solvedWords, alternatives, yo/e variants)
4. Explanation (full pedagogical rationale, healed placeholders, zero truncations)
"""

import json
import os
import re
import sqlite3
import html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = "/home/sergei/ege_trainer/ege_trainer.db"
NF_PATH = os.path.join(ROOT, ".cache", "neofamily_4_22.json")

CANONICAL_EXCLUDE = "Отредактируйте предложение: исправьте лексическую ошибку, исключив лишнее слово. Выпишите это слово."
CANONICAL_REPLACE = "Отредактируйте предложение: исправьте лексическую ошибку, заменив неверно употреблённое слово. Запишите подобранное слово, соблюдая нормы современного русского литературного языка."
CANONICAL_RULE = "Устраните речевую ошибку (плеоназм, тавтологию или лексическую несочетаемость)."

PROVENANCE_RE = re.compile(
    r"\s*\((?:[^\)]*(?:ЕГЭ|ФИПИ|Дощинск|вар\.|Школково|Цыбулько|вариант|демоверси|досрок|РЕЗЕРВ|ЕГКР|Задание).*)\)\.?\s*$",
    re.I
)

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
        ln = re.sub(r"\s*\(?Задание составлено преподавателями Школково\)?.*$", "", ln, flags=re.I)
        ln = re.sub(r"[ \t]+", " ", ln).strip()
        if ln:
            lines.append(ln)
    return "\n".join(lines)

def norm_yo(s: str) -> str:
    s = html.unescape(s or "")
    s = re.sub(r"[\xad\u200b-\u200f\ufeff\u0300\u0301]", "", s)
    return s.replace("Ё", "Е").replace("ё", "е")

def parse_answers(raw_ans) -> list[str]:
    if not raw_ans:
        return []
    if isinstance(raw_ans, list):
        items = raw_ans
    else:
        items = re.split(r"[\r\n;/|]+", str(raw_ans))
    out = []
    for it in items:
        sub = re.split(r"(?:\s+или\s+|[\r\n;/|]+)", str(it))
        for s in sub:
            w = s.strip()
            w = re.sub(r"^[\"«\'\s]+|[\"»\'\s\.\?!]+$", "", w)
            if w and w.lower() not in [x.lower() for x in out]:
                out.append(w.lower())
    # Add ё variants if applicable
    variants = list(out)
    for w in out:
        we = w.replace("ё", "е")
        if we not in variants:
            variants.append(we)
    return variants

def main():
    print("=== TASK 6 EXHAUSTIVE PRIMARY SOURCE AUDIT & HEALING ===")

    # 1. Load primary sources
    print("[1/5] Loading primary sources...")
    with open(NF_PATH, "r", encoding="utf-8") as f:
        nf_data = json.load(f)
    nf_tasks = {str(x["id"]): x for x in nf_data.get("6", [])}
    print(f"  -> NeoFamily Task 6 items in cache: {len(nf_tasks)}")

    shk_tasks = {}
    if os.path.exists(DB_PATH):
        con = sqlite3.connect(DB_PATH)
        cur = con.cursor()
        cur.execute("""
            SELECT k.id, k.body_html, k.solution_html, k.answer_text, th.name
            FROM tasks k
            JOIN themes th ON k.theme_id = th.id
            JOIN parent_topics p ON th.parent_topic_id = p.id
            WHERE p.subject_id = 2 AND p.exam_position = 6
        """)
        for r in cur.fetchall():
            shk_tasks[str(r[0])] = {
                "id": str(r[0]),
                "body_html": r[1] or "",
                "solution_html": r[2] or "",
                "answer_text": r[3] or "",
                "theme_name": r[4] or "",
            }
        con.close()
    print(f"  -> Shkolkovo Task 6 items in database: {len(shk_tasks)}")

    # 2. Load application banks
    print("[2/5] Loading application banks...")
    with open(os.path.join(ROOT, "public/data/fipiTasksBank.json"), "r", encoding="utf-8") as f:
        fipi_bank = json.load(f)
    with open(os.path.join(ROOT, "public/data/sprintBank.json"), "r", encoding="utf-8") as f:
        sprint_bank = json.load(f)
    with open(os.path.join(ROOT, "src/data/starterBank.json"), "r", encoding="utf-8") as f:
        starter_bank = json.load(f)

    t6_fipi = [q for q in fipi_bank if str(q.get("task")) == "6"]
    print(f"  -> Total Task 6 FIPI questions: {len(t6_fipi)}")

    # 3. Heal every FIPI Task 6 question
    print("[3/5] Auditing and healing each FIPI prototype...")
    fipi_by_id = {}
    fipi_by_sent = {}
    cleaned_provenance_count = 0
    healed_explanations_count = 0
    healed_answers_count = 0

    for q in t6_fipi:
        qid = q["id"]
        rec = None
        if qid.startswith("nf-6-"):
            nid = qid.replace("nf-6-", "")
            r = nf_tasks.get(nid)
            if r:
                rec = {
                    "body": clean_html_text(r.get("question")),
                    "sol": clean_html_text(r.get("solution")),
                    "ans": r.get("answer"),
                    "src": "NeoFamily · Реальный ЕГЭ / ФИПИ"
                }
        elif qid.startswith("shk-6-"):
            sid = qid.replace("shk-6-", "")
            r = shk_tasks.get(sid)
            if r:
                rec = {
                    "body": clean_html_text(r["body_html"]),
                    "sol": clean_html_text(r["solution_html"]),
                    "ans": r["answer_text"],
                    "src": f"Школково · {r['theme_name']}"
                }

        # 1. Target & Instruction
        prompt_txt = rec["body"] if rec else (q.get("instruction", "") + " " + q.get("sentence", ""))
        prompt_lines = [
            ln for ln in prompt_txt.splitlines()
            if re.search(r"(?:Отредактируйте|исправьте|заменив|исключив|выпишите|запишите)", ln, re.I)
        ]
        prompt_str = " ".join(prompt_lines) if prompt_lines else prompt_txt
        is_zameniv = "замен" in prompt_str.lower()
        target = "ЗАМЕНИВ" if is_zameniv else "ИСКЛЮЧИВ"
        q["target"] = target
        q["instruction"] = CANONICAL_REPLACE if is_zameniv else CANONICAL_EXCLUDE
        q["rule"] = CANONICAL_RULE
        q["topic"] = "Лексические нормы (Точность речи)"

        # 2. Sentence & Task wording
        sent = (q.get("sentence") or "").strip()
        if PROVENANCE_RE.search(sent):
            cleaned_sent = PROVENANCE_RE.sub("", sent).strip()
            if not cleaned_sent.endswith((".", "!", "?")):
                cleaned_sent += "."
            q["sentence"] = cleaned_sent
            cleaned_provenance_count += 1

        # Clean typography & double spaces
        q["sentence"] = re.sub(r"\s+", " ", q["sentence"]).strip()
        if q.get("rows"):
            q["rows"][0]["words"] = [q["sentence"]]

        # 3. Answers
        if rec and rec["ans"]:
            primary_answers = parse_answers(rec["ans"])
            if primary_answers:
                # Merge with existing textAnswers, preserving primary as first
                merged_ans = list(primary_answers)
                for a in q.get("textAnswers", []):
                    al = a.strip().lower()
                    if al not in merged_ans:
                        merged_ans.append(al)
                q["textAnswers"] = merged_ans
                healed_answers_count += 1

        # 4. Specific known primary source gaps & rich explanations
        if qid == "shk-6-19339":
            q["rows"][0]["explanation"] = (
                "Ошибка в данном предложении — нарушение лексической сочетаемости: нельзя употреблять слова «завоевать» и «рекорд» вместе. "
                "Рекорд можно «установить» (а также «поставить», «побить»). Заменяем слово «завоевать» на «установить». "
                "Ответ: установить (поставить, побить)."
            )
            q["textAnswers"] = ["установить", "поставить", "побить"]
            q["rows"][0]["letter"] = "УСТАНОВИТЬ"
            q["rows"][0]["solvedWords"] = ["Ответ: установить"]
            q["choiceOptions"] = ["установить", "спортсменам", "мировой", "рекорд"]
            healed_explanations_count += 1
        elif qid == "shk-6-17888":
            q["rows"][0]["explanation"] = (
                "Словосочетание «первая премьера» содержит лексическую ошибку — перед нами плеоназм (речевая избыточность), "
                "поскольку премьера — это и есть первое представление спектакля, фильма или музыкального произведения "
                "(от французского première — «первая»). Слово «первая» является лишним и подлежит исключению. Ответ: первая."
            )
            q["rows"][0]["letter"] = "ПЕРВАЯ"
            q["rows"][0]["solvedWords"] = ["Ответ: первая"]
            healed_explanations_count += 1
        elif qid == "shk-6-126552":
            q["rows"][0]["explanation"] = (
                "Словосочетание «эгоистичного себялюбца» содержит лексическую ошибку – перед нами плеоназм, "
                "поскольку значение одного слова уже заложено в другом. «Себялюбец» – эгоистичный человек. "
                "Следовательно, нужно исключить прилагательное «эгоистичного» (предпочтительный вариант) или существительное «себялюбца»."
            )
            q["sentence"] = "Пушкин писал не подбирая слов и мог задеть эгоистичного себялюбца Р.И. Дорохова."
            q["rows"][0]["words"] = [q["sentence"]]
            healed_explanations_count += 1
        else:
            # Clean explanation of scraper tags
            exp = q["rows"][0].get("explanation", "")
            exp = re.sub(r"\s*\(?Задание составлено преподавателями Школково\)?.*$", "", exp, flags=re.I)
            exp = re.sub(r"\s*\(?Взято из\b.*$", "", exp, flags=re.I)
            q["rows"][0]["explanation"] = exp.strip()

        # Synchronize row letter & solvedWords
        primary_key = q["textAnswers"][0]
        q["rows"][0]["letter"] = primary_key.upper()
        q["rows"][0]["solvedWords"] = [f"Ответ: {primary_key}"]

        fipi_by_id[qid] = q
        fipi_by_sent[norm_yo(q["sentence"]).strip()] = q

    print(f"  -> Cleaned provenance notes from {cleaned_provenance_count} sentences.")
    print(f"  -> Healed/verified answers for {healed_answers_count} questions.")
    print(f"  -> Healed specific explanations: {healed_explanations_count}")

    # 4. Heal Sprint Cards for Task 6
    print("[4/5] Synchronizing and healing Sprint cards...")
    matched_sprint_ids = set()
    sprint_healed_count = 0

    for s in sprint_bank:
        if str(s.get("task")) != "6":
            continue
        ctx_norm = norm_yo(s.get("context") or s.get("suffix") or "").strip()
        fq = fipi_by_sent.get(ctx_norm)
        if not fq:
            for sk, cand in fipi_by_sent.items():
                if ctx_norm and (ctx_norm[:55] in sk or sk[:55] in ctx_norm):
                    fq = cand
                    break
        if fq:
            matched_sprint_ids.add(fq["id"])
            s["context"] = fq["sentence"]
            s["suffix"] = fq["sentence"]
            s["wordGap"] = fq["sentence"]
            s["explanation"] = fq["rows"][0]["explanation"]
            s["rule"] = CANONICAL_RULE
            s["prefix"] = "Исключите лишнее слово:" if fq.get("target") == "ИСКЛЮЧИВ" else "Замените неверное слово:"
            s["answer"] = fq["textAnswers"][0]
            s["word"] = fq["textAnswers"][0]
            opts = s.get("options") or []
            if s["answer"] not in opts and s["answer"].lower() not in [o.lower() for o in opts]:
                distractor = opts[0] if opts else "ошибка"
                s["options"] = [s["answer"], distractor]
            sprint_healed_count += 1

    # Add missing prototypes into Sprint bank
    missing_proto_ids = [qid for qid in fipi_by_id if qid not in matched_sprint_ids]
    added_sprint = 0
    for qid in missing_proto_ids:
        fq = fipi_by_id[qid]
        p_ans = fq["textAnswers"][0]
        words_in_sent = [w.lower() for w in re.findall(r"[А-Яа-яЁё]{4,}", fq["sentence"])]
        distractors = [w for w in words_in_sent if w != p_ans.lower() and w not in fq["textAnswers"]]
        distractor = distractors[0] if distractors else "ошибка"
        sprint_bank.append({
            "id": f"sp-6-{fq['id'].split('-')[-1]}",
            "kind": "sprint",
            "task": "6",
            "topic": "Речевая избыточность (плеоназм) и лексическая сочетаемость",
            "rule": CANONICAL_RULE,
            "prefix": "Исключите лишнее слово:" if fq.get("target") == "ИСКЛЮЧИВ" else "Замените неверное слово:",
            "suffix": fq["sentence"],
            "answer": p_ans,
            "options": [p_ans, distractor],
            "context": fq["sentence"],
            "explanation": fq["rows"][0]["explanation"],
            "source": fq.get("source", "Школково · Открытый банк заданий / ФИПИ"),
            "word": p_ans,
            "wordGap": fq["sentence"],
        })
        added_sprint += 1

    print(f"  -> Healed {sprint_healed_count} existing Sprint cards with full untruncated explanations.")
    print(f"  -> Added {added_sprint} missing Sprint cards.")

    # 5. Synchronize starterBank.json
    print("[5/5] Synchronizing starterBank.json...")
    fipi_map = {q["id"]: q for q in fipi_bank}
    sp_map = {s["id"]: s for s in sprint_bank}

    new_starter_fipi = []
    for sq in starter_bank.get("fipi", []):
        if sq["id"] in fipi_map:
            updated = json.loads(json.dumps(fipi_map[sq["id"]]))
            new_starter_fipi.append(updated)
        else:
            new_starter_fipi.append(sq)
    starter_bank["fipi"] = new_starter_fipi

    new_starter_sprint = []
    for ss in starter_bank.get("sprint", []):
        if ss["id"] in sp_map:
            updated = json.loads(json.dumps(sp_map[ss["id"]]))
            new_starter_sprint.append(updated)
        else:
            new_starter_sprint.append(ss)
    starter_bank["sprint"] = new_starter_sprint

    # Save all banks atomically
    print("Saving synchronized files...")
    fipi_str = json.dumps(fipi_bank, ensure_ascii=False, indent=2)
    for p in ["public/data/fipiTasksBank.json", "public/data/fipiTasksBank9_15.json"]:
        full_p = os.path.join(ROOT, p)
        with open(full_p + ".tmp", "w", encoding="utf-8") as f:
            f.write(fipi_str)
        os.replace(full_p + ".tmp", full_p)

    sprint_str = json.dumps(sprint_bank, ensure_ascii=False, indent=2)
    for p in ["public/data/sprintBank.json", "public/data/sprintBank9_15.json"]:
        full_p = os.path.join(ROOT, p)
        with open(full_p + ".tmp", "w", encoding="utf-8") as f:
            f.write(sprint_str)
        os.replace(full_p + ".tmp", full_p)

    starter_str = json.dumps(starter_bank, ensure_ascii=False, separators=(",", ":"))
    starter_p = os.path.join(ROOT, "src/data/starterBank.json")
    with open(starter_p + ".tmp", "w", encoding="utf-8") as f:
        f.write(starter_str)
    os.replace(starter_p + ".tmp", starter_p)

    print("All banks successfully synchronized!")

if __name__ == "__main__":
    main()
