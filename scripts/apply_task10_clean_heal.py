#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Precise, robust script to heal Task 10 anomalies in:
- public/data/fipiTasksBank.json
- public/data/fipiTasksBank9_15.json
- public/data/sprintBank.json
- public/data/sprintBank9_15.json
- src/data/starterBank.json
"""

import json
import re
import shutil

OFFICIAL_10 = "Укажите варианты ответов, в которых во всех словах одного ряда пропущена одна и та же буква. Запишите номера ответов."

def fix_expl(expl: str) -> str:
    if not expl:
        return expl
    def repl_s(m):
        w = m.group(1)
        next_c = m.group(2)
        return f"«{w}» — пишется неизменяемая приставка С- (в русском языке приставки З- не существует, перед согласным «{next_c}» пишется только С-)"
    expl = re.sub(
        r"Правописание приставки на -З/-С в слове «([\w-]+)»;\s*выбор согласной зависит от следующего звука корня:\s*перед глухим согласным «([бвгджзлмнрй])»[^\.;]*",
        repl_s,
        expl
    )
    def repl_dis(m):
        w = m.group(1)
        next_c = m.group(2)
        return f"«{w}» — иноязычная приставка ДИС- пишется перед согласными (в том числе перед «{next_c}»), в отличие от ДИЗ- перед гласными и Ъ"
    expl = re.sub(
        r"Правописание приставки на -З/-С в слове «(диС[\w-]+)»;\s*выбор согласной зависит от следующего звука корня:\s*перед глухим согласным «([бвгджзлмнрй])»[^\.;]*",
        repl_dis,
        expl
    )
    expl = re.sub(
        r"Правописание приставки на -З/-С в слове «(Зги|Здание|Здесь|неЗдешний)»;\s*выбор согласной зависит от следующего звука корня:[^\.;]*",
        r"«\1» — буква З входит в корень слова (зги, здание, здесь, здоровье), это не приставка",
        expl
    )
    expl = re.sub(
        r"Правописание приставки на -З/-С в слове «блиЗсидящий»;\s*выбор согласной зависит от следующего звука корня:[^\.;]*",
        r"«блиЗсидящий» — первая часть сложного слова «близ-» (от «близкий», корень БЛИЗ-)",
        expl
    )
    return expl

def heal_task10_q(q):
    qid = q["id"]
    q["instruction"] = OFFICIAL_10
    q["target"] = "ОДНА И ТА ЖЕ БУКВА"

    if qid == "fipi-10-shkolkovo-10-142438":
        q["rows"][3]["words"] = ["раз..ём (в телефоне)", "двух..язычный", "дет..ясли"]
        q["rows"][3]["solvedWords"] = ["разЪём (в телефоне)", "двухЪязычный", "детясли"]
        q["rows"][3]["letter"] = "—"
        q["rows"][3]["isCorrectRow"] = False
        q["rows"][3]["explanation"] = (
            "разЪём (в телефоне) — разделительный Ъ пишется после русской приставки РАЗ- на согласную перед йотированной гласной Ё; "
            "двухЪязычный — разделительный Ъ пишется в сложных словах после первой основы ДВУХ- перед гласной Я; "
            "«детясли» — сложносокращённое слово (детские ясли), разделительный Ъ не пишется."
        )
        q["correctIndices"] = [2, 3]

    elif qid == "fipi-10-neofamily-10-79884":
        q["rows"][3]["words"] = ["двух..этажный", "дет..ясли", "ад..ютант"]
        q["rows"][3]["solvedWords"] = ["двухэтажный", "детясли", "адЪютант"]
        q["rows"][3]["letter"] = "—"
        q["rows"][3]["isCorrectRow"] = False
        q["rows"][3]["explanation"] = (
            "двухэтажный — перед гласной Э разделительный Ъ не пишется; "
            "«детясли» — сложносокращённое слово (детские ясли), разделительный Ъ не пишется; "
            "адЪютант — иноязычная приставка АД- на согласную перед гласной Ю."
        )
        q["correctIndices"] = [3, 5]

    elif qid == "fipi-10-neofamily-10-54718":
        q["rows"][2]["words"] = ["пр..дательский", "пр..дел (возможностей)", "пр..дать (бодрости)"]
        q["rows"][2]["solvedWords"] = ["прЕдательский", "прЕдел (возможностей)", "прИдать (бодрости)"]
        q["rows"][2]["letter"] = "—"
        q["rows"][2]["isCorrectRow"] = False
        q["rows"][2]["explanation"] = (
            "прЕдательский — словарное слово с приставкой ПРЕ- (значение предательства, измены); "
            "прЕдел (возможностей) — приставка ПРЕ- в значении границы, рубежа; "
            "прИдать (бодрости) — приставка ПРИ- в значении добавления, внесения качества."
        )
        q["correctIndices"] = [1, 2]

    elif qid == "fipi-10-neofamily-10-28073":
        q["rows"][4]["words"] = ["вз..ерошенный", "с..агитировать", "в..юнок"]
        q["rows"][4]["solvedWords"] = ["взЪерошенный", "сагитировать", "вЬюнок"]
        q["rows"][4]["letter"] = "—"
        q["rows"][4]["isCorrectRow"] = False
        q["rows"][4]["explanation"] = (
            "«взЪерошенный» — разделительный Ъ пишется после русской приставки ВЗ- на согласную перед йотированной гласной Е; "
            "«сагитировать» — перед гласной А разделительный знак не пишется; "
            "«вЬюнок» — разделительный Ь пишется в корне слова перед Ю."
        )
        q["correctIndices"] = [1, 4]

    elif qid == "fipi-10-shkolkovo-10-142449":
        q["rows"][4]["words"] = ["пр..язык", "пр..родина", "пр..дедушка"]
        q["rows"][4]["solvedWords"] = ["прАязык", "прАродина", "прАдедушка"]
        q["rows"][4]["letter"] = "А"
        q["rows"][4]["isCorrectRow"] = True
        q["rows"][4]["explanation"] = (
            "«прАязык» — приставка ПРА- со значением древности, первоначальности; "
            "«прАродина» — приставка ПРА- со значением древности, исконности; "
            "«прАдедушка» — приставка ПРА- со значением отдалённой степени родства."
        )
        q["correctIndices"] = [1, 4, 5]

    elif qid == "fipi-10-shkolkovo-10-142424":
        q["rows"][0]["words"] = ["пр..исполнен (отваги)", "пр..дзащита", "непр..ступная (крепость)"]
        q["rows"][0]["solvedWords"] = ["прЕисполнен (отваги)", "прЕдзащита", "непрИступная (крепость)"]
        q["rows"][0]["letter"] = "—"
        q["rows"][0]["isCorrectRow"] = False
        q["rows"][0]["explanation"] = (
            "прЕисполнен (отваги) — приставка ПРЕ- в высоком значении «очень»; "
            "прЕдзащита — приставка ПРЕД- (неизменяемая, пишется с Е); "
            "непрИступная (крепость) — приставка ПРИ- со значением невозможности приблизиться (взять приступом)."
        )

    elif qid == "fipi-10-shkolkovo-10-142436":
        q["rows"][4]["words"] = ["пр..обрёл", "пр..озёрский", "непр..глядный (на вид)"]
        q["rows"][4]["solvedWords"] = ["прИобрёл", "прИозёрский", "непрИглядный (на вид)"]
        q["rows"][4]["letter"] = "И"
        q["rows"][4]["isCorrectRow"] = True
        q["rows"][4]["explanation"] = (
            "прИобрёл — приставка ПРИ- в значении присоединения/приобретения; "
            "прИозёрский — приставка ПРИ- в значении близости (около озера); "
            "непрИглядный (на вид) — приставка ПРИ- (словарное слово)."
        )

    elif qid == "fipi-10-neofamily-10-49633":
        q["rows"][1]["words"] = ["неб..ющийся", "кон..юнктура", "с..экономить"]
        q["rows"][1]["solvedWords"] = ["небЬющийся", "конЪюнктура", "сэкономить"]
        q["rows"][1]["letter"] = "—"
        q["rows"][1]["isCorrectRow"] = False
        q["rows"][1]["explanation"] = (
            "небЬющийся — разделительный Ь в корне слова перед Ю; "
            "конЪюнктура — разделительный Ъ после иноязычной приставки КОН- перед Ю; "
            "сэкономить — перед гласной Э разделительный знак не пишется."
        )

    elif qid == "fipi-10-neofamily-10-48653":
        q["rows"][4]["words"] = ["пр..мыкающий (к дому)", "пр..шитый", "пр..лепить"]
        q["rows"][4]["solvedWords"] = ["прИмыкающий (к дому)", "прИшитый", "прИлепить"]
        q["rows"][4]["letter"] = "И"
        q["rows"][4]["isCorrectRow"] = True

    elif qid == "fipi-10-neofamily-10-35959":
        q["rows"][2]["words"] = ["в..дремнуть", "..держал (слово)", "бе..корыстный"]
        q["rows"][2]["solvedWords"] = ["вздремнуть", "Сдержал (слово)", "беСкорыстный"]
        q["rows"][2]["letter"] = "—"
        q["rows"][2]["isCorrectRow"] = False

    for r in q["rows"]:
        r["explanation"] = fix_expl(r.get("explanation", ""))

def main():
    print("1. Loading public/data/fipiTasksBank.json...")
    with open("public/data/fipiTasksBank.json", "r", encoding="utf-8") as f:
        fipi_tasks = json.load(f)

    for q in fipi_tasks:
        if str(q.get("task")) == "10":
            heal_task10_q(q)

    with open("public/data/fipiTasksBank.json", "w", encoding="utf-8") as f:
        json.dump(fipi_tasks, f, ensure_ascii=False, indent=2)
    print("   public/data/fipiTasksBank.json saved successfully.")

    shutil.copyfile("public/data/fipiTasksBank.json", "public/data/fipiTasksBank9_15.json")
    print("   public/data/fipiTasksBank9_15.json synchronized successfully.")

    print("2. Updating starterBank.json...")
    with open("src/data/starterBank.json", "r", encoding="utf-8") as f:
        starter = json.load(f)
    if "fipi" in starter:
        for q in starter["fipi"]:
            if str(q.get("task")) == "10":
                heal_task10_q(q)
    with open("src/data/starterBank.json", "w", encoding="utf-8") as f:
        json.dump(starter, f, ensure_ascii=False, separators=(",", ":"))
    print("   src/data/starterBank.json saved successfully.")

    print("3. Updating sprint banks...")
    sp_fixes = {
        "sp-10-shkolkovo-10-142438-r4-w1": {
            "prefix": "раз", "answer": "Ъ", "suffix": "ём",
            "word": "разЪём", "wordGap": "раз..ём",
            "options": ["Ъ", "Ь", "—"],
            "explanation": "«разЪём» — разделительный Ъ пишется после русской приставки РАЗ- на согласную перед йотированной гласной Ё.",
            "rule": "«разЪём» — разделительный Ъ пишется после русской приставки РАЗ- на согласную перед йотированной гласной Ё."
        },
        "sp-10-shkolkovo-10-142438-r4-w3": {
            "prefix": "дет", "answer": "—", "suffix": "ясли",
            "word": "детясли", "wordGap": "дет..ясли",
            "options": ["Ъ", "Ь", "—"],
            "explanation": "«детясли» — сложносокращённое слово (детские ясли); разделительный Ъ после первой части сложносокращённых слов не пишется.",
            "rule": "«детясли» — сложносокращённое слово (детские ясли); разделительный Ъ после первой части сложносокращённых слов не пишется."
        },
        "sp-10-neofamily-10-79884-r4-w2": {
            "prefix": "дет", "answer": "—", "suffix": "ясли",
            "word": "детясли", "wordGap": "дет..ясли",
            "options": ["Ъ", "Ь", "—"],
            "explanation": "«детясли» — сложносокращённое слово (детские ясли); разделительный Ъ после первой части сложносокращённых слов не пишется.",
            "rule": "«детясли» — сложносокращённое слово (детские ясли); разделительный Ъ после первой части сложносокращённых слов не пишется."
        },
        "sp-10-neofamily-10-54718-r3-w1": {
            "prefix": "пр", "answer": "Е", "suffix": "дательский",
            "word": "прЕдательский", "wordGap": "пр..дательский",
            "options": ["Е", "И"],
            "explanation": "«прЕдательский» — словарное слово с приставкой ПРЕ- в значении передачи/измены.",
            "rule": "«прЕдательский» — словарное слово с приставкой ПРЕ- в значении передачи/измены."
        },
        "sp-10-neofamily-10-54718-r3-w3": {
            "prefix": "пр", "answer": "И", "suffix": "дать (бодрости)",
            "word": "прИдать (бодрости)", "wordGap": "пр..дать (бодрости)",
            "options": ["Е", "И"],
            "explanation": "«прИдать (бодрости)» — приставка ПРИ- в значении добавления, усиления качества.",
            "rule": "«прИдать (бодрости)» — приставка ПРИ- в значении добавления, усиления качества."
        },
        "sp-10-neofamily-10-28073-r5-w3": {
            "prefix": "в", "answer": "Ь", "suffix": "юнок",
            "word": "вЬюнок", "wordGap": "в..юнок",
            "options": ["Ъ", "Ь", "—"],
            "explanation": "«вЬюнок» — разделительный Ь пишется в корне слова перед буквой Ю.",
            "rule": "«вЬюнок» — разделительный Ь пишется в корне слова перед буквой Ю."
        },
        "sp-10-shkolkovo-10-142449-r5-w2": {
            "prefix": "пр", "answer": "А", "suffix": "родина",
            "word": "прАродина", "wordGap": "пр..родина",
            "options": ["А", "О"],
            "explanation": "«прАродина» — приставка ПРА- со значением древности, первоначальности.",
            "rule": "«прАродина» — приставка ПРА- со значением древности, первоначальности."
        },
        "sp-10-neofamily-10-49633-r2-w2": {
            "prefix": "кон", "answer": "Ъ", "suffix": "юнктура",
            "word": "конЪюнктура", "wordGap": "кон..юнктура",
            "options": ["Ъ", "Ь", "—"],
            "explanation": "«конЪюнктура» — разделительный Ъ пишется после иноязычной приставки КОН- перед буквой Ю.",
            "rule": "«конЪюнктура» — разделительный Ъ пишется после иноязычной приставки КОН- перед буквой Ю."
        }
    }

    with open("public/data/sprintBank.json", "r", encoding="utf-8") as f:
        sprint_data = json.load(f)

    for s in sprint_data:
        if str(s.get("task")) == "10":
            sid = s["id"]
            if sid in sp_fixes:
                s.update(sp_fixes[sid])
            if s.get("explanation"):
                s["explanation"] = fix_expl(s["explanation"])
            if s.get("rule"):
                s["rule"] = fix_expl(s["rule"])

    with open("public/data/sprintBank.json", "w", encoding="utf-8") as f:
        json.dump(sprint_data, f, ensure_ascii=False, indent=2)
    print("   public/data/sprintBank.json saved successfully.")

    shutil.copyfile("public/data/sprintBank.json", "public/data/sprintBank9_15.json")
    print("   public/data/sprintBank9_15.json synchronized successfully.")
    print("All task 10 updates finished.")

if __name__ == '__main__':
    main()
