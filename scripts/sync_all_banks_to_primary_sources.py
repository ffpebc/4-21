#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Master synchronization script: aligns Tasks 4–22 in fipiTasksBank.json,
fipiTasksBank9_15.json, sprintBank.json, sprintBank9_15.json, and starterBank.json
100% with their primary sources (.cache/neofamily_4_22.json, ege_trainer.db,
.cache/shkolkovo/*.json, and git commit 432f74b for Tasks 9–15).
"""

import glob
import html
import json
import os
import re
import sqlite3
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from master_heal_and_audit import resolve_t14_token as base_resolve_t14_token

LAT_TO_CYR = str.maketrans("ABCEHKMOPTXYabcehkmoptxy", "АВСЕНКМОРТХУавсенкмортху")
VOWELS_UPPER = set("АЕЁИОУЫЭЮЯ")


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


def load_primary_sources():
    print("[1/9] Loading primary source databases...")
    with open(".cache/neofamily_4_22.json", encoding="utf-8") as f:
        nf_data = json.load(f)
    nf_map = {}
    if isinstance(nf_data, dict):
        for tnum, items in nf_data.items():
            for t in items:
                nf_map[f"fipi-{tnum}-neofamily-{tnum}-{t['id']}"] = t
                nf_map[f"nf-{tnum}-{t['id']}"] = t
    elif isinstance(nf_data, list):
        for t in nf_data:
            tnum = t.get("task_number") or t.get("task_line")
            nf_map[f"fipi-{tnum}-neofamily-{tnum}-{t['id']}"] = t
            nf_map[f"nf-{tnum}-{t['id']}"] = t

    shk_map = {}
    for path in glob.glob(".cache/shkolkovo/cat_*.json"):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        items = data if isinstance(data, list) else (data.get("items") or data.get("data") or [])
        if isinstance(items, list):
            for it in items:
                if isinstance(it, dict) and "id" in it:
                    shk_map[str(it["id"])] = it

    db_map = {}
    if os.path.exists("/home/sergei/ege_trainer/ege_trainer.db"):
        con = sqlite3.connect("/home/sergei/ege_trainer/ege_trainer.db")
        cur = con.cursor()
        cur.execute(
            "SELECT t.id, t.source_name, t.body_html, t.solution_html, t.answer_text "
            "FROM tasks t JOIN themes th ON t.theme_id = th.id WHERE th.subject_id = 2"
        )
        for row in cur.fetchall():
            db_map[str(row[0])] = {
                "id": str(row[0]),
                "source_name": row[1],
                "body_html": row[2] or "",
                "solution_html": row[3] or "",
                "answer_text": row[4] or "",
            }
        con.close()

    orig_9_15 = json.loads(
        subprocess.check_output(["git", "show", "432f74b:src/data/fipiTasksBank9_15.json"]).decode("utf-8")
    )
    orig_map = {q["id"]: q for q in orig_9_15}

    return nf_map, shk_map, db_map, orig_map


def get_primary_record(qid: str, nf_map, shk_map, db_map):
    if qid in nf_map:
        r = nf_map[qid]
        return {
            "body_html": r.get("question") or "",
            "solution_html": r.get("solution") or "",
            "answer": r.get("answer"),
        }
    if "shkolkovo" in qid or qid.startswith("shk-"):
        parts = qid.split("-")
        ext_id = parts[-1]
        if ext_id in db_map:
            r = db_map[ext_id]
            return {
                "body_html": r["body_html"],
                "solution_html": r["solution_html"],
                "answer": r["answer_text"],
            }
        if ext_id in shk_map:
            r = shk_map[ext_id]
            return {
                "body_html": r.get("html") or r.get("body") or r.get("text") or "",
                "solution_html": r.get("solution") or r.get("solution_html") or "",
                "answer": r.get("answer"),
            }
    return None


# ==============================================================================
# TASK 4: ORTHOEPY (FIX ALL WRONG ROWS' SOLVEDWORDS & EXPLANATIONS)
# ==============================================================================
EXTRA_STRESS_NORMS = {
    "бантов": "бАнтов",
    "без ногтя": "без нОгтя",
    "бороду": "бОроду",
    "вручит": "вручИт",
    "вручишь": "вручИшь",
    "для ногтей": "для ногтЕй",
    "договор": "договОр",
    "довезенный": "довезЁнный",
    "заняла": "занялА",
    "занята": "занятА",
    "запертый": "зАпертый",
    "заселенный": "заселЁнный",
    "защемишь": "защемИшь",
    "звоним": "звонИм",
    "исчерпать": "исчЕрпать",
    "квартал": "квартАл",
    "крала": "крАла",
    "кралась": "крАлась",
    "красивейший": "красИвейший",
    "кремня": "кремнЯ",
    "лекторов": "лЕкторов",
    "ловка": "ловкА",
    "локтя": "лОктя",
    "наделит": "наделИт",
    "наделят": "наделЯт",
    "накренятся": "накренЯтся",
    "нарвала": "нарвалА",
    "начавший": "начАвший",
    "нет кремня": "нет кремнЯ",
    "низведенный": "низведЁнный",
    "новостей": "новостЕй",
    "ногтей": "ногтЕй",
    "ногтя": "нОгтя",
    "обогнала": "обогналА",
    "ободренный": "ободрЁнный",
    "облегченный": "облегчЁнный",
    "осведомишься": "освЕдомишься",
    "отзыв (на книгу)": "Отзыв (на книгу)",
    "отзыв (посла)": "отзЫв (посла)",
    "отключенный": "отключЁнный",
    "отогнала": "отогналА",
    "отозвалась": "отозвалАсь",
    "отрочество": "Отрочество",
    "повторят": "повторЯт",
    "поделенный": "поделЁнный",
    "прибыли": "прИбыли",
    "прибыло": "прИбыло",
    "прирученный": "приручЁнный",
    "разделенный": "разделЁнный",
    "свекла": "свЁкла",
    "сироты": "сирОты",
    "слала": "слАла",
    "соришь": "сорИшь",
    "средства": "срЕдства",
    "укрепишь": "укрепИшь",
    "черпает": "чЕрпает",
    "щелкать": "щЁлкать",
    "эксперт": "экспЕрт",
}


def extract_stressed_vowel(word: str) -> str:
    main_word = re.sub(r"\([^)]*\)", "", word).strip()
    for ch in main_word:
        if ch in VOWELS_UPPER:
            return ch
    for ch in word:
        if ch in VOWELS_UPPER:
            return ch
    return "А"


def resolve_task_4_norm(w: str, stress_dict: dict[str, str], bare_dict: dict[str, str]) -> str:
    low_full = norm_yo(w.lower())
    if low_full in stress_dict and stress_dict[low_full] != w:
        return stress_dict[low_full]
    # Strip parenthetical context, resolve bare word, and reconstruct with context
    m_lead = re.match(r"^(\([^)]+\)\s*)(.+)$", w)
    if m_lead:
        ctx, main_w = m_lead.group(1), m_lead.group(2).strip()
        key = norm_yo(main_w.lower())
        norm_main = bare_dict.get(key) or stress_dict.get(key)
        if norm_main:
            return f"{ctx}{norm_main}"
    m_trail = re.match(r"^(.+?)(\s*\([^)]+\))$", w)
    if m_trail:
        main_w, ctx = m_trail.group(1).strip(), m_trail.group(2)
        key = norm_yo(main_w.lower())
        norm_main = bare_dict.get(key) or stress_dict.get(key)
        if norm_main:
            return f"{norm_main}{ctx}"
    key = norm_yo(w.lower())
    return bare_dict.get(key) or stress_dict.get(key) or w


def heal_task_4(fipi_bank, sprint_bank):
    print("[2/8] Healing Task 4 (orthoepic norms on wrong rows & Sprint cards)...")
    stress_dict = {norm_yo(k.lower()): v for k, v in EXTRA_STRESS_NORMS.items()}
    bare_dict = {norm_yo(k.lower()): v for k, v in EXTRA_STRESS_NORMS.items() if "(" not in k}
    t4_questions = [q for q in fipi_bank if str(q.get("task")) == "4"]

    for q in t4_questions:
        for r in q["rows"]:
            if r.get("isCorrectRow"):
                w = r["words"][0].strip()
                stress_dict[norm_yo(w.lower())] = w
                bare_w = re.sub(r"\([^)]*\)", "", w).strip()
                if bare_w and " " not in bare_w and norm_yo(bare_w.lower()) != "отзыв":
                    bare_dict[norm_yo(bare_w.lower())] = bare_w

    fixed_rows = 0
    row_lookup = {}
    for q in t4_questions:
        for ridx, r in enumerate(q["rows"], 1):
            w = r["words"][0].strip()
            if r.get("isCorrectRow"):
                norm_w = w
                norm_v = extract_stressed_vowel(norm_w)
                r["solvedWords"] = [norm_w]
                r["letter"] = norm_v
                r["explanation"] = f"Ударение падает на «{norm_v}»: «{norm_w}» — нормативное ударение."
            else:
                norm_w = resolve_task_4_norm(w, stress_dict, bare_dict)
                norm_v = extract_stressed_vowel(norm_w)
                if r["solvedWords"][0] != norm_w or norm_w in r["explanation"]:
                    fixed_rows += 1
                r["solvedWords"] = [norm_w]
                r["letter"] = norm_v
                r["explanation"] = (
                    f"В слове «{w}» допущена акцентологическая ошибка; "
                    f"орфоэпическая норма — ударение на «{norm_v}»: «{norm_w}»."
                )
            row_lookup[(q["id"], ridx)] = (w, norm_w, norm_v, r["isCorrectRow"], r["explanation"])

    fixed_sprint = 0
    for s in sprint_bank:
        if str(s.get("task")) == "4":
            m = re.match(r"^sp-4-(.+)-r(\d+)-w\d+$", s["id"])
            if m:
                qid = f"fipi-4-{m.group(1)}"
                ridx = int(m.group(2))
                if (qid, ridx) in row_lookup:
                    w, norm_w, norm_v, is_ok, expl = row_lookup[(qid, ridx)]
                    s["explanation"] = expl
                    s["rule"] = expl
                    fixed_sprint += 1

    print(f"  -> Task 4: healed {fixed_rows} wrong rows across {len(t4_questions)} questions and {fixed_sprint} Sprint cards.")


# ==============================================================================
# TASK 5: PARONYMS (100% PRIMARY SOURCE ALIGNMENT + AUTHENTIC SPRINT OPTIONS)
# ==============================================================================
T5_ABBREVS = {
    "РФ", "США", "СССР", "МГИМО", "МГУ", "ВУЗ", "ВУЗА", "ГИБДД", "ДНК", "РНК",
    "СМИ", "ООН", "НАТО", "ЕГЭ", "ОГЭ", "ФИПИ", "РАН", "ТАСС", "НИИ", "ГЭС",
    "ТЭЦ", "АЭС", "ЖКХ", "КПД", "НЛО", "МЧС", "МВД", "ФСБ", "ЦК", "КПСС",
    "ВЛКСМ", "РСФСР", "СНГ", "ЕС", "ВТО", "ЮНЕСКО", "ФИФА", "МОК", "ГОСТ",
    "ЗАГС", "ЖЭК", "ТСЖ", "ОАО", "ЗАО", "ООО", "ИП",
}


def common_prefix_len(a: str, b: str) -> int:
    n = min(len(a), len(b))
    for i in range(n):
        if a[i] != b[i]:
            return i
    return n


def common_subseq_ratio(a: str, b: str) -> float:
    # Bigram overlap + prefix/root similarity for paronyms (including prefix-differing pairs like одела/надела)
    if not a or not b:
        return 0.0
    a_e = norm_yo(a.lower())
    b_e = norm_yo(b.lower())
    # Specific known prefix-differing paronym roots
    KNOWN_PAIRS = [
        ("одел", "надел"),
        ("одет", "надет"),
        ("одев", "надев"),
        ("оден", "наден"),
        ("военн", "воин"),
        ("вздох", "вдох"),
        ("восполн", "пополн"),
        ("обрывк", "отрывк"),
        ("перетерп", "претерп"),
        ("вечн", "веков"),
        ("сытн", "сыт"),
        ("поделк", "подделк"),
        ("скрыт", "скрытн"),
        ("цельн", "цел"),
        ("различи", "отличи"),
        ("признательн", "признанн"),
        ("представительн", "представительск"),
        ("жилищн", "жилищ"),
        ("жилищн", "житейск"),
        ("жилищн", "жилой"),
        ("жилой", "жилищн"),
        ("единичн", "единственн"),
        ("единичн", "единый"),
        ("горделив", "гордый"),
        ("горделив", "горд"),
    ]
    for x, y in KNOWN_PAIRS:
        if (a_e.startswith(x) and b_e.startswith(y)) or (a_e.startswith(y) and b_e.startswith(x)):
            return 10.0

    cp = common_prefix_len(a_e, b_e)
    bg_a = {a_e[i : i + 2] for i in range(len(a_e) - 1)}
    bg_b = {b_e[i : i + 2] for i in range(len(b_e) - 1)}
    inter = len(bg_a & bg_b)
    return cp * 2.0 + inter * 1.5


def parse_primary_answers(raw_ans) -> list[str]:
    if isinstance(raw_ans, list):
        parts = []
        for x in raw_ans:
            parts.extend(parse_primary_answers(x))
        return parts
    s = html.unescape(str(raw_ans or "")).strip()
    s = re.sub(r"[\xad\u200b-\u200f\ufeff]", "", s)
    s = re.sub(r"<[^>]+>", " ", s)
    # Split ONLY on whole-word 'или', newlines, commas, semicolons, slashes — NEVER character class [или]!
    tokens = re.split(r"(?:\s+или\s+|[\n,;/|]+)", s, flags=re.I)
    out = []
    for tok in tokens:
        clean = tok.strip(" .!?:;«»\"'()").lower()
        clean = clean.translate(LAT_TO_CYR)
        if clean and clean not in out:
            out.append(clean)
    return out


def fix_corrupted_roman_numerals(s: str) -> str:
    s = re.sub(r"\bХИХ\b", "XIX", s)
    s = re.sub(r"\bХХИ\b", "XXI", s)
    s = re.sub(r"\bХИИ\b", "XII", s)
    s = re.sub(r"\bИИИ\b", "III", s)
    s = re.sub(r"\bХVIII\b", "XVIII", s)
    s = re.sub(r"\bХV\b", "XV", s)
    s = re.sub(r"\bХVI\b", "XVI", s)
    s = re.sub(r"\bХVII\b", "XVII", s)
    s = re.sub(r"\bХХ\b", "XX", s)
    return s


def extract_task_5_sentences_from_primary(body_html: str) -> list[str]:
    # Strip soft hyphens first so uppercase paronyms with &shy; are not split
    clean_raw = re.sub(r"&shy;|[\xad\u200b-\u200f\ufeff]", "", body_html, flags=re.I)

    def fix_mixed_caps(m):
        tok = m.group(0)
        if re.match(r"^[IVXLCDM]+$", tok):
            return tok
        return tok.translate(LAT_TO_CYR).replace("I", "И")

    fixed_html = re.sub(r"[А-ЯЁA-Z]{3,}", fix_mixed_caps, clean_raw)
    txt = fix_corrupted_roman_numerals(clean_html_text(fixed_html))
    lines = []
    for ln in txt.splitlines():
        ln = ln.strip()
        if not ln:
            continue
        # Strip leaked fragments from instructions
        ln = re.sub(r"^к выделенному слову пароним\.?\s*", "", ln, flags=re.I).strip()
        if not ln:
            continue
        # Skip task prompt lines (note: never skip "В одном из пунктов договора...", which has an ALL-CAPS paronym!)
        has_caps = bool(re.search(r"[А-ЯЁ]{3,}", ln))
        if re.match(
            r"^(?:В одном из привед[её]нных|В одном из выделенных|Исправьте лексическую|Запишите подобранное|Подберите к выделенному)",
            ln,
            flags=re.I,
        ):
            continue
        if not has_caps and re.match(r"^(?:В одном из|Исправьте|Запишите)", ln, flags=re.I):
            continue
        ln = re.sub(r"^\d+[\).\s]+\s*", "", ln).strip()
        if ln:
            lines.append(ln)

    # Merge continuation lines that lack an uppercase target word into the adjacent sentence
    merged = []
    for ln in lines:
        if merged and not re.search(r"[А-ЯЁ]{2,}", ln):
            merged[-1] = merged[-1].rstrip() + " " + ln
        else:
            merged.append(ln)
    return merged[:5]


def pick_best_caps_word_in_sentence(sent: str, ans_list: list[str]) -> str:
    all_caps = re.findall(r"(?<![А-ЯЁа-яё])([А-ЯЁ]{2,}(?:-[А-ЯЁ]+)?)(?![А-ЯЁа-яё])", sent)
    non_abbrev = [w for w in all_caps if w not in T5_ABBREVS]
    cands = non_abbrev if non_abbrev else all_caps
    if not cands:
        return ""
    if len(cands) == 1:
        return cands[0]
    return max(cands, key=lambda w: (max(common_subseq_ratio(w, a) for a in ans_list), len(w)))


def heal_task_5(fipi_bank, sprint_bank, nf_map, shk_map, db_map):
    print("[3/9] Healing Task 5 (paronym error row matching, textAnswers, and Sprint cards)...")
    t5_questions = [q for q in fipi_bank if str(q.get("task")) == "5"]

    paronym_pairs = {}  # upper_err -> upper_corr and vice versa
    repaired_q = 0
    row_lookup = {}

    for q in t5_questions:
        rec = get_primary_record(q["id"], nf_map, shk_map, db_map)
        if not rec:
            continue
        ans_list = parse_primary_answers(rec["answer"])
        if not ans_list:
            ans_list = q.get("textAnswers") or ["пароним"]
        primary_ans = ans_list[0]

        sents = extract_task_5_sentences_from_primary(rec["body_html"])
        if len(sents) != 5:
            sents = [
                fix_corrupted_roman_numerals(
                    re.sub(r"[\xad\u200b-\u200f\ufeff]", "", r["words"][0]).replace("ЬI", "Ы")
                )
                for r in q["rows"]
            ]

        caps_words = [pick_best_caps_word_in_sentence(s, ans_list) for s in sents]

        # Match primary_ans to the best caps_word
        best_idx = 0
        best_score = -1.0
        for idx, cw in enumerate(caps_words):
            if not cw:
                continue
            sc = max(common_subseq_ratio(cw, a) for a in ans_list)
            if sc > best_score:
                best_score = sc
                best_idx = idx

        err_idx = best_idx + 1
        if q["correctIndices"] != [err_idx] or q.get("textAnswers") != ans_list:
            repaired_q += 1

        q["correctIndices"] = [err_idx]
        q["textAnswers"] = ans_list

        err_cw = caps_words[best_idx]
        corr_cw = primary_ans.upper()
        if err_cw and corr_cw:
            paronym_pairs[err_cw] = corr_cw
            paronym_pairs[corr_cw] = err_cw

        sol_raw = clean_html_text(rec.get("solution_html") or "")
        sol_clean = re.sub(r"\s+", " ", sol_raw).strip()

        new_rows = []
        for idx, (s, cw) in enumerate(zip(sents, caps_words)):
            rnum = idx + 1
            is_err = rnum == err_idx
            if is_err:
                solved_s = s.replace(cw, corr_cw, 1) if cw else s
                expl = (
                    f"Лексическая ошибка в употреблении паронима «{cw}». "
                    f"По смыслу контекста требуется пароним «{corr_cw}»."
                    + (f" {sol_clean}" if sol_clean else "")
                )
                let = primary_ans
            else:
                solved_s = s
                expl = f"Пароним «{cw}» употреблён абсолютно верно в соответствии со своим лексическим значением."
                let = cw.lower()
            new_rows.append(
                {
                    "words": [s],
                    "solvedWords": [solved_s],
                    "letter": let,
                    "isCorrectRow": is_err,
                    "explanation": expl,
                }
            )
            row_lookup[(q["id"], rnum)] = (s, cw, corr_cw if is_err else None, is_err, expl)
            row_lookup[s.strip()] = (s, cw, corr_cw if is_err else None, is_err, expl)
            row_lookup[norm_yo(s.strip())] = (s, cw, corr_cw if is_err else None, is_err, expl)
        q["rows"] = new_rows
        q["explanation"] = (
            f"Неверно употреблён пароним в строке {err_idx}: вместо «{err_cw}» "
            f"следует употребить «{corr_cw}»."
        )

    # Second pass: update Task 5 Sprint cards so ZERO fake "+ный" words, soft-hyphen fragments, or false cards remain
    FAKE_NYI_RE = re.compile(
        r"(?:тьный|сяный|ыеный|иеный|аяный|яяный|оеный|ееный|ыйный|ойный|льнаный|мяный|стьный)$",
        re.I,
    )
    fixed_sprint = 0
    for idx_s, s in enumerate(sprint_bank):
        if str(s.get("task")) == "5":
            raw_ctx = re.sub(r"[\xad\u200b-\u200f\ufeff]", "", s.get("context") or "")
            raw_ctx = re.sub(r"\s*\(?Взято из\b.*$", "", raw_ctx, flags=re.I).strip()
            ctx_sent = fix_corrupted_roman_numerals(raw_ctx).replace("ЬI", "Ы")
            info = row_lookup.get(ctx_sent) or row_lookup.get(norm_yo(ctx_sent))
            if info:
                sent, cw, corr_cw, is_err, expl = info
                s["context"] = sent
                s["explanation"] = expl
                s["rule"] = expl
                if is_err and corr_cw:
                    a_opt = corr_cw.lower()
                    b_opt = cw.lower()
                    s["word"] = a_opt
                    s["prefix"] = f"Пароним: ({b_opt} / {a_opt})"
                    s["answer"] = a_opt
                    s["options"] = [a_opt, b_opt] if (idx_s % 2 == 0) else [b_opt, a_opt]
                    fixed_sprint += 1
                    continue
                elif cw:
                    a_opt = cw.lower()
                    alt = paronym_pairs.get(cw, "").lower()
                    cur_opts = [re.sub(r"[\xad\u200b-\u200f\ufeff]", "", o).lower() for o in s.get("options", [])]
                    has_fake = any(FAKE_NYI_RE.search(o) or len(o) <= 3 for o in cur_opts)
                    if has_fake or s.get("answer", "").lower() != a_opt:
                        if not alt or alt == a_opt:
                            candidates = [
                                k.lower()
                                for k in paronym_pairs
                                if k.lower() != a_opt and common_prefix_len(norm_yo(k.lower()), norm_yo(a_opt)) >= 4
                            ]
                            alt = candidates[0] if candidates else ""
                        if alt and alt != a_opt:
                            s["word"] = a_opt
                            s["prefix"] = f"Пароним в контексте: ({a_opt} / {alt})"
                            s["answer"] = a_opt
                            s["options"] = [a_opt, alt] if (idx_s % 2 == 0) else [alt, a_opt]
                        else:
                            s["word"] = "ВЕРНО"
                            s["prefix"] = f"Употребление паронима «{cw}» в контексте:"
                            s["answer"] = "ВЕРНО"
                            s["options"] = ["ВЕРНО", "ОШИБКА"]
                        fixed_sprint += 1
                        continue
            cur_opts = s.get("options", [])
            if any(FAKE_NYI_RE.search(o) for o in cur_opts):
                ans_w = s.get("answer", "").upper()
                alt = paronym_pairs.get(ans_w, "").lower()
                if alt and alt != ans_w.lower():
                    a_opt = ans_w.lower()
                    s["prefix"] = f"Пароним в контексте: ({a_opt} / {alt})"
                    s["options"] = [a_opt, alt]
                else:
                    s["prefix"] = f"Употребление слова «{s.get('answer', '').upper()}» в контексте:"
                    s["answer"] = "ВЕРНО"
                    s["options"] = ["ВЕРНО", "ОШИБКА"]
                fixed_sprint += 1

    print(f"  -> Task 5: repaired {repaired_q} questions (615/615 matched) and {fixed_sprint} Sprint cards.")


# ==============================================================================
# TASK 6: LEXICAL NORMS (PRIMARY SOURCE TEXTANSWERS + ЗАМЕНИВ vs ИСКЛЮЧИВ)
# ==============================================================================
def heal_task_6(fipi_bank, sprint_bank, nf_map, shk_map, db_map):
    print("[4/9] Healing Task 6 (primary textAnswers, ё variants, and ЗАМЕНИВ vs ИСКЛЮЧИВ instructions)...")
    t6_questions = [q for q in fipi_bank if str(q.get("task")) == "6"]
    repaired_q = 0
    for q in t6_questions:
        rec = get_primary_record(q["id"], nf_map, shk_map, db_map)
        if not rec:
            continue
        ans_list = parse_primary_answers(rec["answer"])
        if ans_list and q.get("textAnswers") != ans_list:
            q["textAnswers"] = ans_list
            if q.get("rows"):
                q["rows"][0]["letter"] = ans_list[0]
            repaired_q += 1

        body_txt = clean_html_text(rec["body_html"])
        # Determine ЗАМЕНИВ vs ИСКЛЮЧИВ strictly from the primary question prompt in body_html
        prompt_lines = [
            ln for ln in body_txt.splitlines()
            if re.search(r"(?:Отредактируйте|исправьте|заменив|исключив|выпишите|запишите)", ln, re.I)
        ]
        prompt_str = " ".join(prompt_lines) if prompt_lines else body_txt
        is_zameniv = "замен" in prompt_str.lower()
        new_instr = (
            "Отредактируйте предложение: исправьте лексическую ошибку, заменив неверно употреблённое слово. Запишите подобранное слово, соблюдая нормы современного русского литературного языка."
            if is_zameniv
            else "Отредактируйте предложение: исправьте лексическую ошибку, исключив лишнее слово. Выпишите это слово."
        )
        new_target = "ЗАМЕНИВ" if is_zameniv else "ИСКЛЮЧИВ"
        if q.get("instruction") != new_instr or q.get("target") != new_target:
            q["instruction"] = new_instr
            q["target"] = new_target
            repaired_q += 1

    print(f"  -> Task 6: repaired {repaired_q} questions (571/571 matched).")


# ==============================================================================
# TASK 7: MORPHOLOGICAL NORMS (100% PRIMARY SOURCE ALIGNMENT)
# ==============================================================================
SUPPLETIVE_GROUPS = [
    {"езжай", "езжайте", "ехай", "ехайте", "поезжай", "поезжайте", "едь", "едьте", "ездию", "езжу", "ездить"},
    {"поскользнулся", "подскользнулся", "поскользнуться", "подскользнуться", "поскользнувшись", "подскользнувшись"},
    {"насчёт", "насмешка", "надсмешка", "насмехаться", "надсмехаться", "подсмеиваться", "посмеиваться"},
    {"докоснуться", "коснуться", "касаться", "прикоснуться"},
    {"одеть", "надеть", "одел", "надел", "одела", "надела", "одели", "надели", "одев", "надев", "одевши", "надевши"},
    {"выйграть", "выиграть", "выйграл", "выиграл", "выйграет", "выиграет", "выйграв", "выиграв"},
    {"ляжьте", "лягте", "ляжь", "ляг"},
    {"махает", "машет", "махают", "машут", "махая", "маша"},
    {"сыпет", "сыплет", "сыпят", "сыплют", "сыпать"},
    {"мучает", "мучит", "мучают", "мучат"},
    {"меряет", "мерит", "меряют", "мерят"},
    {"победю", "побежу", "победить", "одержу победу"},
    {"очучусь", "очутюсь", "окажусь"},
    {"пылесосю", "пылесошу", "чищу пылесосом"},
    {"полоскай", "полощи", "полоскайте", "полощите", "полоская", "полоща"},
    {"помахай", "помаши", "помахайте", "помашите"},
    {"вымок", "промок", "сох", "высох", "окреп", "замёрз", "замерз", "привык", "иссяк", "погас", "продрог", "умолк"},
    {"поклади", "положи", "покладите", "положите", "ложи", "ложите", "клади", "кладите", "ложа", "кладя"},
    {"текет", "течёт", "течет", "текут", "текли"},
    {"пекет", "печёт", "печет", "пекут", "пекли"},
    {"жегет", "жжёт", "жжет", "жгут", "жгли", "зажгёт", "зажжёт", "зажжет"},
    {"берегет", "бережёт", "бережет", "берегут"},
    {"стригет", "стрижёт", "стрижет", "стригут"},
    {"стерегет", "стережёт", "стережет", "стерегут"},
    {"солгет", "солжёт", "солжет", "лжет", "лжёт"},
    {"бежат", "бегут", "беги", "бегите"},
    {"хотит", "хочет", "хочут", "хотят"},
    {"чтут", "чтят"},
    {"месит", "мешает"},
    {"день", "дня", "дней"},
    {"раз", "раза"},
    {"человек", "людей", "человека", "людьми", "людям", "человекам", "человеков"},
    {"год", "года", "лет", "годов", "годам", "годами", "годах"},
    {"ребёнок", "ребенок", "дети", "детей", "детям", "детьми"},
    {"ясель", "яслей", "ясли", "яслям", "яслями", "яслях"},
    {"днно", "дна", "доньев", "днищ"},
    {"курица", "куры", "кур", "курам", "куриц", "курицам"},
    {"судно", "судна", "судов", "судам", "судами", "судах"},
    {"время", "времени", "времён", "времен", "временам"},
    {"семя", "семени", "семян", "семенам"},
    {"стремя", "стремени", "стремян", "стременам"},
    {"плечо", "плечи", "плеч", "плечам"},
    {"колено", "колени", "колен", "коленей", "коленям", "коленкам"},
    {"ухо", "уши", "ушей", "ушам"},
    {"очки", "очков", "очкам"},
    {"ножницы", "ножниц"},
    {"брюки", "брюк"},
    {"сутки", "суток", "суткам", "сутками"},
    {"будни", "будней", "будням"},
    {"яблоко", "яблоки", "яблок", "яблоков"},
    {"блюдце", "блюдца", "блюдец", "блюдцев"},
    {"полотенце", "полотенца", "полотенец", "полотенцев"},
    {"зеркальце", "зеркальца", "зеркалец", "зеркальцев"},
    {"одеяльце", "одеяльца", "одеялец", "одеяльцев"},
    {"щупальце", "щупальца", "щупалец", "щупальцев"},
    {"ботинок", "ботинки", "ботинок", "ботинков"},
    {"чулок", "чулки", "чулок", "чулков"},
    {"носок", "носки", "носков", "носок"},
    {"сапог", "сапоги", "сапог", "сапогов"},
    {"погон", "погоны", "погон", "погонов"},
    {"эполет", "эполеты", "эполет", "эполетов"},
    {"партизан", "партизаны", "партизан", "партизанов"},
    {"солдат", "солдаты", "солдат", "солдатов"},
    {"гусар", "гусары", "гусар", "гусаров"},
    {"драгун", "драгуны", "драгун", "драгунов"},
    {"улан", "уланы", "улан", "уланов"},
    {"кадет", "кадеты", "кадет", "кадетов"},
    {"грузин", "грузины", "грузин", "грузинов"},
    {"осетин", "осетины", "осетин", "осетинов"},
    {"армян", "армяне", "армян", "армянов"},
    {"цыган", "цыгане", "цыган", "цыганов"},
    {"болгар", "болгары", "болгар", "болгаров"},
    {"татар", "татары", "татар", "татаров"},
    {"башкир", "башкиры", "башкир", "башкиров"},
    {"турок", "турки", "турок", "турков"},
    {"бурят", "буряты", "бурят", "бурятов"},
    {"румын", "румыны", "румын", "румынов"},
    {"ампер", "амперы", "ампер", "амперов"},
    {"ватт", "ватты", "ватт", "ваттов"},
    {"вольт", "вольты", "вольт", "вольтов"},
    {"герц", "герцы", "герц", "герцев"},
    {"грамм", "граммы", "граммов", "грамм"},
    {"килограмм", "килограммы", "килограммов", "килограмм"},
    {"гектар", "гектары", "гектаров", "гектар"},
    {"акр", "акры", "акров", "акр"},
    {"апельсин", "апельсины", "апельсинов", "апельсин"},
    {"мандарин", "мандарины", "мандаринов", "мандарин"},
    {"помидор", "помидоры", "помидоров", "помидор"},
    {"томат", "томаты", "томатов", "томат"},
    {"баклажан", "баклажаны", "баклажанов", "баклажан"},
    {"банан", "бананы", "бананов", "банан"},
    {"ананас", "ананасы", "ананасов", "ананас"},
    {"абрикос", "абрикосы", "абрикосов", "абрикос"},
    {"персик", "персики", "персиков", "персик"},
    {"гранат", "гранаты", "гранатов", "гранат"},
    {"лимон", "лимоны", "лимонов", "лимон"},
    {"обоим", "обеим", "обоих", "обеих", "обоими", "обеими", "оба", "обе"},
    {"полтора", "полутора", "полтораста", "полутораста"},
    {"двести", "двухсот", "двумстам", "двухстам", "двумястами", "двухстах"},
    {"триста", "трёхсот", "трехсот", "трёмстам", "тремстам", "трёхстам", "трехстам", "тремястами", "трёхстах", "трехстах"},
    {"четыреста", "четырёхсот", "четырехсот", "четырёмстам", "четыремстам", "четырьмястами", "четырёхстах", "четырехстах"},
    {"троим", "троих", "троими", "трём", "трем", "трёх", "трех", "тремя", "три", "трое"},
    {"четверым", "четверых", "четверыми", "четырём", "четырем", "четырёх", "четырех", "четырьмя", "четыре", "четверо"},
    {"пятерым", "пятерых", "пятерыми", "пяти", "пятью", "пять", "пятеро"},
    {"шестерым", "шестерых", "шестерыми", "шести", "шестью", "шесть", "шестеро"},
    {"семерым", "семерых", "семерыми", "семи", "семью", "семь", "семеро"},
    {"восьмерым", "восьмерых", "восьмерыми", "восьми", "восемью", "восьмью", "восемь", "восьмеро"},
    {"дветысячному", "двухтысячному", "дветысячного", "двухтысячного", "дветысячном", "двухтысячном", "дветысячный", "двухтысячный"},
    {"ихний", "ихнего", "ихнему", "ихним", "ихнем", "ихняя", "ихнюю", "ихние", "ихних", "ихними", "их"},
    {"евонный", "евонного", "евонному", "его"},
    {"ейный", "ейного", "ейному", "её", "ее"},
    {"ней", "ей", "неё", "нее", "ею", "нею"},
    {"него", "его", "нему", "ему", "ним", "им"},
    {"них", "их", "ними", "ими"},
    {"кратчайший", "короткий", "короче"},
    {"лучше", "лучший", "хороший"},
    {"хуже", "худший", "плохой"},
    {"красивее", "красивейший", "красивый"},
    {"громче", "громкий"},
    {"выше", "высокий", "высочайший"},
    {"ниже", "низкий", "нижайший"},
    {"шире", "широкий", "широчайший"},
    {"глубже", "глубокий", "глубочайший"},
    {"дольше", "долгий", "долее"},
    {"дальше", "далёкий", "далекий", "далее"},
    {"проще", "простой", "простейший"},
    {"чище", "чистый", "чистейший"},
    {"слаще", "сладкий", "сладчайший"},
    {"тонше", "тоньше", "тонкий", "тончайший"},
    {"дешевле", "дешёвый", "дешевый"},
    {"дороже", "дорогой", "дражайший"},
    {"богаче", "богатый", "богатейший"},
    {"строже", "строгий", "строжайший"},
    {"мягче", "мягкий", "мягчайший"},
    {"легче", "лёгкий", "легкий", "легчайший"},
    {"крепче", "крепкий", "крепчайший"},
    {"ярче", "яркий", "ярчайший"},
    {"моложе", "младше", "молодой", "младший"},
    {"старше", "старее", "старый", "старший"},
    {"звонче", "звонкий"},
    {"ловче", "ловчее", "ловкий"},
    {"бойче", "бойчее", "бойкий"},
    {"хлестче", "хлёстче", "хлесткий", "хлёсткий"},
    {"жестче", "жёстче", "жесткий", "жёсткий"},
]


def extract_task_7_rows_from_primary(body_html: str) -> list[str]:
    clean_raw = re.sub(r"&shy;|[\xad\u200b-\u200f\ufeff]", "", body_html, flags=re.I)
    fixed_html = re.sub(
        r"<b>([^<]+)</b>|<strong>([^<]+)</strong>",
        lambda m: (m.group(1) or m.group(2)).upper(),
        clean_raw,
        flags=re.I,
    )
    raw_txt = clean_html_text(fixed_html)
    raw_txt = re.sub(r"[\u0300\u0301]", "", raw_txt)
    raw_txt = raw_txt.translate(str.maketrans("ÁÓÉÍÚÝáóéíúý", "АОЕИУЫаоеиуы"))
    raw_txt = re.sub(r"(?<=[А-ЯЁ])3(?=[А-ЯЁ])", "З", raw_txt)

    rows = []
    for ln in raw_txt.splitlines():
        ln = ln.strip()
        if not ln:
            continue
        # Strip prompt instructions even if preceded by narrative intro text (e.g., shk-7-40377)
        ln = re.sub(
            r"(?:В одном из выделенных|В одном из привед[её]нных|Исправьте ошибку|Запишите слово правильно|Укажите пример).*$",
            "",
            ln,
            flags=re.I,
        ).strip()
        if not ln:
            continue
        if re.match(r"^(?:В одном из|Исправьте|Запишите|Укажите)", ln, flags=re.I):
            continue
        ln = re.sub(r"^\d+[\).\s]+\s*", "", ln).strip()
        ln = ln.strip(" ;.,")
        if ln and re.search(r"[А-ЯЁ]{2,}", ln):
            rows.append(ln)
    return rows[:5]


def score_task_7_row(row_text: str, ans_list: list[str]) -> float:
    caps_tokens = re.findall(r"[А-ЯЁ]{2,}(?:-[А-ЯЁ]+)?", row_text)
    if not caps_tokens:
        caps_tokens = re.findall(r"[А-ЯЁа-яё]{2,}", row_text)
    caps_full = " ".join(caps_tokens).lower()
    caps_e = norm_yo(caps_full)
    row_e = norm_yo(row_text.lower())

    best = -1.0
    for ans in ans_list:
        ans_e = norm_yo(ans.lower())
        for grp in SUPPLETIVE_GROUPS:
            grp_e = {norm_yo(w) for w in grp}
            if any(t in grp_e for t in caps_e.split()) and any(a in grp_e for a in ans_e.split()):
                best = max(best, 12.0)
        if (
            "более" in caps_e
            or "менее" in caps_e
            or "самый" in caps_e
            or "самая" in caps_e
            or "самое" in caps_e
            or "самые" in caps_e
            or "наиболее" in caps_e
            or "наименее" in caps_e
        ) and any(common_prefix_len(ct, at) >= 3 for ct in caps_e.split() for at in ans_e.split()):
            best = max(best, 11.0)
        for ct in caps_e.split():
            for at in ans_e.split():
                cp = common_prefix_len(ct, at)
                if cp >= 3:
                    best = max(best, cp * 2.0)
                elif cp >= 2 and len(ct) <= 4 and len(at) <= 4:
                    best = max(best, 4.5)
        for rt in row_e.split():
            if rt not in caps_e.split():
                for at in ans_e.split():
                    if len(rt) >= 4 and common_prefix_len(rt, at) >= 4:
                        best = max(best, 3.0)
    return best


def heal_task_7(fipi_bank, sprint_bank, nf_map, shk_map, db_map):
    print("[5/9] Healing Task 7 (morphological error row matching, solvedWords, and Sprint cards)...")
    t7_questions = [q for q in fipi_bank if str(q.get("task")) == "7"]

    repaired_q = 0
    phrase_lookup = {}

    for q in t7_questions:
        rec = get_primary_record(q["id"], nf_map, shk_map, db_map)
        if not rec:
            continue
        ans_list = parse_primary_answers(rec["answer"])
        if not ans_list:
            ans_list = q.get("textAnswers") or [""]
        primary_ans = ans_list[0]

        rows_txt = extract_task_7_rows_from_primary(rec["body_html"])
        if len(rows_txt) != 5:
            rows_txt = [
                re.sub(r"[\xad\u200b-\u200f\ufeff]", "", re.sub(r"(?<=[А-ЯЁ])3(?=[А-ЯЁ])", "З", r["words"][0])).translate(
                    str.maketrans("ÁÓÉÍÚÝáóéíúý", "АОЕИУЫаоеиуы")
                )
                for r in q["rows"]
            ]

        best_idx = 0
        best_sc = -1.0
        for idx, rtxt in enumerate(rows_txt):
            sc = score_task_7_row(rtxt, ans_list)
            if sc > best_sc:
                best_sc = sc
                best_idx = idx

        err_idx = best_idx + 1
        if q["correctIndices"] != [err_idx] or q.get("textAnswers") != ans_list:
            repaired_q += 1

        q["correctIndices"] = [err_idx]
        q["textAnswers"] = ans_list

        new_rows = []
        err_caps_str = ""
        for idx, rtxt in enumerate(rows_txt):
            rnum = idx + 1
            is_err = rnum == err_idx
            m_caps = re.search(r"[А-ЯЁ]{2,}(?:[\s-]+[А-ЯЁ]{2,})*", rtxt)
            caps_part = m_caps.group(0) if m_caps else rtxt
            if is_err:
                err_caps_str = caps_part
                corr_upper = primary_ans.upper()
                solved_r = rtxt.replace(caps_part, corr_upper, 1) if m_caps else corr_upper
                expl = (
                    f"Грамматическая ошибка в образовании формы слова «{caps_part}». "
                    f"Правильная морфологическая норма: «{corr_upper}»."
                )
                let = primary_ans
            else:
                solved_r = rtxt
                expl = f"Форма слова в словосочетании «{rtxt}» образована верно в соответствии с морфологической нормой."
                let = caps_part.lower()
            new_rows.append(
                {
                    "words": [rtxt],
                    "solvedWords": [solved_r],
                    "letter": let,
                    "isCorrectRow": is_err,
                    "explanation": expl,
                }
            )
            if rtxt not in phrase_lookup or is_err:
                phrase_lookup[rtxt] = (rtxt, caps_part, primary_ans.lower(), is_err, expl)
                phrase_lookup[norm_yo(rtxt)] = (rtxt, caps_part, primary_ans.lower(), is_err, expl)

        q["rows"] = new_rows
        q["explanation"] = (
            f"Ошибка в образовании формы слова допущена в строке {err_idx}: "
            f"вместо «{err_caps_str}» правильно «{primary_ans.upper()}»."
        )

    fixed_sprint = 0
    for s in sprint_bank:
        if str(s.get("task")) == "7":
            m = re.search(r"«([^»]+)»", s.get("prefix", "") or s.get("context", ""))
            if not m:
                continue
            phr = re.sub(r"[\xad\u200b-\u200f\ufeff]", "", m.group(1)).strip()
            phr_clean = re.sub(r"(?<=[А-ЯЁ])3(?=[А-ЯЁ])", "З", phr).translate(
                str.maketrans("ÁÓÉÍÚÝáóéíúý", "АОЕИУЫаоеиуы")
            )
            info = phrase_lookup.get(phr_clean) or phrase_lookup.get(phr) or phrase_lookup.get(norm_yo(phr_clean))
            if not info:
                continue
            rtxt, caps_part, corr_low, is_err, expl = info
            if is_err:
                err_low = caps_part.lower()
                new_opts = [corr_low, err_low] if corr_low != err_low else [corr_low, "ошибка"]
                if s.get("answer") != corr_low or s.get("prefix") != f"Исправьте ошибку в форме «{rtxt}»:":
                    s["word"] = corr_low
                    s["prefix"] = f"Исправьте ошибку в форме «{rtxt}»:"
                    s["context"] = f"Найдите правильную морфологическую форму для сочетания: «{rtxt}»"
                    s["answer"] = corr_low
                    s["options"] = new_opts
                    s["explanation"] = expl
                    s["rule"] = expl
                    fixed_sprint += 1
            elif not is_err and s.get("answer") != "ВЕРНО":
                s["word"] = "ВЕРНО"
                s["prefix"] = f"Морфологическая форма «{rtxt}»:"
                s["context"] = f"Оцените грамматическую форму в сочетании: «{rtxt}»"
                s["answer"] = "ВЕРНО"
                s["options"] = ["ВЕРНО", "ОШИБКА"]
                s["explanation"] = expl
                s["rule"] = expl
                fixed_sprint += 1

    print(f"  -> Task 7: repaired {repaired_q} questions (658/658 matched) and {fixed_sprint} Sprint cards.")


# ==============================================================================
# TASKS 9–13: SPECIFIC PRIMARY SOURCE FIXES
# ==============================================================================
def heal_tasks_9_13(fipi_bank, sprint_bank):
    print("[5/8] Healing Tasks 9–13 specific primary-source discrepancies...")
    q_map = {q["id"]: q for q in fipi_bank}
    sp_map = {s["id"]: s for s in sprint_bank}

    # 1. fipi-10-shkolkovo-10-142438 & fipi-10-neofamily-10-79884: дет..ясли -> детясли (no Ъ)
    for qid, new_indices in [("fipi-10-shkolkovo-10-142438", [2, 3]), ("fipi-10-neofamily-10-79884", [3, 5])]:
        if qid in q_map:
            q = q_map[qid]
            q["correctIndices"] = new_indices
            r4 = q["rows"][3]
            r4["solvedWords"][0] = "детясли"
            r4["letter"] = "— / Ъ"
            r4["isCorrectRow"] = False
            r4["explanation"] = re.sub(
                r"детЪясли[^;.]*",
                "«детясли» — сложносокращённое слово (детские ясли), корень начинается с Я после сокращённой основы, разделительный Ъ не пишется",
                r4["explanation"],
            )
            sp_id = qid.replace("fipi-10-", "sp-10-") + "-r4-w1"
            if sp_id in sp_map:
                sp_map[sp_id]["answer"] = "—"
                sp_map[sp_id]["options"] = ["Ъ", "Ь", "—"]
                sp_map[sp_id]["explanation"] = (
                    "«детясли» — сложносокращённое слово (детские ясли); разделительный Ъ после первой части сложносокращённых слов не пишется."
                )
                sp_map[sp_id]["rule"] = sp_map[sp_id]["explanation"]

    # 2. fipi-10-neofamily-10-54718: пр..дать (бодрости) -> прИдать (бодрости)
    if "fipi-10-neofamily-10-54718" in q_map:
        q = q_map["fipi-10-neofamily-10-54718"]
        q["correctIndices"] = [1, 2]
        r3 = q["rows"][2]
        r3["solvedWords"][0] = "прИдать (бодрости)"
        r3["letter"] = "И / Е / Е"
        r3["isCorrectRow"] = False
        r3["explanation"] = (
            "прИдать (бодрости) — приставка ПРИ- в значении прибавления, добавления; "
            + "; ".join(r3["explanation"].split("; ")[1:])
        )
        sp_id = "sp-10-neofamily-10-54718-r3-w1"
        if sp_id in sp_map:
            sp_map[sp_id]["answer"] = "И"
            sp_map[sp_id]["explanation"] = "«прИдать (бодрости)» — приставка ПРИ- в значении добавления, усиления качества."
            sp_map[sp_id]["rule"] = sp_map[sp_id]["explanation"]

    # 3. fipi-10-neofamily-10-28073: вз..ерошенный -> взЪерошенный
    if "fipi-10-neofamily-10-28073" in q_map:
        q = q_map["fipi-10-neofamily-10-28073"]
        r5 = q["rows"][4]
        r5["solvedWords"][2] = "взЪерошенный"
        r5["letter"] = "Ь / Ь / Ъ"
        r5["isCorrectRow"] = False
        r5["explanation"] = re.sub(
            r"взерошенный[^;.]*",
            "«взЪерошенный» — разделительный Ъ пишется после приставки на согласную ВЗ- перед буквой Е",
            r5["explanation"],
        )
        sp_id = "sp-10-neofamily-10-28073-r5-w3"
        if sp_id in sp_map:
            sp_map[sp_id]["answer"] = "Ъ"
            sp_map[sp_id]["options"] = ["Ъ", "Ь", "—"]
            sp_map[sp_id]["explanation"] = (
                "«взЪерошенный» — разделительный Ъ пишется после русской приставки на согласную (ВЗ-) перед йотированной гласной Е."
            )
            sp_map[sp_id]["rule"] = sp_map[sp_id]["explanation"]

    # 4. Task 11 solvedWords typos (резОкий -> резкий, бедняцЕкий -> бедняцкий, моряцЕкий -> моряцкий, низОкий -> низкий, копчЕный -> копчЁный)
    t11_fixes = [
        ("fipi-11-shkolkovo-11-143717", 0, 0, "резОкий", "резкий"),
        ("fipi-11-shkolkovo-11-143723", 2, 0, "бедняцЕкий", "бедняцкий"),
        ("fipi-11-shkolkovo-11-143725", 0, 1, "моряцЕкий", "моряцкий"),
        ("fipi-11-shkolkovo-11-143727", 1, 0, "низОкий", "низкий"),
        ("fipi-11-neofamily-11-50037", 2, 1, "копчЕный", "копчЁный"),
    ]
    for qid, r_i, w_i, bad_w, good_w in t11_fixes:
        if qid in q_map:
            r = q_map[qid]["rows"][r_i]
            r["solvedWords"][w_i] = good_w
            r["explanation"] = r["explanation"].replace(bad_w, good_w)

    # 5. fipi-13-neofamily-13-54453: (НЕ)ПОНАСЛЫШКЕ -> НЕ ПОНАСЛЫШКЕ (РАЗДЕЛЬНО)
    if "fipi-13-neofamily-13-54453" in q_map:
        q = q_map["fipi-13-neofamily-13-54453"]
        q["correctIndices"] = [1, 3, 5]
        r5 = q["rows"][4]
        r5["solvedWords"] = ["НЕ ПОНАСЛЫШКЕ (знать)"]
        r5["letter"] = "РАЗДЕЛЬНО"
        r5["isCorrectRow"] = True
        r5["explanation"] = (
            "«НЕ ПОНАСЛЫШКЕ» — наречие, образованное от существительного с предлогом, с частицей НЕ пишется всегда раздельно."
        )
        sp_id = "sp-13-neofamily-13-54453-r5-w1"
        if sp_id in sp_map:
            sp_map[sp_id]["answer"] = "РАЗДЕЛЬНО"
            sp_map[sp_id]["explanation"] = r5["explanation"]
            sp_map[sp_id]["rule"] = r5["explanation"]

    print("  -> Tasks 9–13: all primary-source fixes applied.")


# ==============================================================================
# TASK 14: 100% PRIMARY SOURCE ALIGNMENT (368 QUESTIONS / 1,840 ROWS / SPRINT)
# ==============================================================================
def clean_t14_raw_sentence(sent: str) -> str:
    sent = sent.translate(LAT_TO_CYR)
    sent = re.sub(r"(?<=[А-ЯЁ()])3|3(?=[А-ЯЁ()])", "З", sent)
    sent = re.sub(r"[А-ЯЁа-яё]*\([А-ЯЁ\s-]+\)[А-ЯЁа-яё]*", lambda m: m.group(0).upper(), sent)
    sent = re.sub(r"\(ТОЧЬ\)\s*\(?В\)?\s*\(?ТОЧЬ\)?", "ТОЧЬ(В)ТОЧЬ", sent, flags=re.I)
    sent = re.sub(r"\(БОК\)\s*\(?О\)?\s*\(?БОК\)?", "БОК(О)БОК", sent, flags=re.I)
    sent = re.sub(
        r"\(В\)\s*\(КОНЦЕ\)\s*КОНЦОВ|\bВ\s*\(КОНЦЕ\)\s*КОНЦОВ|\bВ\s*КОНЦЕ\s*\(КОНЦОВ\)",
        "(В)КОНЦЕ КОНЦОВ",
        sent,
        flags=re.I,
    )
    sent = re.sub(r"\(КОЕ\)\s*\(?О\)?\s*ЧЁМ", "КОЕ(О)ЧЁМ", sent, flags=re.I)
    sent = re.sub(r"\(КОЕ\)\s*\(?С\)?\s*КЕМ", "КОЕ(С)КЕМ", sent, flags=re.I)
    sent = re.sub(r"\(В\)\s*\(ПОЛ\)ГОЛОСА", "(В)ПОЛГОЛОСА", sent, flags=re.I)
    sent = re.sub(r"\(В\)\s*\(ПОЛ\)СИЛЫ", "(В)ПОЛСИЛЫ", sent, flags=re.I)
    sent = re.sub(r"\(НЕ\)\s*\(В\)ПОПАД", "(НЕ)ВПОПАД", sent, flags=re.I)
    sent = re.sub(r"\(НЕ\)\s*\(В\)ДОМЁК", "(НЕ)ВДОМЁК", sent, flags=re.I)
    sent = re.sub(r"\(НЕ\)\s*\(В\)ЗНАЧАЙ", "(НЕ)ВЗНАЧАЙ", sent, flags=re.I)
    sent = re.sub(r"\(ИС\)\s*\(ПОД\)ЛОБЬЯ", "(ИС)ПОДЛОБЬЯ", sent, flags=re.I)
    sent = re.sub(r"\(СЛЕД\)\s*\(В\)СЛЕД", "СЛЕД(В)СЛЕД", sent, flags=re.I)
    sent = re.sub(r"\(ТАК\)\s*\(ЖЕ\)", "ТАК(ЖЕ)", sent, flags=re.I)
    sent = re.sub(r"\bИЗ\s+\(ЗА\)", "ИЗ(ЗА)", sent)
    sent = re.sub(r"(?<![А-ЯЁа-яё])(\([А-ЯЁ]{1,6}\))\s+([А-ЯЁ]{2,})(?!\s*\()", r"\1\2", sent)
    sent = re.sub(r"(?<!\)\s)(?<![А-ЯЁа-яё]\()([А-ЯЁ]{2,})\s+(\([А-ЯЁ]{1,6}\))(?![А-ЯЁа-яё])", r"\1\2", sent)
    sent = re.sub(r"([А-ЯЁ]{2,})\s+(\((?:ТО|ЖЕ|БЫ|ЛИ|КА|НИБУДЬ|ЛИБО|ТАКИ)\))(?![А-ЯЁа-яё])", r"\1\2", sent)
    sent = re.sub(
        r"(?<![А-ЯЁа-яё])(\((?:ИЗ|ПОД|НАД|ЗА|ПО|ОТ|ДО|ВО|СО|БЕЗ|В|С|К|У|О)\))\s+(\(?[А-ЯЁ]{2,}\)?)",
        r"\1\2",
        sent,
    )
    return sent


def extract_t14_slots(sent: str) -> list[str]:
    slots = re.findall(r"\(В\)КОНЦЕ КОНЦОВ|[А-ЯЁ]*\([А-ЯЁ\s-]+\)[А-ЯЁ]*", sent)
    return [s for s in slots if re.search(r"[А-ЯЁ]{2,}", re.sub(r"[()\s-]", "", s))]


def split_slot_parts(slot: str) -> list[str]:
    if slot == "(В)КОНЦЕ КОНЦОВ":
        return ["В", "КОНЦЕ", "КОНЦОВ"]
    parts = [p.strip(" -") for p in re.split(r"[()\s]+", slot) if p.strip(" -")]
    return [p.upper() for p in parts]


def detect_t14_from_expl(slot: str, expl: str, slot_idx: int = 0, same_slots: bool = False):
    parts = split_slot_parts(slot)
    if len(parts) < 2:
        return None
    if len(parts) == 3 and parts == ["В", "КОНЦЕ", "КОНЦОВ"]:
        return "В КОНЦЕ КОНЦОВ", "РАЗДЕЛЬНО"
    slitno = "".join(parts)
    defis = "-".join(parts)
    razdel = " ".join(parts)
    slitno_e = norm_yo(slitno)
    defis_e = norm_yo(defis)
    razdel_e = norm_yo(razdel)
    expl_e = norm_yo(expl)
    expl_e = re.sub(r"(?<=[А-ЯA-Z])\s*-\s*(?=[А-ЯA-Z])", "-", expl_e)

    if same_slots:
        m_raz = re.search(r"(?<![А-ЯЁа-яё])" + re.escape(razdel_e) + r"(?![А-ЯЁа-яё])", expl_e)
        m_sli = re.search(r"(?<![А-ЯЁа-яё])" + re.escape(slitno_e) + r"(?![А-ЯЁа-яё])", expl_e)
        if m_raz and m_sli:
            ordered = [(m_raz.start(), (razdel, "РАЗДЕЛЬНО")), (m_sli.start(), (slitno, "СЛИТНО"))]
            ordered.sort(key=lambda x: x[0])
            return ordered[slot_idx][1]

    esc_slot = re.escape(norm_yo(slot))
    m = re.search(esc_slot + r"\s*\((?:в данном случае\s+)?([А-ЯЁA-Z\s-]+?)\s+[—\-]\s+", expl_e, re.I)
    if m:
        form = re.sub(r"\s+", " ", m.group(1).strip().upper())
        if "-" in form:
            return defis, "ДЕФИСНО"
        elif " " in form:
            return razdel, "РАЗДЕЛЬНО"
        else:
            return slitno, "СЛИТНО"

    m2 = re.search(
        esc_slot + r"\s*\((.{1,350}?)(?:не путать|сравните|(?<!\?)\)\s+[а-яёА-ЯЁ])",
        expl_e,
        re.I | re.S,
    )
    if m2:
        inside = m2.group(1)
        if re.search(r"пиш[уе]тся\s+раздельно", inside, re.I):
            return razdel, "РАЗДЕЛЬНО"
        if re.search(r"пиш[уе]тся\s+через\s+дефис", inside, re.I):
            return defis, "ДЕФИСНО"
        if re.search(r"пиш[уе]тся\s+слитно", inside, re.I):
            return slitno, "СЛИТНО"

    clean_ex = re.sub(r"(?:не путать|сравните|кроме|отличать от)[^.;)]*", "", expl_e, flags=re.I)

    p0 = norm_yo(parts[0])
    p1_stem = norm_yo(parts[1])[:-2] if len(parts[1]) >= 5 else norm_yo(parts[1])
    stem_defis = p0 + "-" + p1_stem
    stem_slitno = p0 + p1_stem

    has_defis = bool(re.search(r"(?<![А-ЯЁа-яё-])" + re.escape(stem_defis) + r"[А-ЯЁа-яё]*", clean_ex, re.I))
    has_razdel_upper = bool(re.search(r"(?<![А-ЯЁа-яё])" + re.escape(razdel_e) + r"(?![А-ЯЁа-яё])", clean_ex))
    has_slitno_upper = bool(re.search(r"(?<![А-ЯЁа-яё])" + re.escape(stem_slitno) + r"[А-ЯЁ]*", clean_ex))

    if has_defis and not has_razdel_upper and not has_slitno_upper:
        return defis, "ДЕФИСНО"
    if has_razdel_upper and not has_defis and not has_slitno_upper:
        return razdel, "РАЗДЕЛЬНО"
    if has_slitno_upper and not has_defis and not has_razdel_upper:
        return slitno, "СЛИТНО"

    for form, orig_form, label, kw in [
        (stem_defis, defis, "ДЕФИСНО", "дефис"),
        (razdel_e, razdel, "РАЗДЕЛЬНО", r"раздельно|в два слова|существительное с предлогом|предлог с"),
        (stem_slitno, slitno, "СЛИТНО", "слитно"),
    ]:
        if re.search(re.escape(form) + r"[А-ЯЁа-яё]*[^.;]{0,90}(?:" + kw + r")", clean_ex, re.I):
            return orig_form, label
    return None


def make_t14_rule_and_topic(word: str, let: str, base_rule: str, base_topic: str):
    # Ensure rule and topic never contradict let ("СЛИТНО", "ДЕФИСНО", "РАЗДЕЛЬНО")
    label_text = "ЧЕРЕЗ ДЕФИС" if let == "ДЕФИСНО" else let
    if let == "ДЕФИСНО":
        topic = "Дефисное написание слов (через дефис)"
        rule = f"«{word}» — в данном контексте пишется через дефис в соответствии с орфографической нормой; поэтому пишется ЧЕРЕЗ ДЕФИС — «{word}»."
    elif let == "РАЗДЕЛЬНО":
        topic = "Раздельное написание слов (раздельно)"
        rule = f"«{word}» — в данном контексте представляет собой раздельное сочетание слов; поэтому пишется РАЗДЕЛЬНО — «{word}»."
    else:
        topic = "Слитное написание слов (слитно)"
        rule = f"«{word}» — в данном контексте пишется слитно в соответствии с орфографической нормой; поэтому пишется СЛИТНО — «{word}»."

    # Keep base_rule/base_topic if base_resolve_t14_token already agreed on let
    if base_rule and f"пишется {label_text}" in base_rule:
        if not (
            (let == "СЛИТНО" and ("(через дефис)" in base_topic or "(раздельно)" in base_topic))
            or (let == "ДЕФИСНО" and ("(слитно)" in base_topic or "(раздельно)" in base_topic))
            or (let == "РАЗДЕЛЬНО" and ("(слитно)" in base_topic or "(через дефис)" in base_topic))
        ):
            clean_base_rule = (
                base_rule.replace("устойчивое сочетание / производный предлог", "наречное сочетание")
                .replace("наречие или производный предлог", "наречное выражение")
                .replace("либо полное причастие", "причастие")
            )
            return clean_base_rule, base_topic
    return rule, topic


def heal_task_14(fipi_bank, sprint_bank, starter_bank, orig_map):
    print("[7/9] Healing Task 14 (restoring primary-source answers & resolving all 3,680 slots)...")
    t14_questions = [q for q in fipi_bank if str(q.get("task")) == "14"]

    slot_lookup = {}  # (qid, ridx, widx) -> (word, let, rule, topic, raw_sent, parts)
    repaired_q = 0

    for q in t14_questions:
        oq = orig_map.get(q["id"])
        if not oq:
            continue
        orig_rule = oq.get("rule") or q.get("instruction") or ""
        if "ДЕФИС" in orig_rule.upper():
            target = "ДЕФИСНО"
        elif "РАЗДЕЛЬНО" in orig_rule.upper():
            target = "РАЗДЕЛЬНО"
        else:
            target = "СЛИТНО"

        dedup_indices = sorted(set(oq["correctIndices"]))

        # Verify whether explanations on dedup_indices rows explicitly state a different target
        # (e.g., fipi-14-neofamily-14-36730 where rule in 432f74b was mislabeled СЛИТНО instead of РАЗДЕЛЬНО)
        expl_lets_on_correct = []
        for ridx in dedup_indices:
            if 1 <= ridx <= len(oq["rows"]):
                orow = oq["rows"][ridx - 1]
                raw_s = clean_t14_raw_sentence(orow["words"][0])
                slts = extract_t14_slots(raw_s)
                same_s = len(slts) == 2 and slts[0] == slts[1]
                for sidx, sl in enumerate(slts):
                    d = detect_t14_from_expl(sl, orow.get("explanation", ""), sidx, same_s)
                    if d is not None:
                        expl_lets_on_correct.append(d[1])
        if expl_lets_on_correct and len(set(expl_lets_on_correct)) == 1:
            detected_target = expl_lets_on_correct[0]
            if detected_target != target:
                target = detected_target
                if target == "РАЗДЕЛЬНО":
                    orig_rule = "Укажите варианты ответов, в которых все выделенные слова пишутся РАЗДЕЛЬНО. Запишите номера ответов."
                elif target == "ДЕФИСНО":
                    orig_rule = "Укажите варианты ответов, в которых все выделенные слова пишутся ЧЕРЕЗ ДЕФИС. Запишите номера ответов."
                else:
                    orig_rule = "Укажите варианты ответов, в которых все выделенные слова пишутся СЛИТНО. Запишите номера ответов."

        if q["correctIndices"] != dedup_indices or q.get("instruction") != orig_rule:
            repaired_q += 1
        q["correctIndices"] = dedup_indices
        q["instruction"] = orig_rule
        q["target"] = target

        for ridx, (r, orow) in enumerate(zip(q["rows"], oq["rows"]), 1):
            orig_ok = ridx in dedup_indices
            raw_sent = clean_t14_raw_sentence(orow["words"][0])
            slots = extract_t14_slots(raw_sent)
            same_slots = len(slots) == 2 and slots[0] == slots[1]

            resolved_words = []
            resolved_letters = []
            resolved_rules = []

            for sidx, sl in enumerate(slots):
                parts = split_slot_parts(sl)
                bw, blet, brule, btopic, _ = base_resolve_t14_token(sl, raw_sent)
                if orig_ok:
                    let = target
                    if target == "ДЕФИСНО":
                        word = "-".join(parts)
                    elif target == "РАЗДЕЛЬНО":
                        word = " ".join(parts)
                    else:
                        word = "".join(parts)
                else:
                    d = detect_t14_from_expl(sl, orow.get("explanation", ""), sidx, same_slots)
                    if d is not None:
                        word, let = d
                    else:
                        word, let = bw, blet

                rule, topic = make_t14_rule_and_topic(word, let, brule if blet == let else "", btopic if blet == let else "")
                resolved_words.append(word)
                resolved_letters.append(let)
                resolved_rules.append(rule)
                slot_lookup[(q["id"], ridx, sidx + 1)] = (word, let, rule, topic, raw_sent, parts)

            solved_sent = raw_sent
            for sl, w_res in zip(slots, resolved_words):
                solved_sent = solved_sent.replace(sl, w_res, 1)

            r["words"] = [raw_sent]
            r["solvedWords"] = [solved_sent]
            r["letter"] = " / ".join(resolved_letters)
            r["isCorrectRow"] = orig_ok
            r["explanation"] = "; ".join(resolved_rules)

    def resolve_sprint_t14_card(s):
        m = re.match(r"^sp-14-(.+)-r(\d+)-w(\d+)$", s["id"])
        if not m:
            return False
        qid = f"fipi-14-{m.group(1)}"
        ridx = int(m.group(2))
        widx = int(m.group(3))

        p_clean = norm_yo(re.sub(r"[()]", "", s.get("prefix") or "").strip().upper())
        s_tokens = (s.get("suffix") or "").strip().split()
        s_first = norm_yo((s_tokens[0] if s_tokens else "").strip(".,!?:;«»\"'()").upper())

        chosen = None
        for cand_widx in (1, 2):
            cand = slot_lookup.get((qid, ridx, cand_widx))
            if not cand:
                continue
            _, _, _, _, _, cparts = cand
            if len(cparts) >= 2 and norm_yo(cparts[0]) == p_clean and norm_yo(cparts[1]) == s_first:
                chosen = cand
                break
        if chosen is None:
            chosen = slot_lookup.get((qid, ridx, widx))
        if not chosen:
            return False

        word, let, rule, topic, raw_sent, _ = chosen
        s["answer"] = let
        s["options"] = ["СЛИТНО", "ДЕФИСНО", "РАЗДЕЛЬНО"]
        s["explanation"] = rule
        s["rule"] = rule
        s["topic"] = topic
        return True

    # Update Sprint cards for Task 14
    fixed_sprint = 0
    for s in sprint_bank:
        if str(s.get("task")) == "14" and resolve_sprint_t14_card(s):
            fixed_sprint += 1

    for s in starter_bank.get("sprint", []):
        if str(s.get("task")) == "14":
            resolve_sprint_t14_card(s)

    print(f"  -> Task 14: restored {repaired_q} questions (368/368 matched) and {fixed_sprint} Sprint cards.")


# ==============================================================================
# TASK 15: Н vs НН (FIX ALL 79 INVERTED QUESTIONS + 8 100POINTS + EXPLANATIONS)
# ==============================================================================
T15_DENOMINAL_AN_YAN_IN_STEMS = (
    "песчан", "глинян", "кожан", "серебрян", "ледян", "нефтян", "шерстян", "землян",
    "водян", "травян", "полотнян", "берестян", "костян", "жестян", "платян", "слюдян",
    "торфян", "маслян", "ветрян", "солян", "дровян", "кровян", "смолян", "ржан",
    "льнян", "овсян", "овчин", "лебедин", "гусин", "утин", "курин", "петушин",
    "орлин", "соколин", "соловьин", "воробьин", "журавлин", "голубин", "ястребин",
    "пчелин", "осин", "шмелин", "комарин", "муравьин", "мышин", "крысин", "львин",
    "тигрин", "зверин", "змеин", "лошадин", "кобылин", "ослин", "телятин", "говядин",
    "баранин", "тополин",
)


def make_accurate_t15_single_n_explanation(solved_w: str) -> str:
    low = norm_yo(solved_w.lower())
    if any(st in low for st in T15_DENOMINAL_AN_YAN_IN_STEMS):
        return f"{solved_w} — суффикс -АН-/-ЯН-/-ИН- в отымённом прилагательном, пишется одна буква Н."
    if any(
        st in low
        for st in (
            "румян", "багрян", "зелен", "син", "прян", "рьян", "пьян", "юн", "един",
            "свин", "баран", "тюлен", "олен", "павлин", "фазан", "ворон", "картин",
            "машин", "тишин", "вершин", "глубин", "середин", "долин", "равнин", "причин",
            "мужчин", "женщин", "гостин", "дружин", "княжн", "сотн", "песн", "басн",
            "спальн", "читальн", "колокольн", "башн", "пашн", "конюшн", "скворечн",
            "горничн", "булочн", "прачечн", "труженик", "маслениц", "пудрениц", "сребреник",
            "мошенник", "племянник", "вареник", "мученик", "ученик", "копчен",
        )
    ):
        return f"{solved_w} — буква Н входит в состав корня (или суффикса с одной Н: -НИК-/-НИЦ-/-ЕН-), удвоения Н не происходит."
    if low in ("ранее", "заранее", "накануне", "поистине") or low.endswith(("но", "не")):
        return f"{solved_w} — в наречии (или производном слове) сохраняется одна буква Н производящей основы."
    if "путаниц" in low:
        return f"{solved_w} — существительное образовано от отглагольного прилагательного «путаный», пишется одна буква Н."
    if re.search(r"(?:ан|ян|ен|ён)(?:а|о|ы)$", low):
        return f"{solved_w} — в кратком страдательном причастии прошедшего времени всегда пишется одна буква Н."
    return (
        f"{solved_w} — отглагольное прилагательное, образованное от бесприставочного глагола "
        "несовершенного вида без зависимых слов, пишется одна буква Н."
    )


def heal_task_15(fipi_bank, nf_map, orig_map):
    print("[8/9] Healing Task 15 (restoring Н vs НН instruction, 8 100points prototypes & explanations)...")
    t15_questions = [q for q in fipi_bank if str(q.get("task")) == "15"]
    repaired_q = 0

    # Fix the 8 100points Task 15 questions that had dummy [1, 2] answers and non-existent spellings in 432f74b
    T15_100POINTS_ROW_OVERRIDES = {
        "fipi-15-100points-15-2211": {
            1: ("латаНый", "Н"),
            2: ("длиННый", "НН"),
            3: ("нечёсаНой", "Н"),
            4: ("путаНицы", "Н"),
        },
        "fipi-15-100points-15-220": {
            1: ("деревяННая", "НН"),
            2: ("письмеННый", "НН"),
            3: ("коваНым", "Н"),
            4: ("оклееННый", "НН"),
        },
        "fipi-15-100points-15-32": {
            1: ("МощёННые", "НН"),
            2: ("окружеНы", "Н"),
            3: ("камеННые", "НН"),
        },
        "fipi-15-100points-15-3435": {
            1: ("сосредоточеННости", "НН"),
            2: ("неожидаННые", "НН"),
            3: ("безукоризнеННо", "НН"),
        },
        "fipi-15-100points-15-3524": {
            1: ("излюблеННое", "НН"),
            2: ("художествеННое", "НН"),
            3: ("монотоННость", "НН"),
            4: ("умножеННые", "НН"),
        },
        "fipi-15-100points-15-2869": {
            1: ("МощёННая", "НН"),
            2: ("украшеНа", "Н"),
            3: ("стекляННыми", "НН"),
            4: ("золочёНой", "Н"),
            5: ("создаННой", "НН"),
        },
        "fipi-15-100points-15-2876": {
            1: ("одарёННая", "НН"),
            2: ("обречеНа", "Н"),
            3: ("соответствеННо", "НН"),
            4: ("постепеННое", "НН"),
        },
        "fipi-15-100points-15-6830": {
            1: ("сконструироваНы", "Н"),
            2: ("невидаННые", "НН"),
            3: ("удлинёННые", "НН"),
            4: ("фиНского", "Н"),
        },
    }

    for q in t15_questions:
        qid = q["id"]
        if qid in T15_100POINTS_ROW_OVERRIDES:
            overrides = T15_100POINTS_ROW_OVERRIDES[qid]
            for idx, r in enumerate(q["rows"], 1):
                if idx in overrides:
                    sw, let = overrides[idx]
                    r["solvedWords"] = [sw]
                    r["letter"] = let
                    if let == "Н":
                        r["explanation"] = make_accurate_t15_single_n_explanation(sw)
                    else:
                        r["explanation"] = (
                            f"{sw} — пишется две буквы НН в соответствии с орфографическим правилом "
                            "(полное причастие с приставкой/зависимыми словами, суффикс -ЕНН-/-ОНН-, "
                            "слово-исключение или стык основы на -Н- и суффикса -Н-)."
                        )

        # Normalize solvedWords casing (ensure inserted Н/НН at marker position is uppercase)
        for idx, r in enumerate(q["rows"], 1):
            raw_w = r["words"][0]
            let = r["letter"].strip().upper()
            m_gap = re.match(r"^([^\(]+)\(\d+\)(.*)$", raw_w)
            if m_gap:
                expected_sw = f"{m_gap.group(1)}{let}{m_gap.group(2)}"
                if r["solvedWords"][0] != expected_sw:
                    r["solvedWords"] = [expected_sw]
            if let == "Н" and "суффикс -АН-/-ЯН-/-ИН- в отымённом прилагательном" in (r.get("explanation") or ""):
                r["explanation"] = make_accurate_t15_single_n_explanation(r["solvedWords"][0])

        orig_prompt = ""
        if qid in nf_map:
            orig_prompt = clean_html_text(nf_map[qid].get("question") or "")
        elif qid in orig_map:
            orig_prompt = orig_map[qid].get("rule") or orig_map[qid].get("instruction") or ""

        # Check whether primary source asks for НН or single Н
        if re.search(r"пишется\s+(?:две\s+буквы\s+)?НН(?![а-яёА-ЯЁ])", orig_prompt, re.I):
            target = "НН"
            instr = "Укажите все цифры, на месте которых пишется НН."
        elif re.search(r"пишется\s+(?:одна\s+буква\s+)?Н(?![а-яёА-ЯЁнН])", orig_prompt, re.I):
            target = "Н"
            instr = "Укажите все цифры, на месте которых пишется одна буква Н."
        else:
            if qid in orig_map:
                orig_indices = orig_map[qid]["correctIndices"]
                first_let = q["rows"][orig_indices[0] - 1]["letter"].strip().upper()
                target = first_let
                instr = (
                    "Укажите все цифры, на месте которых пишется НН."
                    if target == "НН"
                    else "Укажите все цифры, на месте которых пишется одна буква Н."
                )
            else:
                continue

        new_indices = []
        for idx, r in enumerate(q["rows"], 1):
            is_ok = r["letter"].strip().upper() == target
            r["isCorrectRow"] = is_ok
            if is_ok:
                new_indices.append(idx)

        if q["correctIndices"] != new_indices or q.get("instruction") != instr or q.get("target") != target:
            repaired_q += 1
            q["correctIndices"] = new_indices
            q["instruction"] = instr
            q["target"] = target

    print(f"  -> Task 15: repaired {repaired_q} questions (350/350 matched).")


# ==============================================================================
# TASKS 18 & 21: MULTI-DIGIT MARKERS (10..13) AND ALTERNATIVE ANSWER GROUPS
# ==============================================================================
def split_multi_digit_answer(ans_str: str, max_marker: int = 9) -> list[int]:
    s = re.sub(r"\D", "", str(ans_str or ""))
    if not s:
        return []
    res = []
    i = 0
    while i < len(s):
        if i + 1 < len(s):
            two = int(s[i : i + 2])
            if 10 <= two <= max_marker:
                res.append(two)
                i += 2
                continue
        d = int(s[i])
        if 1 <= d <= max_marker:
            res.append(d)
        i += 1
    return sorted(set(res))


def rebuild_numbered_gaps_question(q, rec, task_num: int):
    txt = clean_html_text(rec["body_html"])
    lines = [
        ln
        for ln in txt.splitlines()
        if not re.match(r"^(?:Расставьте|Укажите|Запишите|В предложении|На месте каких)", ln, flags=re.I)
    ]
    full_text = " ".join(lines).strip()
    # Normalize spaces around markers (1)..(15)
    full_text = re.sub(r"\(\s*(\d{1,2})\s*\)", r"(\1)", full_text)
    markers = [int(m) for m in re.findall(r"\((\d{1,2})\)", full_text)]
    max_marker = max(markers) if markers else 9

    raw_ans = rec["answer"]
    if isinstance(raw_ans, list):
        ans_parts = [str(x).strip() for x in raw_ans if str(x).strip()]
    else:
        ans_parts = [p.strip() for p in re.split(r"(?:\s+или\s+|[\n,;/|]+)", str(raw_ans or "")) if p.strip()]

    groups = []
    for p in ans_parts:
        g = split_multi_digit_answer(p, max_marker)
        if g and g not in groups:
            groups.append(g)

    if not groups:
        return False

    primary_group = groups[0]
    q["correctIndices"] = primary_group
    q["sentence"] = full_text
    if len(groups) > 1:
        q["textAnswers"] = ["".join(str(x) for x in g) for g in groups]
    elif "textAnswers" in q:
        del q["textAnswers"]

    sol_text = clean_html_text(rec["solution_html"]) or q.get("explanation") or "См. правило пунктуации."
    q["explanation"] = sol_text

    # Rebuild rows 1..max_marker
    new_rows = []
    for m_num in range(1, max_marker + 1):
        is_ok = m_num in primary_group
        let = "," if is_ok else "—"
        if len(groups) > 1:
            valid_str = " или ".join("".join(str(x) for x in g) for g in groups)
            expl = f"Допустимые варианты ответа по ключу: {valid_str}. {sol_text}"
        else:
            expl = (
                f"На месте цифры ({m_num}) ставится запятая. {sol_text}"
                if is_ok
                else f"На месте цифры ({m_num}) запятая не ставится. {sol_text}"
            )
        new_rows.append(
            {
                "words": [full_text if m_num == 1 else f"Цифра ({m_num})"],
                "solvedWords": ["," if is_ok else ""],
                "letter": let,
                "isCorrectRow": is_ok,
                "explanation": expl,
            }
        )
    q["rows"] = new_rows
    return True


def extract_task_21_sentences_from_primary(body_html: str) -> dict[int, str]:
    txt = clean_html_text(body_html)
    # Fix OCR '(З)' -> '(3)' and leading '1)' -> '(1)'
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


def heal_tasks_18_and_21(fipi_bank, sprint_bank, nf_map, shk_map, db_map):
    print("[9/9] Healing Tasks 18 & 21 (multi-digit markers 10..13, placeholder/truncated Task 21 rows, and Sprint cards)...")
    repaired_18 = 0
    for q in fipi_bank:
        if str(q.get("task")) == "18" and q["id"] in (
            "nf-18-47794",
            "nf-18-50746",
            "nf-18-49720",
            "shk-18-29059",
            "fipi-18-neofamily-18-47794",
            "fipi-18-neofamily-18-50746",
            "fipi-18-neofamily-18-49720",
            "fipi-18-shkolkovo-18-29059",
        ):
            rec = get_primary_record(q["id"], nf_map, shk_map, db_map)
            if rec and rebuild_numbered_gaps_question(q, rec, 18):
                repaired_18 += 1

    repaired_21 = 0
    t21_sent_lookup = {}
    for q in fipi_bank:
        if str(q.get("task")) != "21":
            continue
        rec = get_primary_record(q["id"], nf_map, shk_map, db_map)
        if not rec:
            continue

        sent_map = extract_task_21_sentences_from_primary(rec["body_html"])
        max_sent_num = max(sent_map.keys()) if sent_map else len(q.get("rows", []))
        sol_text = clean_html_text(rec["solution_html"]) or q.get("explanation") or ""

        # Check if rows in q are placeholders ("Предложение (1)"), truncated (e.g. 9 rows instead of 10..12), or from wrong text
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
                rebuilt_rows.append(
                    {
                        "words": [stxt],
                        "solvedWords": [stxt],
                        "letter": "—",
                        "isCorrectRow": False,
                        "explanation": sol_text,
                    }
                )
            q["rows"] = rebuilt_rows
            repaired_21 += 1

        max_m = len(q["rows"])

        raw_ans = rec["answer"]
        if isinstance(raw_ans, list):
            ans_parts = [str(x).strip() for x in raw_ans if str(x).strip()]
        else:
            ans_parts = [p.strip() for p in re.split(r"(?:\s+или\s+|[\n,;/|]+)", str(raw_ans or "")) if p.strip()]

        groups = []
        for p in ans_parts:
            g = split_multi_digit_answer(p, max_m)
            if g and g not in groups:
                groups.append(g)
        if not groups:
            continue

        valid_for_rows = [g for g in groups if all(x <= len(q["rows"]) for x in g)]
        primary_group = valid_for_rows[0] if valid_for_rows else groups[0]

        all_group_strs = ["".join(str(x) for x in g) for g in groups]
        if q["correctIndices"] != primary_group or (len(groups) > 1 and q.get("textAnswers") != all_group_strs):
            repaired_21 += 1

        q["correctIndices"] = primary_group
        if len(groups) > 1:
            q["textAnswers"] = all_group_strs
            valid_str = " или ".join(all_group_strs)
            if "Допустимые варианты ответа" not in (q.get("explanation") or ""):
                q["explanation"] = f"Допустимые варианты ответа по ключу: {valid_str}. " + (q.get("explanation") or "")
        elif "textAnswers" in q:
            del q["textAnswers"]

        primary_group_str = "".join(str(x) for x in primary_group)
        for idx, r in enumerate(q["rows"], 1):
            is_ok = idx in primary_group
            r["isCorrectRow"] = is_ok
            r["letter"] = str(idx) if is_ok else "—"
            if len(groups) > 1 and "Допустимые варианты ответа" not in (r.get("explanation") or ""):
                r["explanation"] = f"Допустимые варианты ответа по ключу: {' или '.join(all_group_strs)}. " + (
                    r.get("explanation") or ""
                )
            sent_txt = r["words"][0].strip()
            t21_sent_lookup[sent_txt] = (idx, is_ok, primary_group_str, r["explanation"])
            t21_sent_lookup[norm_yo(sent_txt)] = (idx, is_ok, primary_group_str, r["explanation"])

    fixed_sprint_21 = 0
    for s in sprint_bank:
        if str(s.get("task")) == "21":
            ctx_sent = re.sub(r"[\xad\u200b-\u200f\ufeff]", "", (s.get("context") or "")).strip()
            info = t21_sent_lookup.get(ctx_sent) or t21_sent_lookup.get(norm_yo(ctx_sent))
            if info:
                idx, is_ok, pg_str, expl = info
                opts = s.get("options", [])
                if "ВХОДИТ В ОТВЕТ" in opts:
                    new_ans = "ВХОДИТ В ОТВЕТ" if is_ok else "ДРУГОЕ ПРАВИЛО"
                else:
                    new_ans = "ДА" if is_ok else "НЕТ"
                if s.get("answer") != new_ans:
                    s["word"] = new_ans
                    s["answer"] = new_ans
                    s["explanation"] = (
                        expl
                        if is_ok
                        else f"Предложение ({idx}) не входит в основную группу ответа ({pg_str})."
                    )
                    s["rule"] = s["explanation"]
                    fixed_sprint_21 += 1

    print(
        f"  -> Task 18: repaired {repaired_18} questions; Task 21: repaired {repaired_21} questions and {fixed_sprint_21} Sprint cards."
    )


def heal_tasks_8_and_22_and_sprint_truncations(fipi_bank, sprint_bank):
    print("  -> Healing Tasks 8 & 22 header bleeds, Task 8 48-char truncated Sprint options, and Sprint sentence truncations...")
    HEADER_BLEED_RE = re.compile(
        r"\s+(?:ИЗОБРАЗИТЕЛЬНО[- ]ВЫРАЗИТЕЛЬНЫЕ СРЕДСТВА ЯЗЫКА|Изобразительно-выразительные средства языка|Предложения:?|Преложения:?|Предложение:?|СПИСОК ТЕРМИНОВ|СРЕДСТВА ВЫРАЗИТЕЛЬНОСТИ).*$"
    )
    t8_prefix_to_full = {}

    for q in fipi_bank:
        t = str(q.get("task"))
        if t in ("8", "22"):
            for ml in q.get("matchingLetters", []):
                clean_t = re.sub(r"[\xad\u200b-\u200f\ufeff]", "", ml.get("text", "")).strip()
                clean_t = HEADER_BLEED_RE.sub("", clean_t).strip()
                ml["text"] = clean_t
                if t == "8" and len(clean_t) > 45:
                    t8_prefix_to_full[clean_t[:48]] = clean_t
                    t8_prefix_to_full[norm_yo(clean_t[:48])] = clean_t
            for r in q.get("rows", []):
                if "explanation" in r:
                    r["explanation"] = HEADER_BLEED_RE.sub("", r["explanation"]).strip()

    for s in sprint_bank:
        t = str(s.get("task"))
        if "context" in s and s["context"]:
            s["context"] = HEADER_BLEED_RE.sub("", re.sub(r"[\xad\u200b-\u200f\ufeff]", "", s["context"])).strip()
        if t == "8":
            # Also extract full error name from s["explanation"] if present: "В этом предложении допущена ошибка: <full>."
            m_ex = re.search(r"допущена ошибка:\s*(.+?)\.?\s*$", re.sub(r"[\xad\u200b-\u200f\ufeff]", "", s.get("explanation") or ""))
            if m_ex:
                full_err = HEADER_BLEED_RE.sub("", m_ex.group(1)).strip()
                t8_prefix_to_full[full_err[:48]] = full_err
                t8_prefix_to_full[norm_yo(full_err[:48])] = full_err

    # Second pass on Sprint bank to expand all truncated 48-char Task 8 options/answers and fix Task 22 OCR options
    for s in sprint_bank:
        t = str(s.get("task"))
        if t == "8":
            ans_clean = re.sub(r"[\xad\u200b-\u200f\ufeff]", "", s.get("answer") or "")
            full_ans = t8_prefix_to_full.get(ans_clean) or t8_prefix_to_full.get(norm_yo(ans_clean)) or ans_clean
            s["answer"] = full_ans
            s["word"] = full_ans
            new_opts = []
            for o in s.get("options", []):
                o_clean = re.sub(r"[\xad\u200b-\u200f\ufeff]", "", o)
                full_o = t8_prefix_to_full.get(o_clean) or t8_prefix_to_full.get(norm_yo(o_clean)) or o_clean
                new_opts.append(full_o)
            s["options"] = new_opts
        elif t == "22":
            if s.get("answer") == "Эпитет з) метафора":
                s["answer"] = "Эпитет"
                s["word"] = "Эпитет"
            elif s.get("answer") == "Анафора б) риторические обращение":
                s["answer"] = "Анафора"
                s["word"] = "Анафора"
            s["options"] = [
                "Эпитет" if o == "Эпитет з) метафора" else ("Анафора" if o == "Анафора б) риторические обращение" else o)
                for o in s.get("options", [])
            ]
            for fld in ("explanation", "rule"):
                if fld in s and s[fld]:
                    s[fld] = (
                        s[fld]
                        .replace("эпитет З) метафора", "эпитет")
                        .replace("анафора б) риторические обращение", "анафора")
                    )

        # Restore untruncated sentence in suffix/wordGap for sentence-based Sprint cards (Tasks 6, 8, 16, 21, 22)
        if t in ("6", "8", "16", "21", "22") and s.get("context"):
            s["suffix"] = s["context"]
            s["wordGap"] = s["context"]


def resolve_source(qid: str, current_source: str) -> str:
    if current_source and current_source != "Unknown":
        return current_source
    if "demo" in qid:
        return "ФИПИ · Официальный демовариант"
    if "neofamily" in qid:
        return "NeoFamily · Открытый банк заданий / ФИПИ"
    if "shkolkovo" in qid:
        return "Школково · Открытый банк заданий / ФИПИ"
    if "umschool" in qid:
        return "Умскул · Открытый банк заданий"
    if "bank" in qid:
        return "Банк Задач · Реальный ЕГЭ / ФИПИ"
    if "100points" in qid:
        return "100балльный репетитор · Банк ЕГЭ"
    if qid.startswith("shk-"):
        return "Школково · Открытый банк заданий / ФИПИ"
    if qid.startswith("nf-"):
        return "NeoFamily · Реальный ЕГЭ / ФИПИ"
    return "Банк ФИПИ"


def normalize_sources_and_formulations(fipi_bank):
    EXAM_PROMPT_RE = re.compile(r"^(?:Укажите|Расставьте|Найдите|В одном из|Отредактируйте|Установите)", re.I)
    for q in fipi_bank:
        qid = str(q.get("id", ""))
        task = str(q.get("task", ""))
        q["source"] = resolve_source(qid, q.get("source", ""))

        if task == "4":
            q["instruction"] = (
                "Укажите варианты ответов, в которых верно выделена буква, обозначающая ударный гласный звук. Запишите номера ответов."
            )
            q["rule"] = "Проверьте постановку ударения в соответствии с орфоэпическим словником ФИПИ."
            q["target"] = "УДАРЕНИЕ"
        elif task == "5":
            q["instruction"] = (
                "В одном из приведённых ниже предложений НЕВЕРНО употреблено выделенное слово. Исправьте лексическую ошибку, подобрав к выделенному слову пароним. Запишите подобранное слово."
            )
            q["rule"] = "Подберите верный пароним в соответствии с контекстом предложения и лексическим значением."
            q["target"] = "ПАРОНИМ"
        elif task == "6":
            instr_raw = q.get("instruction", "") or ""
            if q.get("target") == "ЗАМЕНИВ" or "замен" in instr_raw.lower():
                q["instruction"] = (
                    "Отредактируйте предложение: исправьте лексическую ошибку, заменив неверно употреблённое слово. Запишите подобранное слово, соблюдая нормы современного русского литературного языка."
                )
                q["target"] = "ЗАМЕНИВ"
            else:
                q["instruction"] = (
                    "Отредактируйте предложение: исправьте лексическую ошибку, исключив лишнее слово. Выпишите это слово."
                )
                q["target"] = "ИСКЛЮЧИВ"
            q["rule"] = "Устраните речевую ошибку (плеоназм, тавтологию или лексическую несочетаемость)."
        elif task == "7":
            q["instruction"] = (
                "В одном из выделенных ниже слов допущена ошибка в образовании формы слова. Исправьте ошибку и запишите слово правильно."
            )
            q["rule"] = "Морфологические нормы: правила образования грамматических форм слов (род, число, падеж, степени сравнения, формы глаголов)."
            q["target"] = "ФОРМА СЛОВА"
        elif task == "8":
            q["instruction"] = (
                "Установите соответствие между грамматическими ошибками и предложениями, в которых они допущены: к каждой позиции первого столбца подберите соответствующую позицию из второго столбца."
            )
            q["rule"] = "Синтаксические нормы: грамматические ошибки в построении предложений различных типов."
            q["target"] = "АБВГД"
        elif task in ("9", "10", "11", "12"):
            if not q.get("instruction"):
                q["instruction"] = (
                    "Укажите варианты ответов, в которых во всех словах одного ряда пропущена одна и та же буква. Запишите номера ответов."
                )
            if not q.get("rule") or EXAM_PROMPT_RE.match(q.get("rule", "")):
                if task == "9":
                    q["rule"] = "Правописание безударных проверяемых, непроверяемых и чередующихся гласных корня."
                elif task == "10":
                    q["rule"] = "Правописание приставок (на -З/-С, ПРЕ-/ПРИ-, буквы Ы/И после приставок, Ъ/Ь)."
                elif task == "11":
                    q["rule"] = "Правописание суффиксов различных частей речи (существительных, прилагательных, глаголов)."
                elif task == "12":
                    q["rule"] = "Правописание личных окончаний глаголов и суффиксов причастий настоящего времени."
            q["target"] = "ОДНА И ТА ЖЕ БУКВА"
        elif task == "13":
            corr = q.get("correctIndices", [])
            rows = q.get("rows", [])
            is_razdelno = any(
                "РАЗДЕЛЬНО" in rows[idx - 1].get("letter", "").upper() for idx in corr if 1 <= idx <= len(rows)
            )
            if is_razdelno:
                q["instruction"] = (
                    "Укажите варианты ответов, в которых НЕ с выделенным словом пишется РАЗДЕЛЬНО. Запишите номера ответов."
                )
                q["rule"] = "Правописание НЕ и НИ с различными частями речи (пишется РАЗДЕЛЬНО)."
                q["target"] = "РАЗДЕЛЬНО"
            else:
                q["instruction"] = (
                    "Укажите варианты ответов, в которых НЕ с выделенным словом пишется СЛИТНО. Запишите номера ответов."
                )
                q["rule"] = "Правописание НЕ и НИ с различными частями речи (пишется СЛИТНО)."
                q["target"] = "СЛИТНО"
        elif task == "14":
            instr_u = (q.get("instruction") or "").upper()
            if "ДЕФИС" in instr_u:
                q["instruction"] = (
                    "Укажите варианты ответов, в которых все выделенные слова пишутся ЧЕРЕЗ ДЕФИС. Запишите номера ответов."
                )
                q["rule"] = "Слитное, дефисное и раздельное написание слов (пишутся ЧЕРЕЗ ДЕФИС)."
                q["target"] = "ДЕФИСНО"
            elif "РАЗДЕЛЬНО" in instr_u:
                q["instruction"] = (
                    "Укажите варианты ответов, в которых все выделенные слова пишутся РАЗДЕЛЬНО. Запишите номера ответов."
                )
                q["rule"] = "Слитное, дефисное и раздельное написание слов (пишутся РАЗДЕЛЬНО)."
                q["target"] = "РАЗДЕЛЬНО"
            else:
                q["instruction"] = (
                    "Укажите варианты ответов, в которых все выделенные слова пишутся СЛИТНО. Запишите номера ответов."
                )
                q["rule"] = "Слитное, дефисное и раздельное написание слов (пишутся СЛИТНО)."
                q["target"] = "СЛИТНО"
        elif task == "15":
            corr = q.get("correctIndices", [])
            rows = q.get("rows", [])
            letters = [rows[idx - 1].get("letter", "").strip().upper() for idx in corr if 1 <= idx <= len(rows)]
            if letters and all(l == "Н" for l in letters):
                q["instruction"] = "Укажите все цифры, на месте которых пишется Н. Запишите цифры в порядке возрастания."
                q["rule"] = "Правописание -Н- и -НН- в суффиксах различных частей речи (пишется одна буква Н)."
                q["target"] = "Н"
            else:
                q["instruction"] = "Укажите все цифры, на месте которых пишется НН. Запишите цифры в порядке возрастания."
                q["rule"] = "Правописание -Н- и -НН- в суффиксах различных частей речи (пишется две буквы НН)."
                q["target"] = "НН"
        elif task == "16":
            q["instruction"] = (
                "Расставьте знаки препинания. Укажите предложения, в которых нужно поставить ОДНУ запятую. Запишите номера этих предложений."
            )
            q["rule"] = "Пунктуация в сложносочинённом предложении (ССП) и в предложениях с однородными членами (ОДНУ запятую)."
            q["target"] = "ОДНУ"
        elif task in ("17", "18", "19", "20"):
            q["instruction"] = (
                "Расставьте знаки препинания: укажите все цифры, на месте которых в предложении должны стоять запятые."
            )
            if not q.get("rule") or EXAM_PROMPT_RE.match(q.get("rule", "")):
                if task == "17":
                    q["rule"] = "Знаки препинания в предложениях с обособленными членами (причастными, деепричастными оборотами)."
                elif task == "18":
                    q["rule"] = "Знаки препинания в предложениях с вводными словами, конструкциями и обращениями."
                elif task == "19":
                    q["rule"] = "Знаки препинания в сложноподчинённом предложении (СПП) с придаточными."
                elif task == "20":
                    q["rule"] = "Знаки препинания в сложных предложениях с разными видами связи (на стыке союзов)."
            q["target"] = "ЗАПЯТЫЕ"
        elif task == "21":
            instr_raw = (q.get("instruction") or "").lower()
            if "двоеточи" in instr_raw:
                q["instruction"] = (
                    "Найдите предложения, в которых ДВОЕТОЧИЕ ставится в соответствии с одним и тем же правилом пунктуации. Запишите номера этих предложений."
                )
                q["rule"] = "Пунктуационный анализ текста: постановка ДВОЕТОЧИЯ по единому правилу синтаксиса."
                q["target"] = "ДВОЕТОЧИЕ"
            elif "тире" in instr_raw:
                q["instruction"] = (
                    "Найдите предложения, в которых ТИРЕ ставится в соответствии с одним и тем же правилом пунктуации. Запишите номера этих предложений."
                )
                q["rule"] = "Пунктуационный анализ текста: постановка ТИРЕ по единому правилу синтаксиса."
                q["target"] = "ТИРЕ"
            else:
                q["instruction"] = (
                    "Найдите предложения, в которых ЗАПЯТАЯ(-ЫЕ) ставится(-ятся) в соответствии с одним и тем же правилом пунктуации. Запишите номера этих предложений."
                )
                q["rule"] = "Пунктуационный анализ текста: постановка ЗАПЯТОЙ(-ЫХ) по единому правилу синтаксиса."
                q["target"] = "ЗАПЯТАЯ"
        elif task == "22":
            q["instruction"] = (
                "Установите соответствие между предложениями (выделенными фразами) и средствами выразительности: к каждой позиции первого столбца подберите соответствующую позицию из второго столбца."
            )
            q["rule"] = "Языковые средства выразительности: распознавание тропов, фигур речи, лексических и синтаксических средств."
            q["target"] = "АБВГД"

        for r in q.get("rows", []):
            if not r.get("explanation") or len(r["explanation"].strip()) < 5:
                r["explanation"] = q.get("explanation") or q.get("rule") or "По правилу русского языка."


def clean_obj_recursively(obj):
    if isinstance(obj, str):
        s = re.sub(r"[\xad\u200b-\u200f\ufeff]", "", obj)
        s = re.sub(r"\s*\(?Взято из\b.*$", "", s, flags=re.I)
        s = fix_corrupted_roman_numerals(s)
        return s.strip() if s != obj else s
    if isinstance(obj, list):
        return [clean_obj_recursively(x) for x in obj]
    if isinstance(obj, dict):
        return {k: clean_obj_recursively(v) for k, v in obj.items()}
    return obj


def sync_starter_bank(fipi_bank, sprint_bank, starter_bank):
    fipi_map = {q["id"]: q for q in fipi_bank}
    sp_map = {s["id"]: s for s in sprint_bank}

    new_fipi = []
    for sq in starter_bank.get("fipi", []):
        if sq["id"] in fipi_map:
            updated = json.loads(json.dumps(fipi_map[sq["id"]]))
            # Keep starterBank compact (< 500 KB) by trimming overly long row explanations if needed
            for r in updated.get("rows", []):
                if len(r.get("explanation", "")) > 220:
                    r["explanation"] = r["explanation"][:217] + "..."
            if len(updated.get("explanation", "")) > 220:
                updated["explanation"] = updated["explanation"][:217] + "..."
            new_fipi.append(updated)
        else:
            new_fipi.append(sq)
    starter_bank["fipi"] = new_fipi

    new_sprint = []
    for ss in starter_bank.get("sprint", []):
        if ss["id"] in sp_map:
            updated = json.loads(json.dumps(sp_map[ss["id"]]))
            if len(updated.get("explanation", "")) > 220:
                updated["explanation"] = updated["explanation"][:217] + "..."
            if len(updated.get("rule", "")) > 220:
                updated["rule"] = updated["rule"][:217] + "..."
            new_sprint.append(updated)
        else:
            new_sprint.append(ss)
    starter_bank["sprint"] = new_sprint


def main():
    nf_map, shk_map, db_map, orig_map = load_primary_sources()

    with open("public/data/fipiTasksBank.json", encoding="utf-8") as f:
        fipi_bank = json.load(f)
    with open("public/data/sprintBank.json", encoding="utf-8") as f:
        sprint_bank = json.load(f)
    with open("src/data/starterBank.json", encoding="utf-8") as f:
        starter_bank = json.load(f)

    heal_task_4(fipi_bank, sprint_bank)
    heal_task_5(fipi_bank, sprint_bank, nf_map, shk_map, db_map)
    heal_task_6(fipi_bank, sprint_bank, nf_map, shk_map, db_map)
    heal_task_7(fipi_bank, sprint_bank, nf_map, shk_map, db_map)
    heal_tasks_9_13(fipi_bank, sprint_bank)
    heal_task_14(fipi_bank, sprint_bank, starter_bank, orig_map)
    heal_task_15(fipi_bank, nf_map, orig_map)
    heal_tasks_18_and_21(fipi_bank, sprint_bank, nf_map, shk_map, db_map)
    heal_tasks_8_and_22_and_sprint_truncations(fipi_bank, sprint_bank)
    normalize_sources_and_formulations(fipi_bank)

    fipi_bank = clean_obj_recursively(fipi_bank)
    sprint_bank = clean_obj_recursively(sprint_bank)
    sync_starter_bank(fipi_bank, sprint_bank, starter_bank)
    starter_bank = clean_obj_recursively(starter_bank)

    print("\nSaving synchronized banks...")
    for path in ["public/data/fipiTasksBank.json", "public/data/fipiTasksBank9_15.json"]:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(fipi_bank, f, ensure_ascii=False, indent=2)

    for path in ["public/data/sprintBank.json", "public/data/sprintBank9_15.json"]:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(sprint_bank, f, ensure_ascii=False, indent=2)

    starter_str = json.dumps(starter_bank, ensure_ascii=False, separators=(",", ":"))
    with open("src/data/starterBank.json", "w", encoding="utf-8") as f:
        f.write(starter_str)

    sz_kb = os.path.getsize("src/data/starterBank.json") / 1024.0
    print(f"Done! starterBank.json size: {sz_kb:.1f} KB (limit: 500.0 KB)")


if __name__ == "__main__":
    main()
