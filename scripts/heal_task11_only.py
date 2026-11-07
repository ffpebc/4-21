#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Focused, high-precision healer for Task 11 (Правописание суффиксов):
 1. Formulation: Sets canonical instruction, topic, rule, target across all Task 11 prototypes.
 2. Words & Prototypes:
    - Eliminates trailing semicolons and commas (податл..вый; -> податл..вый).
    - Fixes accidental accent-removal capitalizations (старУш..чий -> старуш..чий).
    - Fixes swapped/misplaced solved words in fipi-11-shkolkovo-11-143725 and 143727.
 3. Answers:
    - Extracts correct missing letter for every word.
    - Sets letter, isCorrectRow, and correctIndices accurately according to official rules.
 4. Explanations:
    - Generates rich, authentic rule explanations for each row.
    - Eliminates broken 'пишется «»' and generic 'согласно правилу словообразования'.
 5. Synchronizes sprintBank and starterBank safely.
"""

import json
import re
import os

CANONICAL_INSTRUCTION = "Укажите варианты ответов, в которых во всех словах одного ряда пропущена одна и та же буква. Запишите номера ответов."
CANONICAL_TOPIC = "Правописание суффиксов (сущ., прил., глаголы)"
CANONICAL_RULE = "Правописание суффиксов различных частей речи (существительных, прилагательных, глаголов)."
CANONICAL_TARGET = "ОДНА И ТА ЖЕ БУКВА"

def generate_word_explanation(w, sw, letter):
    # 1. -ИВА- / -ЫВА- vs -ОВА- / -ЕВА-
    if re.search(r"[иы]ва", sw.lower()) and any(w.endswith(x) for x in ["вать", "вая", "вавший", "ваемый", "ваешь", "вает"]):
        if "И" in sw:
            return f"«{sw}» — глагольный суффикс -ИВА-: в форме 1-го лица ед. ч. настоящего/будущего времени суффикс сохраняется (оканчивается на -иваю)."
        elif "Ы" in sw:
            return f"«{sw}» — глагольный суффикс -ЫВА-: в форме 1-го лица ед. ч. настоящего/будущего времени суффикс сохраняется (оканчивается на -ываю)."
    if re.search(r"[ое]ва", sw.lower()) and any(w.endswith(x) for x in ["вать", "вая", "вавший", "ваемый", "ваешь", "вает"]):
        if any(sw.startswith(p) for p in ["затм", "продл", "застр", "недоум", "сомн", "намер", "обур"]):
            return f"«{sw}» — глагол-исключение: перед ударным суффиксом -ВА- пишется буква Е."
        elif "овлад" in sw or "преодол" in sw or "успе" in sw or "обогр" in sw:
            return f"«{sw}» — перед ударным суффиксом -ВА- пишется та же гласная, что и в неопределённой форме без суффикса -ВА-."
        elif "О" in sw:
            return f"«{sw}» — глагольный суффикс -ОВА-: в форме 1-го лица ед. ч. настоящего/будущего времени суффикс выпадает (оканчивается на -ую)."
        elif "Е" in sw:
            return f"«{sw}» — глагольный суффикс -ЕВА-: в форме 1-го лица ед. ч. настоящего/будущего времени суффикс выпадает (оканчивается на -юю)."

    # 2. Суффиксы прилагательных -ЧИВ- / -ЛИВ-
    if "чИв" in sw or "лИв" in sw or "ЧИВ" in sw or "ЛИВ" in sw:
        return f"«{sw}» — неизменяемый суффикс прилагательного -ЧИВ-/-ЛИВ- всегда пишется с буквой И."

    # 3. Суффикс -ЧАТ-
    if "чАт" in sw or "ЧАТ" in sw:
        return f"«{sw}» — неизменяемый суффикс прилагательного -ЧАТ- всегда пишется с буквой А."

    # 4. -ИВ- / -ЕВ- в прилагательных
    if re.search(r"[ие]в", sw.lower()) and ("ый" in sw.lower() or "ое" in sw.lower() or "ая" in sw.lower()):
        if "милостИв" in sw or "юродИв" in sw:
            return f"«{sw}» — слово-исключение: пишется суффикс -ИВ- в безударной позиции."
        if "Е" in sw:
            return f"«{sw}» — суффикс прилагательного -ЕВ- пишется в безударной позиции."
        if "И" in sw:
            return f"«{sw}» — суффикс прилагательного -ИВ- пишется под ударением."

    # 5. Существительные -ИК- / -ЕК-
    if any(k in sw for k in ["замочЕк", "ножичЕк", "подарочЕк", "кусочЕк", "платочЕк", "звоночЕк", "овражЕк", "мешочЕк"]):
        return f"«{sw}» — суффикс существительного -ЕК-: при склонении гласный выпадает (беглый гласный)."
    if any(k in sw for k in ["ключИк", "ковшИк", "калачИк", "мячИк", "кустик", "укропчИк", "дождИк"]):
        return f"«{sw}» — суффикс существительного -ИК-: при склонении гласный сохраняется."

    # 6. Существительные -ЕЦ- / -ИЦ-
    if "Ец" in sw:
        return f"«{sw}» — суффикс существительного -ЕЦ- (мужской род либо средний род с ударением после суффикса)."
    if "Иц" in sw:
        return f"«{sw}» — суффикс существительного -ИЦ- (женский род либо средний род с ударением до суффикса)."

    # 7. -ИЧК- / -ЕЧК-
    if "Ичк" in sw:
        return f"«{sw}» — суффикс -ИЧК- пишется в существительных, образованных от слов на -ица."
    if "Ечк" in sw:
        return f"«{sw}» — суффикс -ЕЧК- пишется в существительных, образованных не от слов на -ица, а также в именах собственных."

    # 8. -ИНК- / -ЕНК-
    if "Инк" in sw:
        return f"«{sw}» — суффикс -ИНК- пишется в существительных, образованных от слов на -ина."
    if "Енк" in sw:
        return f"«{sw}» — суффикс -ЕНК- пишется в существительных уменьшительных от слов на -на/-ня."

    # 9. -К- / -СК-
    if re.search(r"[кК]ий", sw) and ".." in w:
        if "С" in sw or ("с" in sw and "ск" in sw):
            return f"«{sw}» — относительное прилагательное (не образует краткой формы и образовано от основы не на К/Ц/Ч), поэтому пишется суффикс -СК-."
        else:
            return f"«{sw}» — качественное прилагательное (имеет краткую форму) либо образовано от основы на К/Ц/Ч, поэтому пишется суффикс -К- (буква С не пишется)."

    # 10. Гласные О/Ё после шипящих
    if "Ё" in sw:
        return f"«{sw}» — после шипящей под ударением пишется буква Ё (в отглагольных словах, причастиях либо суффиксе -ЁР-)."
    if "О" in sw and any(sh in sw.lower() for sh in ["ж", "ч", "ш", "щ", "ц"]):
        return f"«{sw}» — под ударением после шипящих в суффиксах и окончаниях существительных, прилагательных и наречий пишется буква О."

    # 11. Наречия на -О / -А
    if (w.endswith("..") or w.endswith("…")) and any(p in w.lower() for p in ["в", "на", "за", "из", "до", "с"]):
        if "А" in sw:
            return f"«{sw}» — наречие с приставкой ИЗ-/ДО-/С-, образованное от бесприставочного прилагательного, пишется с суффиксом -А."
        if "О" in sw:
            return f"«{sw}» — наречие с приставкой В-/НА-/ЗА- пишется с суффиксом -О."

    # 12. Глаголы прошедшего времени на -Л-
    if sw.endswith("л") or sw.endswith("ла") or sw.endswith("ли") or sw.endswith("лся") or sw.endswith("лись"):
        let = re.findall(r"[А-ЯЁ]", sw)
        l_str = let[0] if let else ""
        return f"«{sw}» — перед суффиксом прошедшего времени -Л- сохраняется та же гласная, что и в инфинитиве перед -ТЬ ({l_str})."

    let = re.findall(r"[А-ЯЁ]", sw)
    l_str = let[0] if let else ""
    return f"«{sw}» — согласно правилу правописания суффиксов пишется буква «{l_str}»."

print("Loading fipiTasksBank.json...")
with open("public/data/fipiTasksBank.json", "r", encoding="utf-8") as f:
    fipi_all = json.load(f)

t11_map = {}
fixes_count = 0

for q in fipi_all:
    if str(q.get("task")) == "11":
        qid = q["id"]
        t11_map[qid] = q

        # 1. Formulation
        q["instruction"] = CANONICAL_INSTRUCTION
        q["topic"] = CANONICAL_TOPIC
        q["rule"] = CANONICAL_RULE
        q["target"] = CANONICAL_TARGET

        # 2. Punctuation in words
        for r in q.get("rows", []):
            r["words"] = [w.rstrip(";").rstrip(",").strip() for w in r.get("words", [])]
            r["solvedWords"] = [sw.rstrip(";").rstrip(",").strip() for sw in r.get("solvedWords", [])]

        # Specific anomalies
        if qid == "fipi-11-neofamily-11-54790":
            q["rows"][3]["words"][0] = "старуш..чий"
            q["rows"][3]["solvedWords"][0] = "старушЕчий"
            fixes_count += 1
        elif qid == "fipi-11-neofamily-11-50317":
            q["rows"][0]["words"][1] = "старуш..чий"
            q["rows"][0]["solvedWords"][1] = "старушЕчий"
            fixes_count += 1
        elif qid == "fipi-11-shkolkovo-11-143725":
            q["rows"][0]["words"] = ["моряц..кий", "матрос..кий"]
            q["rows"][0]["solvedWords"] = ["моряцкий", "матросСкий"]
            q["rows"][0]["letter"] = "—"
            q["rows"][0]["isCorrectRow"] = False
            fixes_count += 1
        elif qid == "fipi-11-shkolkovo-11-143727":
            q["rows"][1]["words"] = ["париж..кий", "низ..кий"]
            q["rows"][1]["solvedWords"] = ["парижСкий", "низкий"]
            q["rows"][1]["letter"] = "—"
            q["rows"][1]["isCorrectRow"] = False
            fixes_count += 1

        # 3. Re-verify rows, letter, isCorrectRow, correctIndices, explanation
        correct_indices = []
        for r_idx, r in enumerate(q.get("rows", []), 1):
            words = r.get("words", [])
            solved = r.get("solvedWords", [])

            row_letters = []
            for w, sw in zip(words, solved):
                w_strip = re.sub(r"^\([^)]+\)\s*", "", w).strip()
                sw_strip = re.sub(r"^\([^)]+\)\s*", "", sw).strip()
                caps = []
                for i, c in enumerate(sw_strip):
                    if c.isupper():
                        if i == 0 and not (w_strip.startswith("..") or w_strip.startswith("…")):
                            continue
                        caps.append(c)
                if caps:
                    row_letters.append("".join(caps))
                elif ".." in w and re.search(r"[кК]ий", sw):
                    row_letters.append("") # suffix -к- without -с-
                else:
                    row_letters.append(None)

            w1_l = row_letters[0] if len(row_letters) > 0 else None
            w2_l = row_letters[1] if len(row_letters) > 1 else None

            n1 = "Е" if w1_l in ("Е", "Ё") else w1_l
            n2 = "Е" if w2_l in ("Е", "Ё") else w2_l

            is_same = (w1_l == w2_l and w1_l is not None and w1_l != "") or (n1 == n2 and n1 == "Е")

            r["isCorrectRow"] = is_same
            if is_same:
                correct_indices.append(r_idx)
                if w1_l == "Ё" and w2_l == "Ё":
                    r["letter"] = "Ё"
                elif n1 == "Е":
                    r["letter"] = "Е"
                else:
                    r["letter"] = w1_l
            else:
                r["letter"] = "—"

            expl = r.get("explanation", "")
            if "пишется «»" in expl or "буква «»" in expl or "согласно правилу словообразования данной части речи" in expl or "Морфемный разбор суффикса" in expl or len(expl) < 25:
                e1 = generate_word_explanation(words[0], solved[0], w1_l)
                e2 = generate_word_explanation(words[1], solved[1], w2_l)
                r["explanation"] = f"{e1} | {e2}"
                fixes_count += 1

        q["correctIndices"] = correct_indices

print(f"Healed {len(t11_map)} Task 11 prototypes (applied {fixes_count} enrichments).")

# Save fipiTasksBank.json and fipiTasksBank9_15.json
with open("public/data/fipiTasksBank.json", "w", encoding="utf-8") as f:
    json.dump(fipi_all, f, ensure_ascii=False, indent=2)

fipi_9_15 = [q for q in fipi_all if str(q.get("task")) in ["9", "10", "11", "12", "13", "14", "15"]]
with open("public/data/fipiTasksBank9_15.json", "w", encoding="utf-8") as f:
    json.dump(fipi_9_15, f, ensure_ascii=False, indent=2)

print("Saved fipiTasksBank.json and fipiTasksBank9_15.json.")

# Heal sprintBank.json
print("Loading sprintBank.json...")
with open("public/data/sprintBank.json", "r", encoding="utf-8") as f:
    sprint_all = json.load(f)

sprint_fixes = 0
for sq in sprint_all:
    if str(sq.get("task")) == "11":
        sid = sq["id"]
        m = re.match(r"^sp-11-(.+)-r(\d+)-w(\d+)$", sid)
        if m:
            q_suffix = m.group(1)
            r_idx = int(m.group(2)) - 1
            w_idx = int(m.group(3)) - 1
            matching_q = None
            for qid, q in t11_map.items():
                if q_suffix in qid or qid.endswith(q_suffix):
                    matching_q = q
                    break
            if matching_q and 0 <= r_idx < len(matching_q["rows"]):
                row = matching_q["rows"][r_idx]
                if 0 <= w_idx < len(row["words"]):
                    w = row["words"][w_idx]
                    sw = row["solvedWords"][w_idx]
                    sq["explanation"] = generate_word_explanation(w, sw, sq.get("answer"))
                    sprint_fixes += 1

print(f"Synchronized {sprint_fixes} sprint questions.")
with open("public/data/sprintBank.json", "w", encoding="utf-8") as f:
    json.dump(sprint_all, f, ensure_ascii=False, indent=2)

sprint_9_15 = [q for q in sprint_all if str(q.get("task")) in ["9", "10", "11", "12", "13", "14", "15"]]
with open("public/data/sprintBank9_15.json", "w", encoding="utf-8") as f:
    json.dump(sprint_9_15, f, ensure_ascii=False, indent=2)

print("Saved sprintBank.json and sprintBank9_15.json.")

# Synchronize starterBank.json
with open("src/data/starterBank.json", "r", encoding="utf-8") as f:
    starter = json.load(f)

for k in starter:
    if isinstance(starter[k], list):
        for i, q in enumerate(starter[k]):
            if str(q.get("task")) == "11":
                qid = q["id"]
                if qid in t11_map:
                    starter[k][i] = t11_map[qid]

with open("src/data/starterBank.json", "w", encoding="utf-8") as f:
    json.dump(starter, f, ensure_ascii=False, indent=2)

print("Synchronized starterBank.json successfully!")
