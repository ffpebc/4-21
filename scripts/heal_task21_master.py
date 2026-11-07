#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Master synchronization and audit script for Task 21.
Verifies and heals:
 1. Formulation (canonical instructions, punctuation mark from primary source, topics)
 2. Sentences (OCR healing, stripping scraper metadata/junk, Cyrillic normalization)
 3. Answers (validating primary keys, multi-group alternatives, row alignment)
 4. Explanations (populating full explanations for 100% of prototypes, parsing per-sentence rules)
 5. Synchronizing fipiTasksBank, fipiTasksBank9_15, sprintBank, sprintBank9_15, starterBank.
"""

import json
import sqlite3
import re
import html
import os
import time

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

def norm_yo(s: str) -> str:
    s = html.unescape(s or "")
    s = re.sub(r"[\xad\u200b-\u200f\ufeff\u0300\u0301]", "", s)
    s = s.translate(str.maketrans("ÁÓÉÍÚÝáóéíúý", "АОЕИУЫаоеиуы"))
    return s.replace("Ё", "Е").replace("ё", "е")

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

def extract_task_21_sentences_from_primary(body_html: str) -> dict[int, str]:
    txt = clean_html_text(body_html)
    txt = txt.replace("(З)", "(3)").replace("(з)", "(3)")
    txt = re.sub(r"(?:^|\n)\s*([1-9])\)\s*", r"\n(\1) ", txt)
    lines = [
        ln
        for ln in txt.splitlines()
        if not re.match(r"^(?:Найдите|Выпишите|Укажите|Запишите|Объясните)", ln, flags=re.I)
    ]
    clean_txt = " ".join(lines).strip()
    parts = re.split(r"\(\s*(\d{1,2})\s*\)", clean_txt)
    sent_map = {}
    for i in range(1, len(parts) - 1, 2):
        snum = int(parts[i])
        stxt = re.sub(r"\s+", " ", parts[i + 1]).strip()
        if stxt:
            sent_map[snum] = f"({snum}) {stxt}"
    return sent_map


def clean_sentence_text(text: str) -> str:
    # 1. OCR fixes
    text = text.replace("(З)", "(3)").replace("(з)", "(3)")
    text = re.sub(r"«3а\b", "«За", text)
    text = text.replace("<.„>", "[...]").replace("<...>", "[...]")
    
    # 2. Latin lookalikes in Cyrillic
    text = re.sub(r"\bcвoй\b", "свой", text)
    text = re.sub(r"\beго\b", "его", text)
    text = re.sub(r"\bOн\b", "Он", text)
    text = re.sub(r"\bOсобенно\b", "Особенно", text)
    text = re.sub(r"\bCанторини\b", "Санторини", text)
    text = re.sub(r"\bHa\b", "На", text)
    text = re.sub(r"\bB\b", "В", text)
    text = re.sub(r"\bC\b", "С", text)
    text = text.replace("°C", "°С")
    
    # 3. Trailing scraper junk: ; Дощинского... , Дощинского... (ЕГКР...)
    text = re.sub(r"[;,]\s*(?:Дощинск|Цыбулько|ЕГЭ|ФИПИ|вар\.|вариант|Задание)[^)]*(?:\)\))*$", "", text, flags=re.I)
    text = re.sub(r"\s*\((?:ЕГКР|Дощинск|Цыбулько|вариант|вар\.)[^)]*\)\s*$", "", text, flags=re.I)
    text = re.sub(r"\s*\(вар\.\s*\d+\)\s*\)?$", "", text, flags=re.I)
    if text.count(")") > text.count("("):
        text = re.sub(r"\s*\)\s*$", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def parse_sentence_explanations(sol_text: str, num_sents: int) -> dict[int, str]:
    sent_expl = {}
    lines = sol_text.splitlines()
    
    p1 = re.compile(r'^(?:(?:(?:В\s+)?предложени[ияхе]*\s+(\d{1,2}))|(?:\(?(\d{1,2})\)?|\(?(\d{1,2})\.(?!\d)|(\d{1,2})\s*предложение))\s*[-–—:.]?\s*(.+)$', re.I)
    p2 = re.compile(r'^\((\d{1,2})\)\s*.*?[-–—]\s*(.+)$')
    
    curr_s = None
    curr_text = []
    
    for ln in lines:
        ln_s = ln.strip()
        if not ln_s:
            continue
        if re.match(r'^(?:Ответ|Источник)\s*:', ln_s, flags=re.I):
            break
        
        m2 = p2.match(ln_s)
        m1 = p1.match(ln_s)
        matched_s = None
        matched_txt = None
        
        if m2:
            snum = int(m2.group(1))
            if 1 <= snum <= num_sents:
                matched_s = snum
                matched_txt = m2.group(2).strip()
        elif m1:
            digits = [g for g in m1.groups()[:-1] if g]
            if digits:
                snum = int(digits[0])
                if 1 <= snum <= num_sents:
                    matched_s = snum
                    matched_txt = m1.groups()[-1].strip()
        
        if matched_s is not None:
            if curr_s is not None:
                sent_expl[curr_s] = ' '.join(curr_text).strip()
            curr_s = matched_s
            curr_text = [matched_txt]
        else:
            if curr_s is not None:
                curr_text.append(ln_s)
    
    if curr_s is not None:
        sent_expl[curr_s] = ' '.join(curr_text).strip()
        
    return sent_expl

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

def atomic_save_json(filepath, data, indent=None):
    tmp = filepath + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        if indent:
            json.dump(data, f, ensure_ascii=False, indent=indent)
        else:
            json.dump(data, f, ensure_ascii=False)
    os.replace(tmp, filepath)

def main():
    t0 = time.time()
    print("Loading databases and cache...")
    with open(".cache/neofamily_4_22.json", "r", encoding="utf-8") as f:
        nf_raw = json.load(f)
    nf_map = {str(item["id"]): item for item in nf_raw.get("21", [])}

    db_map = {}
    con = sqlite3.connect("/home/sergei/ege_trainer/ege_trainer.db")
    cur = con.cursor()
    cur.execute("SELECT t.id, t.source_name, t.body_html, t.solution_html, t.answer_text FROM tasks t JOIN themes th ON t.theme_id = th.id WHERE th.subject_id = 2")
    for row in cur.fetchall():
        db_map[str(row[0])] = {
            "id": str(row[0]),
            "source_name": row[1],
            "body_html": row[2] or "",
            "solution_html": row[3] or "",
            "answer_text": row[4] or ""
        }
    con.close()

    with open("public/data/fipiTasksBank.json", "r", encoding="utf-8") as f:
        fipi_bank = json.load(f)
    with open("public/data/sprintBank.json", "r", encoding="utf-8") as f:
        sprint_bank = json.load(f)
    with open("src/data/starterBank.json", "r", encoding="utf-8") as f:
        starter_bank = json.load(f)

    print("Auditing and healing each Task 21 prototype...")
    t21_count = 0
    formulation_fixed = 0
    sentences_cleaned = 0
    explanations_populated = 0
    
    t21_lookup = {}

    for q in fipi_bank:
        if q["id"] == "nf-8-51163":
            dump = json.dumps(q, ensure_ascii=False)
            dump = dump.replace("(сказуемые))", "(сказуемые)")
            new_q = json.loads(dump)
            q.clear()
            q.update(new_q)

        if str(q.get("task")) != "21":
            continue
        t21_count += 1
        qid = q["id"]
        raw_id = qid.split("-")[-1]

        if qid.startswith("nf-"):
            prim = nf_map.get(raw_id)
            if not prim:
                continue
            prim_body = prim.get("question", "")
            prim_sol = clean_html_text(prim.get("solution", ""))
            prim_ans = prim.get("answer", "")
        else:
            prim = db_map.get(raw_id)
            if not prim:
                continue
            prim_body = prim.get("body_html", "")
            prim_sol = clean_html_text(prim.get("solution_html", ""))
            prim_ans = prim.get("answer_text", "")

        # 1. Formulation & Topic check
        prim_mark = detect_primary_mark(prim_body)
        if prim_mark == "ТИРЕ":
            target_inst = "Найдите предложения, в которых ТИРЕ ставится в соответствии с одним и тем же правилом пунктуации. Запишите номера этих предложений."
            target_topic = "Пунктуационный анализ текста (ТИРЕ)"
        elif prim_mark == "ДВОЕТОЧИЕ":
            target_inst = "Найдите предложения, в которых ДВОЕТОЧИЕ ставится в соответствии с одним и тем же правилом пунктуации. Запишите номера этих предложений."
            target_topic = "Пунктуационный анализ текста (ДВОЕТОЧИЕ)"
        else:
            target_inst = "Найдите предложения, в которых ЗАПЯТАЯ(-ЫЕ) ставится(-ятся) в соответствии с одним и тем же правилом пунктуации. Запишите номера этих предложений."
            target_topic = "Пунктуационный анализ текста (ЗАПЯТАЯ)"

        if q.get("instruction") != target_inst or q.get("topic") != target_topic:
            q["instruction"] = target_inst
            q["topic"] = target_topic
            formulation_fixed += 1

        # 2. Sentences & Rows check
        sent_map = extract_task_21_sentences_from_primary(prim_body)
        max_sent_num = max(sent_map.keys()) if sent_map else len(q.get("rows", []))
        cur_rows = q.get("rows", [])
        has_placeholder = any(r["words"][0].startswith("Предложение (") for r in cur_rows)
        wrong_first_sent = (
            1 in sent_map
            and cur_rows
            and norm_yo(cur_rows[0]["words"][0][:25].lower()) != norm_yo(sent_map[1][:25].lower())
        )
        needs_row_rebuild = (
            len(sent_map) >= 4
            and (has_placeholder or wrong_first_sent or len(cur_rows) != max_sent_num)
        )

        if needs_row_rebuild:
            rebuilt_rows = []
            for snum in range(1, max_sent_num + 1):
                stxt = sent_map.get(snum, f"Предложение ({snum})")
                clean_stxt = clean_sentence_text(stxt)
                rebuilt_rows.append(
                    {
                        "words": [clean_stxt],
                        "solvedWords": [clean_stxt],
                        "letter": "—",
                        "isCorrectRow": False,
                        "explanation": "",
                    }
                )
            q["rows"] = rebuilt_rows
            cur_rows = rebuilt_rows
            sentences_cleaned += 1
        else:
            for idx, row in enumerate(cur_rows, 1):
                old_w = row["words"][0]
                new_w = clean_sentence_text(old_w)
                if old_w != new_w:
                    sentences_cleaned += 1
                    row["words"] = [new_w]
                    row["solvedWords"] = [new_w]
                else:
                    row["solvedWords"] = [new_w]

        # 3. Answer keys check
        max_m = len(cur_rows)
        groups = parse_answer_tokens(prim_ans, max_m)
        if groups:
            primary_group = groups[0]
            if q.get("correctIndices") in groups:
                primary_group = q["correctIndices"]
            else:
                q["correctIndices"] = primary_group

            all_group_strs = ["".join(str(x) for x in g) for g in groups]
            if len(groups) > 1:
                q["textAnswers"] = all_group_strs
            elif "textAnswers" in q:
                del q["textAnswers"]

            # Row correctness alignment
            for idx, r in enumerate(cur_rows, 1):
                is_ok = idx in primary_group
                r["isCorrectRow"] = is_ok
                r["letter"] = str(idx) if is_ok else "—"

        # 4. Explanations check
        parsed_rules = parse_sentence_explanations(prim_sol, len(cur_rows))
        all_group_strs = ["".join(str(x) for x in groups)] if groups else []
        if len(groups) > 1:
            all_group_strs = ["".join(str(x) for x in g) for g in groups]
            prefix = f"Допустимые варианты ответа по ключу: {' или '.join(all_group_strs)}.\n\n"
        else:
            prefix = ""

        full_expl = (prefix + prim_sol).strip()
        q["explanation"] = full_expl
        explanations_populated += 1

        primary_group = q.get("correctIndices", [])
        primary_group_str = "".join(str(x) for x in primary_group)

        ABBREVS = {
            'БСП': 'Бессоюзное сложное предложение (БСП)',
            'СПП': 'Сложноподчинённое предложение (СПП)',
            'ССП': 'Сложносочинённое предложение (ССП)',
            'ОЧП': 'Однородные члены предложения (ОЧП)',
            'ПО': 'Причастный оборот (ПО)',
            'ДО': 'Деепричастный оборот (ДО)',
            'Д/О': 'Деепричастный оборот (ДО)',
            'П/О': 'Причастный оборот (ПО)',
            'ВВОДНОЕ': 'Вводное слово или конструкция',
            'ВВОДНОЕ СЛОВО': 'Вводное слово или конструкция',
            'ПРИЛОЖЕНИЕ': 'Обособленное приложение',
            'ПРЯМАЯ РЕЧЬ': 'Прямая речь',
            'ОБРАЩЕНИЕ': 'Обращение',
            'СРАВНЕНИЕ': 'Сравнительный оборот',
            'УТОЧНЕНИЕ': 'Уточняющий член предложения',
            'МЕЖДОМЕТИЕ': 'Междометие',
            'НЕТ ТИРЕ': 'Тире отсутствует',
            'НЕТ ЗАПЯТЫХ': 'Запятые отсутствуют',
            'ДВОЕТОЧИЯ НЕТ': 'Двоеточие отсутствует',
            'ТИРЕ НЕТ': 'Тире отсутствует',
            'ЗАПЯТЫХ НЕТ': 'Запятые отсутствуют',
        }

        for idx, r in enumerate(cur_rows, 1):
            is_ok = idx in primary_group
            p_rule = parsed_rules.get(idx)
            if p_rule:
                clean_r = re.sub(r"^(?:\(?\d{1,2}\)?\s*[-–—:.]?\s*|предложение\s*\d{1,2}\s*[-–—:.]?\s*)", "", p_rule, flags=re.I).strip()
                s_strip = clean_r.strip().rstrip(".;,")
                if not s_strip or s_strip in ("-", "—", "–", ")", "."):
                    if is_ok:
                        r["explanation"] = f"Предложение ({idx}) входит в правильный ответ ({primary_group_str})."
                    else:
                        r["explanation"] = "Другое правило пунктуации или знак отсутствует."
                elif s_strip.upper() in ABBREVS:
                    r["explanation"] = ABBREVS[s_strip.upper()]
                else:
                    exp_text = clean_r
                    for k, v in ABBREVS.items():
                        exp_text = re.sub(rf'\b{k}\b', v, exp_text, flags=re.I)
                    if len(exp_text.strip()) < 5:
                        if is_ok:
                            r["explanation"] = f"Предложение ({idx}) входит в правильный ответ ({primary_group_str})."
                        else:
                            r["explanation"] = "Другое правило пунктуации или знак отсутствует."
                    else:
                        r["explanation"] = exp_text[0].upper() + exp_text[1:]
            else:
                if is_ok:
                    r["explanation"] = f"Предложение ({idx}) входит в правильный ответ ({primary_group_str})."
                else:
                    r["explanation"] = "Другое правило или знак отсутствует."

            sent_txt = r["words"][0].strip()
            t21_lookup[sent_txt] = (idx, is_ok, primary_group_str, r["explanation"], target_topic)
            t21_lookup[norm_yo(sent_txt)] = (idx, is_ok, primary_group_str, r["explanation"], target_topic)

        dump = json.dumps(q, ensure_ascii=False)
        dump = re.sub(r'\({2,}', '(', dump)
        dump = re.sub(r'\){2,}', ')', dump)
        q.clear()
        q.update(json.loads(dump))

    print(f"Total Task 21 prototypes processed: {t21_count}")
    print(f"  Formulation mismatches repaired: {formulation_fixed}")
    print(f"  Sentences/rows cleaned: {sentences_cleaned}")
    print(f"  Explanations populated: {explanations_populated}")

    # 5. Sprint bank synchronization
    sprint_21_fixed = 0
    for s in sprint_bank:
        if str(s.get("task")) == "21":
            ctx = re.sub(r"[\xad\u200b-\u200f\ufeff]", "", (s.get("context") or "")).strip()
            clean_ctx = clean_sentence_text(ctx)
            if clean_ctx != ctx:
                s["context"] = clean_ctx
                s["suffix"] = clean_ctx
                s["wordGap"] = clean_ctx
                ctx = clean_ctx

            info = t21_lookup.get(ctx) or t21_lookup.get(norm_yo(ctx))
            if info:
                idx, is_ok, pg_str, expl, top = info
                new_ans = "ВХОДИТ В ОТВЕТ" if is_ok else "ДРУГОЕ ПРАВИЛО"
                s["word"] = new_ans
                s["answer"] = new_ans
                if is_ok:
                    s["explanation"] = expl
                else:
                    s["explanation"] = f"Предложение ({idx}) не входит в основную группу ответа ({pg_str}). {expl}"
                s["rule"] = s["explanation"]
                s["topic"] = top
                sprint_21_fixed += 1

    print(f"  Sprint cards synchronized: {sprint_21_fixed}")

    # 6. Starter bank synchronization
    fipi_map = {item["id"]: item for item in fipi_bank}
    sp_map = {item["id"]: item for item in sprint_bank}

    new_st_fipi = []
    for q in starter_bank.get("fipi", []):
        if q["id"] in fipi_map:
            updated = json.loads(json.dumps(fipi_map[q["id"]]))
            if str(updated.get("task")) not in ("6", "17"):
                for r in updated.get("rows", []):
                    if len(r.get("explanation", "")) > 220:
                        r["explanation"] = r["explanation"][:217] + "..."
                if len(updated.get("explanation", "")) > 220:
                    updated["explanation"] = updated["explanation"][:217] + "..."
            new_st_fipi.append(updated)
        else:
            new_st_fipi.append(q)
    starter_bank["fipi"] = new_st_fipi

    new_st_sprint = []
    for s in starter_bank.get("sprint", []):
        if s["id"] in sp_map:
            updated = json.loads(json.dumps(sp_map[s["id"]]))
            if str(updated.get("task")) not in ("6", "17"):
                if len(updated.get("explanation", "")) > 220:
                    updated["explanation"] = updated["explanation"][:217] + "..."
                if len(updated.get("rule", "")) > 220:
                    updated["rule"] = updated["rule"][:217] + "..."
            new_st_sprint.append(updated)
        else:
            new_st_sprint.append(s)
    starter_bank["sprint"] = new_st_sprint

    # Save all banks atomically
    print("Saving bank files atomically...")
    for path in ["public/data/fipiTasksBank.json", "public/data/fipiTasksBank9_15.json"]:
        atomic_save_json(path, fipi_bank)

    for path in ["public/data/sprintBank.json", "public/data/sprintBank9_15.json"]:
        atomic_save_json(path, sprint_bank)

    atomic_save_json("src/data/starterBank.json", starter_bank)

    sz_kb = os.path.getsize("src/data/starterBank.json") / 1024.0
    print(f"starterBank.json size: {sz_kb:.1f} KB in {time.time() - t0:.2f}s")

if __name__ == "__main__":
    main()
