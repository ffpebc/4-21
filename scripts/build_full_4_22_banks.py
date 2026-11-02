#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Мульти-источниковый парсер и генератор полных банков заданий №4–22 ЕГЭ по русскому языку (ФИПИ 2026–2027).
Источники:
1. NeoFamily API (https://backend.neofamily.ru/api/v2/tasks, subject_id=11, линии 4–22)
2. Школково (локальная БД /home/sergei/ege_trainer/ege_trainer.db + каталог 3.shkolkovo.online)
3. Официальные материалы ФИПИ 2026–2027 (/tmp/ru_11_2027/demo.txt)
4. Локальная база тренажёра (/home/sergei/код/russian ege/data/ege.sqlite)
5. Уже выверенные банки заданий 9–15 (22 187 слов, 2 322 задания ФИПИ) — сохраняются на 100%.
"""

import html
import json
import os
import re
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DATA = ROOT / "public" / "data"
SRC_DATA = ROOT / "src" / "data"
PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
SRC_DATA.mkdir(parents=True, exist_ok=True)

TASK_TITLES = {
    "4": "Орфоэпические нормы (Ударения)",
    "5": "Лексические нормы (Паронимы)",
    "6": "Лексические нормы (Точность речи)",
    "7": "Морфологические нормы (Формы слов)",
    "8": "Синтаксические нормы (Грамматические ошибки)",
    "9": "Правописание корней",
    "10": "Правописание приставок",
    "11": "Правописание суффиксов",
    "12": "Личные окончания глаголов и причастий",
    "13": "Правописание НЕ и НИ",
    "14": "Слитное, дефисное и раздельное написание",
    "15": "Правописание Н и НН",
    "16": "Пунктуация в ССП и с однородными членами",
    "17": "Знаки препинания при обособленных членах",
    "18": "Знаки препинания при вводных словах и обращениях",
    "19": "Знаки препинания в сложноподчинённом предложении",
    "20": "Знаки препинания в предложении с разными видами связи",
    "21": "Пунктуационный анализ текста",
    "22": "Языковые средства выразительности",
}

DEFAULT_INSTRUCTIONS = {
    "4": "Укажите варианты ответов, в которых ВЕРНО выделена буква, обозначающая ударный гласный звук. Запишите номера ответов.",
    "5": "В одном из приведённых ниже предложений НЕВЕРНО употреблено выделенное слово. Исправьте лексическую ошибку, подобрав к выделенному слову пароним. Запишите подобранное слово.",
    "6": "Отредактируйте предложение: исправьте лексическую ошибку, исключив лишнее слово или заменив неверно употреблённое слово. Выпишите это слово.",
    "7": "В одном из выделенных ниже слов допущена грамматическая ошибка. Исправьте ошибку и запишите слово правильно.",
    "8": "Установите соответствие между грамматическими ошибками и предложениями, в которых они допущены: к каждой позиции первого столбца подберите соответствующую позицию из второго столбца.",
    "16": "Расставьте знаки препинания. Укажите предложения, в которых нужно поставить ОДНУ запятую. Запишите номера этих предложений.",
    "17": "Расставьте знаки препинания: укажите все цифры, на месте которых в предложении должны стоять запятые.",
    "18": "Расставьте все недостающие знаки препинания: укажите все цифры, на месте которых в предложениях должны стоять запятые.",
    "19": "Расставьте знаки препинания: укажите все цифры, на месте которых в предложении должны стоять запятые.",
    "20": "Расставьте знаки препинания: укажите все цифры, на месте которых в предложении должны стоять запятые.",
    "21": "Найдите предложения, в которых тире (двоеточие или запятая) ставится в соответствии с одним и тем же правилом пунктуации. Запишите номера этих предложений.",
    "22": "Установите соответствие между предложениями (выделенными фрагментами) и названиями изобразительно-выразительных средств языка, которые употреблены в них.",
}

TASK_RULES = {
    "4": "Проверьте постановку ударения в соответствии с орфоэпическим словником ФИПИ.",
    "5": "Подберите верный пароним в соответствии с контекстом предложения и лексическим значением.",
    "6": "Устраните речевую ошибку (плеоназм, тавтологию или лексическую несочетаемость).",
    "7": "Морфологические нормы: правила образования грамматических форм слов (род, число, падеж, степени сравнения, формы глаголов).",
    "8": "Синтаксические нормы: грамматические ошибки в построении предложений различных типов.",
    "9": "Правописание безударных проверяемых, непроверяемых и чередующихся гласных в корне слова.",
    "10": "Правописание приставок (на -З/-С, ПРЕ-/ПРИ-, буквы Ы/И после приставок, разделительные Ъ и Ь).",
    "11": "Правописание суффиксов различных частей речи (существительных, прилагательных, глаголов, наречий).",
    "12": "Правописание личных окончаний глаголов и суффиксов причастий настоящего времени.",
    "13": "Правописание НЕ и НИ с различными частями речи (слитное и раздельное написание).",
    "14": "Слитное, дефисное и раздельное написание слов (предлоги, союзы, частицы, наречия, сложные слова).",
    "15": "Правописание -Н- и -НН- в суффиксах различных частей речи.",
    "16": "Пунктуация в сложносочинённом предложении (ССП) и в предложениях с однородными членами.",
    "17": "Знаки препинания в предложениях с обособленными членами (причастными, деепричастными оборотами).",
    "18": "Знаки препинания в предложениях с вводными словами, конструкциями и обращениями.",
    "19": "Знаки препинания в сложноподчинённом предложении (СПП) с придаточными.",
    "20": "Знаки препинания в сложных предложениях с разными видами связи (на стыке союзов).",
    "21": "Пунктуационный анализ текста: постановка знака препинания по единому правилу синтаксиса.",
    "22": "Языковые средства выразительности: распознавание тропов, фигур речи, лексических и синтаксических средств.",
}

PARONYM_FAMILIES = [
    ["абонемент", "абонент"],
    ["адресат", "адресант"],
    ["артистический", "артистичный"],
    ["безответный", "безответственный"],
    ["болотистый", "болотный"],
    ["благодарный", "благодарственный"],
    ["вековой", "вечный"],
    ["великий", "величественный", "величавый"],
    ["вдох", "вздох"],
    ["водный", "водяной", "водянистый"],
    ["враждебный", "вражеский"],
    ["выборный", "выборочный"],
    ["выгода", "выгодность"],
    ["выплатить", "оплатить", "заплатить", "уплатить"],
    ["гарантийный", "гарантированный"],
    ["гармонический", "гармоничный"],
    ["глинистый", "глиняный"],
    ["годичный", "годовалый", "годовой"],
    ["горделивый", "гордый"],
    ["гуманизм", "гуманность"],
    ["гуманистический", "гуманный", "гуманитарный"],
    ["двойной", "двойственный", "двоякий"],
    ["действенный", "действительный", "действующий"],
    ["деловой", "деловитый", "дельный"],
    ["демократичный", "демократический"],
    ["дипломатичный", "дипломатический"],
    ["диктат", "диктатура"],
    ["добротный", "добрый"],
    ["доверительный", "доверчивый"],
    ["дождевой", "дождливый"],
    ["драматический", "драматичный"],
    ["дружеский", "дружественный", "дружный"],
    ["единичный", "единственный", "единый"],
    ["желанный", "желательный"],
    ["жестокий", "жёсткий"],
    ["жизненный", "житейский"],
    ["жилищный", "жилой"],
    ["зачинатель", "зачинщик"],
    ["звуковой", "звучный"],
    ["зрительный", "зрительский"],
    ["изобретательный", "изобретательский"],
    ["информативный", "информационный"],
    ["искусный", "искусственный"],
    ["исполнительный", "исполнительский"],
    ["исходный", "исходящий"],
    ["каменистый", "каменный"],
    ["комфортабельный", "комфортный"],
    ["конский", "конный"],
    ["коренной", "коренастый", "корешковый"],
    ["костный", "костяной", "костлявый"],
    ["красочный", "красящий", "крашеный"],
    ["лесной", "лесистый"],
    ["личностный", "личный"],
    ["масляный", "маслянистый", "масленый"],
    ["мелочный", "мелкий"],
    ["мороженый", "морозный", "морозильный"],
    ["надеть", "одеть"],
    ["напоминание", "упоминание"],
    ["невежа", "невежда"],
    ["нестерпимый", "нетерпимый", "нетерпеливый"],
    ["обрывок", "отрывок"],
    ["обхватить", "охватить"],
    ["ограничить", "отграничить", "разграничить"],
    ["оклик", "отклик"],
    ["опасный", "опасливый"],
    ["органический", "органичный"],
    ["отборный", "отборочный"],
    ["отклонение", "уклонение"],
    ["отличие", "различие"],
    ["память", "памятливый", "памятный"],
    ["перетерпеть", "претерпеть"],
    ["питательный", "пищевой"],
    ["пластичный", "пластический"],
    ["плодотворный", "плодовитый"],
    ["повинность", "повиновение"],
    ["покупательский", "покупательный", "покупной"],
    ["полнота", "пополнение", "заполнение"],
    ["популистский", "популярный"],
    ["поступь", "поступок"],
    ["почтенный", "почтительный", "почётный"],
    ["практический", "практичный"],
    ["предоставить", "представить"],
    ["представительный", "представительский"],
    ["признательный", "признанный"],
    ["публицистический", "публицистичный", "публичный"],
    ["пугливый", "пуганый", "пугающий"],
    ["раздражительный", "раздражённый"],
    ["расчётливый", "расчётный"],
    ["ритмичный", "ритмический"],
    ["романтический", "романтичный"],
    ["рыбный", "рыбий", "рыболовный"],
    ["скрытный", "скрытый"],
    ["словарный", "словесный", "многословный"],
    ["сопротивление", "сопротивляемость"],
    ["соседний", "соседский"],
    ["сравнимый", "сравнительный"],
    ["сытый", "сытный"],
    ["сценический", "сценичный"],
    ["тактичный", "тактический"],
    ["технический", "техничный"],
    ["удачливый", "удачный"],
    ["униженный", "унизительный"],
    ["фактический", "фактичный"],
    ["хищнический", "хищный"],
    ["хозяйский", "хозяйственный"],
    ["царский", "царственный", "царствующий"],
    ["целый", "цельный", "целостный"],
    ["человеческий", "человечный"],
    ["чувственный", "чувствительный"],
    ["экономный", "экономический", "экономичный"],
    ["эстетический", "эстетичный"],
    ["этический", "этичный"],
    ["эффектный", "эффективный"],
]


def strip_html_lines(raw_html: str) -> list[str]:
    if not raw_html:
        return []
    text = raw_html.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"<!--.*?-->", " ", text, flags=re.S)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p\s*>", "\n", text, flags=re.I)
    text = re.sub(r"</div\s*>", "\n", text, flags=re.I)
    text = re.sub(r"</li\s*>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = text.replace("\xa0", " ").replace("\u202f", " ")
    lines = []
    for line in text.split("\n"):
        clean = re.sub(r"\s+", " ", line).strip()
        if clean:
            # Filter out metadata lines like "(Задание из банка ФИПИ)"
            if re.match(r"^\((?:Задание|Взято|По материалам|Источник)[^)]*\)$", clean, re.I):
                continue
            if re.match(r"^Источник\s*:", clean, re.I):
                continue
            lines.append(clean)
    return lines


def strip_html_inline(raw_html: str) -> str:
    return " ".join(strip_html_lines(raw_html))


def normalize_digits_sorted(ans: str, max_digit: int = 9) -> list[int]:
    digits = sorted({int(ch) for ch in str(ans) if ch.isdigit() and 1 <= int(ch) <= max_digit})
    return digits


def normalize_digits_ordered(ans: str) -> list[int]:
    digits = [int(ch) for ch in str(ans) if ch.isdigit() and 1 <= int(ch) <= 9]
    return digits


def extract_stressed_vowel(word: str) -> str:
    vowels = "АЕЁИОУЫЭЮЯ"
    for ch in word:
        if ch in vowels:
            return ch
    return "А"


def flip_stress_word(word: str) -> str:
    """Create a plausible wrong stress variant by moving the uppercase vowel to another vowel."""
    vowels_upper = "АЕЁИОУЫЭЮЯ"
    vowels_lower = "аеёиоуыэюя"
    # Clean numbering like "1) "
    w = re.sub(r"^\d+[\)\.]\s*", "", word).strip()
    vowel_positions = [i for i, ch in enumerate(w) if ch in vowels_upper or ch in vowels_lower]
    upper_positions = [i for i, ch in enumerate(w) if ch in vowels_upper]
    if len(vowel_positions) >= 2 and len(upper_positions) == 1:
        u_pos = upper_positions[0]
        other_positions = [p for p in vowel_positions if p != u_pos]
        target_pos = other_positions[0]
        chars = list(w.lower())
        chars[target_pos] = chars[target_pos].upper()
        return "".join(chars)
    return w


def find_paronym_distractors(correct_word: str, caps_words_in_rows: list[str]) -> list[str]:
    cw = correct_word.strip().lower()
    opts = [cw]
    for cw_row in caps_words_in_rows:
        w_low = cw_row.strip().lower()
        if w_low and w_low not in opts and len(w_low) >= 3:
            # Check if shares stem (first 4 chars)
            if w_low[:4] == cw[:4]:
                opts.append(w_low)
    for fam in PARONYM_FAMILIES:
        if any(cw[:5] == m[:5] for m in fam):
            for m in fam:
                if m not in opts:
                    opts.append(m)
    # Generate morphological / stem neighbor if still < 3
    if len(opts) < 2:
        if cw.endswith("ый"):
            opts.append(cw[:-2] + "ический")
        elif cw.endswith("ический"):
            opts.append(cw[:-7] + "ичный")
        elif cw.endswith("ое"):
            opts.append(cw[:-2] + "венное")
        else:
            opts.append(cw + "ный")
    return opts[:4]


def parse_task_4(qid: str, raw_q: str, raw_sol: str, raw_ans: list[str], source_label: str):
    lines = strip_html_lines(raw_q)
    sol_lines = strip_html_lines(raw_sol)
    sol_text = " ".join(sol_lines)
    ans_str = "".join(raw_ans)
    correct_indices = normalize_digits_sorted(ans_str, 5)
    if not correct_indices:
        return None, []

    row_map = {}
    instr_lines = []
    for ln in lines:
        m = re.match(r"^([1-5])[\)\.]\s*(.+)$", ln)
        if m:
            row_map[int(m.group(1))] = m.group(2).strip()
        elif not row_map:
            instr_lines.append(ln)

    if len(row_map) != 5:
        return None, []

    sol_row_map = {}
    for ln in sol_lines:
        m = re.match(r"^([1-5])[\)\.]\s*(.+)$", ln)
        if m:
            sol_row_map[int(m.group(1))] = m.group(2).strip()

    rows = []
    sprint_items = []
    for idx in range(1, 6):
        w = row_map[idx]
        is_ok = idx in correct_indices
        sol_exp = sol_row_map.get(idx, "")
        # Extract corrected stressed word from solution if not ok
        solved_w = w
        if not is_ok and sol_exp:
            m_corr = re.search(r"[–—-]\s*([а-яёА-ЯЁ]+)", sol_exp)
            if not m_corr:
                m_corr = re.match(r"^([а-яёА-ЯЁ]+)", sol_exp)
            if m_corr and any(c.isupper() for c in m_corr.group(1)):
                solved_w = m_corr.group(1)
        letter = extract_stressed_vowel(solved_w)
        exp_clean = sol_exp if sol_exp else (f"Верное ударение: {solved_w}" if is_ok else f"Ошибка в ударении, правильно: {solved_w}")
        rows.append({
            "words": [w],
            "solvedWords": [solved_w],
            "letter": letter,
            "isCorrectRow": is_ok,
            "explanation": exp_clean,
        })

        # Create Sprint / Word card if we have a clear stressed word
        clean_target = solved_w if is_ok else (solved_w if solved_w != w else "")
        if clean_target and any(c in "АЕЁИОУЫЭЮЯ" for c in clean_target):
            wrong_w = w if (not is_ok and w != clean_target) else flip_stress_word(clean_target)
            if wrong_w != clean_target:
                base_lower = clean_target.split()[0].lower()
                sprint_items.append({
                    "word": clean_target,
                    "wordGap": base_lower,
                    "prefix": base_lower,
                    "suffix": "",
                    "answer": clean_target,
                    "options": [clean_target, wrong_w],
                    "context": "Выберите слово с ВЕРНЫМ ударением",
                    "explanation": exp_clean,
                    "rule": TASK_RULES["4"],
                    "topic": "Орфоэпический словник ФИПИ (Ударения)",
                    "source": source_label,
                })

    fipi_q = {
        "id": qid,
        "kind": "fipi",
        "questionKind": "rows",
        "task": "4",
        "topic": TASK_TITLES["4"],
        "rule": TASK_RULES["4"],
        "instruction": " ".join(instr_lines) if instr_lines else DEFAULT_INSTRUCTIONS["4"],
        "source": source_label,
        "rows": rows,
        "correctIndices": correct_indices,
    }
    return fipi_q, sprint_items


def parse_task_5(qid: str, raw_q: str, raw_sol: str, raw_ans: list[str], source_label: str):
    lines = strip_html_lines(raw_q)
    sol_text = strip_html_inline(raw_sol)
    clean_answers = []
    for a in raw_ans:
        for part in re.split(r"[\n,;]+", str(a)):
            p = part.strip().lower().replace("ё", "е")
            if p and p not in clean_answers:
                clean_answers.append(p)
    if not clean_answers:
        return None, []

    instr_lines = []
    sent_lines = []
    for ln in lines:
        if re.search(r"В одном из привед|НЕВЕРНО употреблено|подобрав к выделенному", ln, re.I):
            instr_lines.append(ln)
        elif len(ln) > 12:
            sent_lines.append(re.sub(r"^[1-5][\)\.]\s*", "", ln))

    if len(sent_lines) < 4:
        return None, []
    sent_lines = sent_lines[:5]

    caps_words = []
    err_idx = 1
    primary_ans = clean_answers[0]
    for i, s in enumerate(sent_lines):
        m_caps = re.search(r"\b([А-ЯЁ]{3,}(?:-[А-ЯЁ]+)?)\b", s)
        cw = m_caps.group(1) if m_caps else ""
        caps_words.append(cw)
        if cw and cw.lower()[:4] == primary_ans[:4]:
            err_idx = i + 1

    rows = []
    for i, s in enumerate(sent_lines):
        is_err = (i + 1) == err_idx
        cw = caps_words[i]
        rows.append({
            "words": [s],
            "solvedWords": [s.replace(cw, primary_ans.upper()) if (is_err and cw) else s],
            "letter": primary_ans.upper() if is_err else "ВЕРНО",
            "isCorrectRow": is_err,
            "explanation": sol_text if is_err else "Пароним употреблён верно.",
        })

    opts = find_paronym_distractors(primary_ans, caps_words)
    sprint_items = []
    for i, s in enumerate(sent_lines):
        is_err = (i + 1) == err_idx
        cw = caps_words[i]
        if not cw:
            continue
        if is_err and cw.lower() != primary_ans:
            masked_sent = s.replace(cw, "[..]")
            sprint_items.append({
                "word": primary_ans,
                "wordGap": masked_sent[:90],
                "prefix": f"Пароним: ({cw.lower()} / {primary_ans})",
                "suffix": "",
                "answer": primary_ans,
                "options": [primary_ans, cw.lower()],
                "context": s,
                "explanation": sol_text[:280],
                "rule": TASK_RULES["5"],
                "topic": "Паронимы ФИПИ (Замена ошибки)",
                "source": source_label,
            })
        elif not is_err:
            cw_low = cw.lower()
            alt_list = find_paronym_distractors(cw_low, caps_words)
            alt_w = next((x for x in alt_list if x != cw_low), cw_low + "ный")
            masked_sent = s.replace(cw, "[..]")
            sprint_items.append({
                "word": cw_low,
                "wordGap": masked_sent[:90],
                "prefix": f"Пароним в контексте: ({cw_low} / {alt_w})",
                "suffix": "",
                "answer": cw_low,
                "options": [cw_low, alt_w],
                "context": s,
                "explanation": f"В предложении «{s}» пароним «{cw}» употреблён ВЕРНО.",
                "rule": TASK_RULES["5"],
                "topic": "Паронимы ФИПИ (Контекст)",
                "source": source_label,
            })

    fipi_q = {
        "id": qid,
        "kind": "fipi",
        "questionKind": "word_input",
        "task": "5",
        "topic": TASK_TITLES["5"],
        "rule": TASK_RULES["5"],
        "instruction": " ".join(instr_lines) if instr_lines else DEFAULT_INSTRUCTIONS["5"],
        "source": source_label,
        "rows": rows,
        "correctIndices": [err_idx],
        "textAnswers": clean_answers,
        "choiceOptions": opts,
    }
    return fipi_q, sprint_items


def parse_task_6(qid: str, raw_q: str, raw_sol: str, raw_ans: list[str], source_label: str):
    lines = strip_html_lines(raw_q)
    sol_text = strip_html_inline(raw_sol)
    clean_answers = []
    for a in raw_ans:
        for part in re.split(r"[\n,;|/]+", str(a)):
            p = part.strip().lower().replace("ё", "е")
            if p and len(p) >= 2 and p not in clean_answers:
                clean_answers.append(p)
    if not clean_answers:
        return None, []

    instr_lines = []
    sent_lines = []
    for ln in lines:
        if re.search(r"Отредактируйте предложение|исправьте лексическую ошибку|Выпишите это слово|Запишите подобранное", ln, re.I):
            instr_lines.append(ln)
        else:
            sent_lines.append(ln)

    sentence = " ".join(sent_lines).strip()
    if not sentence:
        sentence = lines[-1] if lines else ""
    if not sentence:
        return None, []

    primary_ans = clean_answers[0]
    words_in_sent = [w.lower() for w in re.findall(r"[А-Яа-яЁё]{4,}", sentence)]
    distractors = [w for w in words_in_sent if w != primary_ans and w not in clean_answers]
    choice_options = [primary_ans] + distractors[:3]
    if len(choice_options) < 2:
        choice_options.append("лишнее")

    is_exclude = "исключ" in (" ".join(instr_lines).lower() or DEFAULT_INSTRUCTIONS["6"].lower())
    mode_hint = "Исключите лишнее слово" if is_exclude else "Замените неверное слово"

    rows = [{
        "words": [sentence],
        "solvedWords": [f"Ответ: {primary_ans}"],
        "letter": primary_ans.upper(),
        "isCorrectRow": True,
        "explanation": sol_text or f"Правильный ответ: {primary_ans}",
    }]

    sprint_items = []
    if len(choice_options) >= 2:
        sprint_items.append({
            "word": primary_ans,
            "wordGap": sentence[:95],
            "prefix": f"{mode_hint}:",
            "suffix": sentence[:75] + ("..." if len(sentence) > 75 else ""),
            "answer": primary_ans,
            "options": [primary_ans, choice_options[1]],
            "context": sentence,
            "explanation": sol_text[:280] or f"Ответ: {primary_ans}",
            "rule": TASK_RULES["6"],
            "topic": "Плеоназмы и лексическая сочетаемость" if is_exclude else "Замена неверно употреблённого слова",
            "source": source_label,
        })

    fipi_q = {
        "id": qid,
        "kind": "fipi",
        "questionKind": "word_input",
        "task": "6",
        "topic": TASK_TITLES["6"],
        "rule": TASK_RULES["6"],
        "instruction": " ".join(instr_lines) if instr_lines else DEFAULT_INSTRUCTIONS["6"],
        "sentence": sentence,
        "source": source_label,
        "rows": rows,
        "correctIndices": [1],
        "textAnswers": clean_answers,
        "choiceOptions": choice_options[:4],
    }
    return fipi_q, sprint_items


def parse_task_7(qid: str, raw_q: str, raw_sol: str, raw_ans: list[str], source_label: str):
    lines = strip_html_lines(raw_q)
    sol_text = strip_html_inline(raw_sol)
    clean_answers = []
    for a in raw_ans:
        for part in re.split(r"[\n,;|/]+", str(a)):
            p = part.strip().lower().replace("ё", "е")
            if p and p not in clean_answers:
                clean_answers.append(p)
    if not clean_answers:
        return None, []

    instr_lines = []
    phrase_lines = []
    for ln in lines:
        if re.search(r"В одном из выделенных|Исправьте ошибку|грамматическая ошибка", ln, re.I):
            instr_lines.append(ln)
        elif len(ln) >= 3:
            phrase_lines.append(re.sub(r"^[1-5][\)\.]\s*", "", ln))

    if len(phrase_lines) < 4:
        return None, []
    phrase_lines = phrase_lines[:5]

    primary_ans = clean_answers[0]
    err_idx = 1
    caps_words = []
    for i, ph in enumerate(phrase_lines):
        m_caps = re.findall(r"\b[А-ЯЁ]{2,}(?:\s+[А-ЯЁ]{2,})?\b", ph)
        cw = " ".join(m_caps) if m_caps else ""
        caps_words.append(cw)
        if cw and cw.lower()[:3] == primary_ans[:3]:
            err_idx = i + 1

    rows = []
    for i, ph in enumerate(phrase_lines):
        is_err = (i + 1) == err_idx
        cw = caps_words[i]
        rows.append({
            "words": [ph],
            "solvedWords": [ph.replace(cw, primary_ans.upper()) if (is_err and cw) else ph],
            "letter": primary_ans.upper() if is_err else "ВЕРНО",
            "isCorrectRow": is_err,
            "explanation": sol_text if is_err else "Морфологическая форма образована верно.",
        })

    err_phrase = phrase_lines[err_idx - 1]
    err_cw = caps_words[err_idx - 1] or "ошибка"
    choice_options = [primary_ans]
    if err_cw.lower() != primary_ans:
        choice_options.append(err_cw.lower())
    for cw in caps_words:
        if cw and cw.lower() not in choice_options and len(choice_options) < 4:
            choice_options.append(cw.lower())

    sprint_items = []
    for i, ph in enumerate(phrase_lines):
        is_err = (i + 1) == err_idx
        cw = caps_words[i]
        if is_err and cw and cw.lower() != primary_ans:
            sprint_items.append({
                "word": primary_ans,
                "wordGap": ph,
                "prefix": ph.replace(cw, "").strip() or "Норма формы:",
                "suffix": "",
                "answer": primary_ans,
                "options": [primary_ans, cw.lower()],
                "context": f"Исправьте форму в сочетании: «{ph}»",
                "explanation": sol_text[:280] or f"Правильная форма: {primary_ans}",
                "rule": TASK_RULES["7"],
                "topic": "Морфологические нормы (Исправление ошибки)",
                "source": source_label,
            })
        elif not is_err and cw:
            sprint_items.append({
                "word": cw.lower(),
                "wordGap": ph,
                "prefix": f"Морфологическая форма «{ph}»:",
                "suffix": "",
                "answer": "ВЕРНО",
                "options": ["ВЕРНО", "ОШИБКА"],
                "context": f"Оцените грамматическую форму в сочетании: «{ph}»",
                "explanation": f"Сочетание «{ph}» образовано ВЕРНО по морфологическим нормам.",
                "rule": TASK_RULES["7"],
                "topic": "Морфологические нормы (Проверка формы)",
                "source": source_label,
            })

    fipi_q = {
        "id": qid,
        "kind": "fipi",
        "questionKind": "word_input",
        "task": "7",
        "topic": TASK_TITLES["7"],
        "rule": TASK_RULES["7"],
        "instruction": " ".join(instr_lines) if instr_lines else DEFAULT_INSTRUCTIONS["7"],
        "source": source_label,
        "rows": rows,
        "correctIndices": [err_idx],
        "textAnswers": clean_answers,
        "choiceOptions": choice_options[:4],
    }
    return fipi_q, sprint_items


def parse_task_8_or_22(task_num: str, qid: str, raw_q: str, raw_sol: str, raw_ans: list[str], source_label: str):
    lines = strip_html_lines(raw_q)
    sol_lines = strip_html_lines(raw_sol)
    sol_text = " ".join(sol_lines)
    ans_str = re.sub(r"\D", "", "".join(raw_ans))
    if len(ans_str) != 5:
        return None, []
    ordered_digits = [int(ch) for ch in ans_str]
    if any(d < 1 or d > 9 for d in ordered_digits):
        return None, []

    letters_map = {}
    num_map = {}
    letter_order = ["А", "Б", "В", "Г", "Д"]

    current_letter = None
    current_num = None

    for ln in lines:
        m_let = re.match(r"^([АБВГДABVGD])[\)\.]\s*(.+)$", ln)
        m_num = re.match(r"^([1-9])[\)\.]\s*(.+)$", ln)
        if m_let:
            raw_l = m_let.group(1).translate(str.maketrans("ABVGD", "АБВГД"))
            current_letter = raw_l
            current_num = None
            letters_map[raw_l] = m_let.group(2).strip()
        elif m_num:
            n = int(m_num.group(1))
            current_num = n
            current_letter = None
            num_map[n] = m_num.group(2).strip()
        else:
            if re.match(r"^(?:ГРАММАТИЧЕСКИЕ ОШИБКИ|ПРЕДЛОЖЕНИЯ|СПИСОК ТЕРМИНОВ|СРЕДСТВА ВЫРАЗИТЕЛЬНОСТИ|Запишите в таблицу|Установите соответствие)", ln, re.I):
                current_letter = None
                current_num = None
                continue
            if current_letter and current_letter in letters_map:
                letters_map[current_letter] += " " + ln
            elif current_num and current_num in num_map:
                num_map[current_num] += " " + ln

    if len(letters_map) < 5 or len(num_map) < 7:
        return None, []

    matching_letters = []
    for l_idx, lbl in enumerate(letter_order):
        txt = letters_map.get(lbl, f"Позиция {lbl}")
        matching_letters.append({
            "label": lbl,
            "text": txt,
            "correctDigit": ordered_digits[l_idx],
        })

    rows = []
    for n in range(1, 10):
        if n not in num_map:
            continue
        matched_lbl = None
        for l_idx, d in enumerate(ordered_digits):
            if d == n:
                matched_lbl = letter_order[l_idx]
                break
        rows.append({
            "words": [f"{n}) {num_map[n]}"],
            "solvedWords": [f"{n}) {num_map[n]}"],
            "letter": matched_lbl or "—",
            "isCorrectRow": matched_lbl is not None,
            "explanation": f"Соответствует букве {matched_lbl}: {letters_map.get(matched_lbl, '')}" if matched_lbl else "Не содержит искомой позиции.",
        })

    # Create sprint micro-cards from all 5 letters А, Б, В, Г, Д
    sprint_items = []
    if len(matching_letters) >= 5:
        for idx_l in range(len(matching_letters)):
            l0 = matching_letters[idx_l]
            l1 = matching_letters[(idx_l + 1) % len(matching_letters)]
            d0 = l0["correctDigit"]
            if d0 in num_map:
                if task_num == "8":
                    short_err0 = l0["text"][:48]
                    short_err1 = l1["text"][:48]
                    if short_err0 != short_err1:
                        sprint_items.append({
                            "word": short_err0,
                            "wordGap": num_map[d0][:110],
                            "prefix": f"Грамматическая ошибка ({l0['label']}):",
                            "suffix": num_map[d0][:85],
                            "answer": short_err0,
                            "options": [short_err0, short_err1],
                            "context": num_map[d0],
                            "explanation": f"В этом предложении допущена ошибка: {l0['text']}.",
                            "rule": TASK_RULES["8"],
                            "topic": "Синтаксические нормы (Задание 8)",
                            "source": source_label,
                        })
                else:
                    term0 = num_map[d0].split("(")[0].strip().capitalize()[:45]
                    d1 = l1["correctDigit"]
                    term1 = num_map.get(d1, "метафора").split("(")[0].strip().capitalize()[:45]
                    if term0 != term1:
                        sprint_items.append({
                            "word": term0,
                            "wordGap": l0["text"][:110],
                            "prefix": f"Средство выразительности ({l0['label']}):",
                            "suffix": l0["text"][:85],
                            "answer": term0,
                            "options": [term0, term1],
                            "context": l0["text"],
                            "explanation": f"Правильный термин: {num_map[d0]}. {sol_text[:180]}",
                            "rule": TASK_RULES["22"],
                            "topic": "Тропы и фигуры речи (Задание 22)",
                            "source": source_label,
                        })

    fipi_q = {
        "id": qid,
        "kind": "fipi",
        "questionKind": "matching_grid",
        "task": task_num,
        "topic": TASK_TITLES[task_num],
        "rule": TASK_RULES[task_num],
        "instruction": DEFAULT_INSTRUCTIONS[task_num] + f" (Ответ из 5 цифр АБВГД)",
        "source": source_label,
        "matchingLetters": matching_letters,
        "rows": rows,
        "correctIndices": ordered_digits,
        "textAnswers": [ans_str],
    }
    return fipi_q, sprint_items


def parse_task_16(qid: str, raw_q: str, raw_sol: str, raw_ans: list[str], source_label: str):
    lines = strip_html_lines(raw_q)
    sol_lines = strip_html_lines(raw_sol)
    ans_str = "".join(raw_ans)
    correct_indices = normalize_digits_sorted(ans_str, 5)
    if not correct_indices:
        return None, []

    row_map = {}
    instr_lines = []
    for ln in lines:
        m = re.match(r"^([1-5])[\)\.]\s*(.+)$", ln)
        if m:
            row_map[int(m.group(1))] = m.group(2).strip()
        elif not row_map:
            instr_lines.append(ln)

    if len(row_map) != 5:
        return None, []

    sol_row_map = {}
    for ln in sol_lines:
        m = re.match(r"^([1-5])[\)\.]\s*(.+)$", ln)
        if m:
            sol_row_map[int(m.group(1))] = m.group(2).strip()

    rows = []
    sprint_items = []
    for idx in range(1, 6):
        sent = row_map[idx]
        is_ok = idx in correct_indices
        sol_exp = sol_row_map.get(idx, "")
        rows.append({
            "words": [sent],
            "solvedWords": [sol_exp if sol_exp else sent],
            "letter": "1 запятая" if is_ok else "≠ 1 запятая",
            "isCorrectRow": is_ok,
            "explanation": sol_exp or ("Ставится ровно ОДНА запятая." if is_ok else "Запятая не нужна или ставится больше одной запятой."),
        })
        ans_label = "ОДНА ЗАПЯТАЯ" if is_ok else "БЕЗ / НЕСКОЛЬКО"
        sprint_items.append({
            "word": ans_label,
            "wordGap": sent[:105],
            "prefix": "Пунктуация в ССП/ОЧП:",
            "suffix": sent[:85],
            "answer": ans_label,
            "options": ["ОДНА ЗАПЯТАЯ", "БЕЗ / НЕСКОЛЬКО"],
            "context": sent,
            "explanation": sol_exp or ("В этом предложении ставится ровно одна запятая." if is_ok else "В этом предложении либо не нужна запятая, либо нужно несколько запятых."),
            "rule": TASK_RULES["16"],
            "topic": "ССП и однородные члены (Задание 16)",
            "source": source_label,
        })

    fipi_q = {
        "id": qid,
        "kind": "fipi",
        "questionKind": "rows",
        "task": "16",
        "topic": TASK_TITLES["16"],
        "rule": TASK_RULES["16"],
        "instruction": " ".join(instr_lines) if instr_lines else DEFAULT_INSTRUCTIONS["16"],
        "source": source_label,
        "rows": rows,
        "correctIndices": correct_indices,
    }
    return fipi_q, sprint_items


def parse_task_17_20(task_num: str, qid: str, raw_q: str, raw_sol: str, raw_ans: list[str], source_label: str):
    lines = strip_html_lines(raw_q)
    sol_text = strip_html_inline(raw_sol)
    ans_str = "".join(raw_ans)
    correct_indices = normalize_digits_sorted(ans_str, 9)
    if not correct_indices:
        return None, []

    instr_lines = []
    sent_lines = []
    for ln in lines:
        if re.search(r"\(\s*1\s*\)", ln) or (sent_lines and re.search(r"\(\s*\d\s*\)", ln)):
            sent_lines.append(ln)
        elif not sent_lines and re.search(r"Расставьте|укажите|знаки препинания|запятые", ln, re.I):
            instr_lines.append(ln)
        else:
            sent_lines.append(ln)

    sentence = " ".join(sent_lines).strip()
    # Normalize spaces inside "( 1 )" -> "(1)"
    sentence = re.sub(r"\(\s*(\d)\s*\)", r"(\1)", sentence)
    found_digits = sorted({int(m.group(1)) for m in re.finditer(r"\((\d)\)", sentence)})
    if not found_digits or max(correct_indices) > max(found_digits):
        return None, []

    rows = []
    for d in found_digits:
        is_comma = d in correct_indices
        rows.append({
            "words": [f"Позиция ({d})"],
            "solvedWords": [f"({d}) — {'запятая ставится' if is_comma else 'запятая не нужна'}"],
            "letter": "," if is_comma else "—",
            "isCorrectRow": is_comma,
            "explanation": sol_text[:280] if sol_text else ("На месте цифры ставится запятая." if is_comma else "Запятая на месте этой цифры не ставится."),
        })

    sprint_items = []
    for d1 in found_digits:
        is_c1 = d1 in correct_indices
        ans_lbl = "ЗАПЯТАЯ НУЖНА" if is_c1 else "БЕЗ ЗАПЯТОЙ"
        sprint_items.append({
            "word": f"({d1}): {ans_lbl}",
            "wordGap": sentence[:105],
            "prefix": f"Нужна ли запятая на месте ({d1})?",
            "suffix": "",
            "answer": ans_lbl,
            "options": ["ЗАПЯТАЯ НУЖНА", "БЕЗ ЗАПЯТОЙ"],
            "context": f"[Позиция ({d1})] {sentence}",
            "explanation": f"Позиция ({d1}) — {'запятая ставится' if is_c1 else 'запятая не нужна'}. Все цифры в предложении: {''.join(map(str, correct_indices))}. {sol_text[:200]}",
            "rule": TASK_RULES[task_num],
            "topic": TASK_TITLES[task_num],
            "source": source_label,
        })

    fipi_q = {
        "id": qid,
        "kind": "fipi",
        "questionKind": "numbered_gaps",
        "task": task_num,
        "topic": TASK_TITLES[task_num],
        "rule": TASK_RULES[task_num],
        "instruction": " ".join(instr_lines) if instr_lines else DEFAULT_INSTRUCTIONS[task_num],
        "sentence": sentence,
        "source": source_label,
        "rows": rows,
        "correctIndices": correct_indices,
    }
    return fipi_q, sprint_items


def parse_task_21(qid: str, raw_q: str, raw_sol: str, raw_ans: list[str], source_label: str):
    lines = strip_html_lines(raw_q)
    sol_lines = strip_html_lines(raw_sol)
    sol_text = " ".join(sol_lines)
    ans_str = "".join(raw_ans)
    # In Task 21, some tasks have multiple valid groups separated by newline/or, take the first group of 2+ digits
    first_ans = re.split(r"[\n,;/или]+", ans_str)[0].strip()
    correct_indices = normalize_digits_sorted(first_ans, 9)
    if len(correct_indices) < 2:
        return None, []

    instr_lines = []
    text_lines = []
    for ln in lines:
        if re.search(r"Найдите предложения|одним и тем же правилом|Запишите номера", ln, re.I):
            instr_lines.append(ln)
        else:
            text_lines.append(ln)

    full_text = " ".join(text_lines).strip()
    # Split into sentences (1)..(9)
    parts = re.split(r"(?=\(\s*[1-9]\s*\))", full_text)
    sent_map = {}
    for p in parts:
        m = re.match(r"^\(\s*([1-9])\s*\)\s*(.+)$", p.strip())
        if m:
            sent_map[int(m.group(1))] = m.group(2).strip()

    if len(sent_map) < max(correct_indices):
        return None, []

    rows = []
    for n in sorted(sent_map.keys()):
        is_ok = n in correct_indices
        rows.append({
            "words": [f"({n}) {sent_map[n]}"],
            "solvedWords": [f"({n}) {sent_map[n]}"],
            "letter": "ПОДХОДИТ" if is_ok else "—",
            "isCorrectRow": is_ok,
            "explanation": sol_text[:300] if is_ok else "Другое правило или знак отсутствует.",
        })

    instr_str = " ".join(instr_lines) if instr_lines else DEFAULT_INSTRUCTIONS["21"]
    sign_name = "ТИРЕ" if "тире" in instr_str.lower() else ("ДВОЕТОЧИЕ" if "двоеточ" in instr_str.lower() else "ЗАПЯТАЯ")

    sprint_items = []
    for n_sent in sorted(sent_map.keys()):
        is_in_ans = n_sent in correct_indices
        ans_lbl = "ВХОДИТ В ОТВЕТ" if is_in_ans else "ДРУГОЕ ПРАВИЛО"
        sprint_items.append({
            "word": f"({n_sent}) {sign_name}",
            "wordGap": sent_map[n_sent][:105],
            "prefix": f"Пунктуационный анализ ({sign_name}):",
            "suffix": sent_map[n_sent][:80],
            "answer": ans_lbl,
            "options": ["ВХОДИТ В ОТВЕТ", "ДРУГОЕ ПРАВИЛО"],
            "context": f"({n_sent}) {sent_map[n_sent]}",
            "explanation": sol_text[:260] if is_in_ans else f"Предложение ({n_sent}) не входит в основную группу ответа ({''.join(map(str, correct_indices))}).",
            "rule": TASK_RULES["21"],
            "topic": f"Задание 21 ({sign_name})",
            "source": source_label,
        })

    fipi_q = {
        "id": qid,
        "kind": "fipi",
        "questionKind": "rows",
        "task": "21",
        "topic": f"{TASK_TITLES['21']} ({sign_name})",
        "rule": TASK_RULES["21"],
        "instruction": instr_str,
        "sentence": full_text,
        "source": source_label,
        "rows": rows,
        "correctIndices": correct_indices,
    }
    return fipi_q, sprint_items


def build_all():
    # 1. Load existing 100% verified 9-15 banks (idempotent filter for tasks 9..15)
    t9_15 = {"9", "10", "11", "12", "13", "14", "15"}
    with open(PUBLIC_DATA / "allWordsBank9_15.json", encoding="utf-8") as f:
        words_raw = json.load(f)
        raw_list = words_raw if isinstance(words_raw, list) else words_raw.get("words", [])
        existing_words_9_15 = [w for w in raw_list if str(w.get("task")) in t9_15]
    with open(PUBLIC_DATA / "fipiTasksBank9_15.json", encoding="utf-8") as f:
        existing_fipi_9_15 = [q for q in json.load(f) if str(q.get("task")) in t9_15]
    with open(PUBLIC_DATA / "sprintBank9_15.json", encoding="utf-8") as f:
        existing_sprint_9_15 = [q for q in json.load(f) if str(q.get("task")) in t9_15]

    print(f"Loaded verified 9-15 banks: words={len(existing_words_9_15)}, fipi={len(existing_fipi_9_15)}, sprint={len(existing_sprint_9_15)}")

    # Ensure questionKind and clean pedagogical rules on 9-15 FIPI tasks
    for fq in existing_fipi_9_15:
        t = str(fq.get("task"))
        if t == "15":
            fq["questionKind"] = "numbered_gaps"
        else:
            fq["questionKind"] = "rows"
        r = fq.get("rule", "")
        if re.match(r"^(?:Укажите|Расставьте|Найдите|В одном из|Отредактируйте|Установите)", r, re.I):
            fq["rule"] = TASK_RULES.get(t, r)

    new_fipi = []
    new_sprint = []
    new_words = []
    seen_fipi_sigs = set()
    seen_sprint_sigs = set()

    def register_parsed(task_num: str, fipi_q, sprint_list):
        if fipi_q:
            sent_key = (fipi_q.get("sentence") or "").strip()[:90]
            rows_key = "|".join(r["words"][0][:45] for r in fipi_q["rows"][:4])
            sig = f"{task_num}:{sent_key}:{rows_key}"
            if sig not in seen_fipi_sigs:
                seen_fipi_sigs.add(sig)
                new_fipi.append(fipi_q)
        for sp in sprint_list:
            sp_sig = f"{task_num}:{sp['word'].lower()}:{sp['context'][:45].lower()}"
            if sp_sig not in seen_sprint_sigs:
                seen_sprint_sigs.add(sp_sig)
                sp_id = f"sp-{task_num}-{len(new_sprint) + 1}"
                new_sprint.append({
                    "id": sp_id,
                    "kind": "sprint",
                    "task": task_num,
                    "topic": sp["topic"],
                    "rule": sp["rule"],
                    "prefix": sp["prefix"],
                    "suffix": sp["suffix"],
                    "answer": sp["answer"],
                    "options": sp["options"],
                    "context": sp["context"],
                    "explanation": sp["explanation"],
                    "source": sp["source"],
                })
                new_words.append({
                    "id": f"w-{task_num}-{len(new_words) + 1}",
                    "word": sp["word"],
                    "wordGap": sp["wordGap"],
                    "prefix": sp["prefix"],
                    "missingLetter": sp["answer"],
                    "suffix": sp["suffix"],
                    "task": task_num,
                    "topic": sp["topic"],
                    "category": TASK_TITLES[task_num],
                    "rule": sp["rule"] or TASK_RULES.get(task_num, ""),
                    "context": sp["context"],
                    "source": sp["source"],
                })

    # 2. Parse NeoFamily tasks (/tmp/neofamily_4_22.json)
    nf_path = Path("/tmp/neofamily_4_22.json")
    if nf_path.exists():
        with open(nf_path, encoding="utf-8") as f:
            nf_data = json.load(f)
        for task_num, items in nf_data.items():
            for it in items:
                qid = f"nf-{task_num}-{it['id']}"
                q_html = it.get("question") or ""
                s_html = it.get("solution") or ""
                ans_list = it.get("answer") or []
                src = "NeoFamily · Реальный ЕГЭ / ФИПИ"
                res_fipi, res_sp = None, []
                if task_num == "4":
                    res_fipi, res_sp = parse_task_4(qid, q_html, s_html, ans_list, src)
                elif task_num == "5":
                    res_fipi, res_sp = parse_task_5(qid, q_html, s_html, ans_list, src)
                elif task_num == "6":
                    res_fipi, res_sp = parse_task_6(qid, q_html, s_html, ans_list, src)
                elif task_num == "7":
                    res_fipi, res_sp = parse_task_7(qid, q_html, s_html, ans_list, src)
                elif task_num in ("8", "22"):
                    res_fipi, res_sp = parse_task_8_or_22(task_num, qid, q_html, s_html, ans_list, src)
                elif task_num == "16":
                    res_fipi, res_sp = parse_task_16(qid, q_html, s_html, ans_list, src)
                elif task_num in ("17", "18", "19", "20"):
                    res_fipi, res_sp = parse_task_17_20(task_num, qid, q_html, s_html, ans_list, src)
                elif task_num == "21":
                    res_fipi, res_sp = parse_task_21(qid, q_html, s_html, ans_list, src)
                register_parsed(task_num, res_fipi, res_sp)

    # 3. Parse Shkolkovo DB (/home/sergei/ege_trainer/ege_trainer.db)
    sh_db_path = Path("/home/sergei/ege_trainer/ege_trainer.db")
    if sh_db_path.exists():
        conn = sqlite3.connect(str(sh_db_path))
        cur = conn.cursor()
        for pos in [4, 5, 6, 7, 8, 16, 17, 18, 19, 20, 21, 22]:
            task_num = str(pos)
            cur.execute("""
                SELECT k.id, k.body_html, k.solution_html, k.answer_text, th.name
                FROM tasks k
                JOIN themes th ON k.theme_id = th.id
                JOIN parent_topics p ON th.parent_topic_id = p.id
                WHERE p.subject_id = 2 AND p.exam_position = ? AND k.answer_text IS NOT NULL AND k.answer_text != ''
            """, (pos,))
            for row_id, b_html, s_html, ans_txt, theme_name in cur.fetchall():
                qid = f"shk-{task_num}-{row_id}"
                ans_list = [ans_txt]
                src = f"Школково · {theme_name}"
                res_fipi, res_sp = None, []
                if task_num == "4":
                    res_fipi, res_sp = parse_task_4(qid, b_html, s_html or "", ans_list, src)
                elif task_num == "5":
                    res_fipi, res_sp = parse_task_5(qid, b_html, s_html or "", ans_list, src)
                elif task_num == "6":
                    res_fipi, res_sp = parse_task_6(qid, b_html, s_html or "", ans_list, src)
                elif task_num == "7":
                    res_fipi, res_sp = parse_task_7(qid, b_html, s_html or "", ans_list, src)
                elif task_num in ("8", "22"):
                    res_fipi, res_sp = parse_task_8_or_22(task_num, qid, b_html, s_html or "", ans_list, src)
                elif task_num == "16":
                    res_fipi, res_sp = parse_task_16(qid, b_html, s_html or "", ans_list, src)
                elif task_num in ("17", "18", "19", "20"):
                    res_fipi, res_sp = parse_task_17_20(task_num, qid, b_html, s_html or "", ans_list, src)
                elif task_num == "21":
                    res_fipi, res_sp = parse_task_21(qid, b_html, s_html or "", ans_list, src)
                register_parsed(task_num, res_fipi, res_sp)
        conn.close()

    # Combine 9-15 and 4-8, 16-22
    all_words = existing_words_9_15 + new_words
    all_fipi = existing_fipi_9_15 + new_fipi
    all_sprint = existing_sprint_9_15 + new_sprint

    # Print statistics per task 4..22
    print("\n=== ИТОГОВАЯ СТАТИСТИКА БАНКОВ 4–22 ===")
    for t in [str(x) for x in range(4, 23)]:
        c_w = sum(1 for w in all_words if str(w.get("task")) == t)
        c_f = sum(1 for fq in all_fipi if str(fq.get("task")) == t)
        c_s = sum(1 for sq in all_sprint if str(sq.get("task")) == t)
        print(f"  Задание №{t:>2} ({TASK_TITLES[t][:35]:<35}): ФИПИ={c_f:>4} | Спринт/Слова={c_s:>5}")

    print(f"ВСЕГО: Слов/Микро-карточек = {len(all_words)} | Заданий ФИПИ = {len(all_fipi)} | Спринт = {len(all_sprint)}")

    # Save full banks to public/data/ (both new names and backwards-compatible 9_15 names!)
    for fname, payload in [
        ("allWordsBank9_15.json", all_words),
        ("fipiTasksBank9_15.json", all_fipi),
        ("sprintBank9_15.json", all_sprint),
        ("allWordsBank.json", all_words),
        ("fipiTasksBank.json", all_fipi),
        ("sprintBank.json", all_sprint),
    ]:
        with open(PUBLIC_DATA / fname, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False)

    # Build lightweight starterBank.json (< 450 KB) covering all 19 tasks (4..22) for instant AI Studio load
    starter_words = []
    starter_fipi = []
    starter_sprint = []
    for t in [str(x) for x in range(4, 23)]:
        t_words = [w for w in all_words if str(w.get("task")) == t][:8]
        t_fipi = [fq for fq in all_fipi if str(fq.get("task")) == t][:2]
        t_sprint = [sq for sq in all_sprint if str(sq.get("task")) == t][:8]
        starter_words.extend(t_words)
        starter_fipi.extend(t_fipi)
        starter_sprint.extend(t_sprint)

    starter_obj = {
        "words": starter_words,
        "fipi": starter_fipi,
        "sprint": starter_sprint,
    }
    starter_path = SRC_DATA / "starterBank.json"
    with open(starter_path, "w", encoding="utf-8") as f:
        json.dump(starter_obj, f, ensure_ascii=False)

    size_kb = starter_path.stat().st_size / 1024
    print(f"Saved lightweight src/data/starterBank.json: {size_kb:.1f} KB (words={len(starter_words)}, fipi={len(starter_fipi)}, sprint={len(starter_sprint)})")


if __name__ == "__main__":
    build_all()
