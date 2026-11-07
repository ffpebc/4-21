#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Safe in-place patch for Task 10 anomalies.
"""

import json
import os
import shutil
import tempfile
import re

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

def atomic_write(filepath, data, indent=2, separators=None):
    dir_name = os.path.dirname(os.path.abspath(filepath))
    fd, tmp_path = tempfile.mkstemp(dir=dir_name, suffix='.tmp')
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        if separators:
            json.dump(data, f, ensure_ascii=False, separators=separators)
        else:
            json.dump(data, f, ensure_ascii=False, indent=indent)
    os.replace(tmp_path, filepath)

def main():
    print("Loading public/data/fipiTasksBank.json...")
    with open('public/data/fipiTasksBank.json', 'r', encoding='utf-8') as f:
        fipi = json.load(f)

    for q in fipi:
        if str(q.get('task')) == '10':
            qid = q['id']
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

    print("Saving public/data/fipiTasksBank.json...")
    atomic_write('public/data/fipiTasksBank.json', fipi)
    atomic_write('public/data/fipiTasksBank9_15.json', fipi)

    print("Updating starterBank.json...")
    with open('src/data/starterBank.json', 'r', encoding='utf-8') as f:
        sb = json.load(f)
    if 'fipi' in sb:
        for q in sb['fipi']:
            if str(q.get('task')) == '10':
                for r in q.get('rows', []):
                    r['explanation'] = fix_expl(r.get('explanation', ''))
    atomic_write('src/data/starterBank.json', sb, separators=(',', ':'))

    print("Done!")

if __name__ == '__main__':
    main()
