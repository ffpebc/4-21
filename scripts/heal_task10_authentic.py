#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Audits and heals all Task 10 prototypes across fipiTasksBank.json,
fipiTasksBank9_15.json, sprintBank.json, sprintBank9_15.json, and starterBank.json.
Aligns with primary sources (Neofamily, Shkolkovo, FIPI Demo 2025/2026, ege_trainer.db)
and fixes all pedagogical, linguistic, phonetic, and text anomalies.
"""

import json
import os
import re

def fix_expl(expl: str) -> str:
    if not expl:
        return expl
    def repl_s(m):
        w = m.group(1)
        next_c = m.group(2)
        return f'«{w}» — пишется неизменяемая приставка С- (в русском языке приставки З- не существует, перед согласным «{next_c}» пишется только С-)'
    expl = re.sub(
        r'Правописание приставки на -З/-С в слове «([\w-]+)»;\s*выбор согласной зависит от следующего звука корня:\s*перед глухим согласным «([бвгджзлмнрй])»[^\.;]*',
        repl_s,
        expl
    )
    def repl_dis(m):
        w = m.group(1)
        next_c = m.group(2)
        return f'«{w}» — иноязычная приставка ДИС- пишется перед согласными (в том числе перед «{next_c}»), в отличие от ДИЗ- перед гласными и Ъ'
    expl = re.sub(
        r'Правописание приставки на -З/-С в слове «(диС[\w-]+)»;\s*выбор согласной зависит от следующего звука корня:\s*перед глухим согласным «([бвгджзлмнрй])»[^\.;]*',
        repl_dis,
        expl
    )
    expl = re.sub(
        r'Правописание приставки на -З/-С в слове «(Зги|Здание|Здесь|неЗдешний)»;\s*выбор согласной зависит от следующего звука корня:[^\.;]*',
        r'«\1» — буква З входит в корень слова (зги, здание, здесь, здоровье), это не приставка',
        expl
    )
    expl = re.sub(
        r'Правописание приставки на -З/-С в слове «блиЗсидящий»;\s*выбор согласной зависит от следующего звука корня:[^\.;]*',
        r'«блиЗсидящий» — первая часть сложного слова «близ-» (от «близкий», корень БЛИЗ-)',
        expl
    )
    return expl

def heal_task10_question(q):
    qid = q['id']
    if qid == 'fipi-10-shkolkovo-10-142438':
        q['rows'][3]['words'] = ['раз..ём (в телефоне)', 'двух..язычный', 'дет..ясли']
        q['rows'][3]['solvedWords'] = ['разЪём (в телефоне)', 'двухЪязычный', 'детясли']
        q['rows'][3]['letter'] = '—'
        q['rows'][3]['isCorrectRow'] = False
        q['rows'][3]['explanation'] = 'разЪём (в телефоне) — разделительный Ъ пишется после русской приставки РАЗ- на согласную перед йотированной гласной Ё; двухЪязычный — разделительный Ъ пишется в сложных словах после первой основы ДВУХ- перед гласной Я; «детясли» — сложносокращённое слово (детские ясли), разделительный Ъ не пишется.'
        q['correctIndices'] = [2, 3]
    elif qid == 'fipi-10-neofamily-10-79884':
        q['rows'][3]['words'] = ['двух..этажный', 'дет..ясли', 'ад..ютант']
        q['rows'][3]['solvedWords'] = ['двухэтажный', 'детясли', 'адЪютант']
        q['rows'][3]['letter'] = '—'
        q['rows'][3]['isCorrectRow'] = False
        q['rows'][3]['explanation'] = 'двухэтажный — перед гласной Э разделительный Ъ не пишется; «детясли» — сложносокращённое слово (детские ясли), разделительный Ъ не пишется; адЪютант — иноязычная приставка АД- на согласную перед гласной Ю.'
        q['correctIndices'] = [3, 5]
    elif qid == 'fipi-10-neofamily-10-54718':
        q['rows'][2]['words'] = ['пр..дательский', 'пр..дел (возможностей)', 'пр..дать (бодрости)']
        q['rows'][2]['solvedWords'] = ['прЕдательский', 'прЕдел (возможностей)', 'прИдать (бодрости)']
        q['rows'][2]['letter'] = '—'
        q['rows'][2]['isCorrectRow'] = False
        q['rows'][2]['explanation'] = 'прЕдательский — словарное слово с приставкой ПРЕ- (значение предательства, измены); прЕдел (возможностей) — приставка ПРЕ- в значении границы, рубежа (отличие от церковного придела); прИдать (бодрости) — приставка ПРИ- в значении добавления, внесения качества.'
        q['correctIndices'] = [1, 2]
    elif qid == 'fipi-10-neofamily-10-28073':
        q['rows'][4]['words'] = ['вз..ерошенный', 'с..агитировать', 'в..юнок']
        q['rows'][4]['solvedWords'] = ['взЪерошенный', 'сагитировать', 'вЬюнок']
        q['rows'][4]['letter'] = '—'
        q['rows'][4]['isCorrectRow'] = False
        q['rows'][4]['explanation'] = 'взЪерошенный — разделительный Ъ пишется после русской приставки ВЗ- на согласную перед йотированной гласной Е; сагитировать — перед гласной А разделительный знак не пишется; вЬюнок — разделительный Ь пишется в корне слова перед Ю.'
        q['correctIndices'] = [1, 4]
    elif qid == 'fipi-10-shkolkovo-10-142449':
        q['rows'][4]['words'] = ['пр..язык', 'пр..родина', 'пр..дедушка']
        q['rows'][4]['solvedWords'] = ['прАязык', 'прАродина', 'прАдедушка']
        q['rows'][4]['letter'] = 'А'
        q['rows'][4]['isCorrectRow'] = True
        q['rows'][4]['explanation'] = '«прАязык» — приставка ПРА- со значением древности, первоначальности; «прАродина» — приставка ПРА- со значением древности, исконности; «прАдедушка» — приставка ПРА- со значением отдалённой степени родства.'
    elif qid == 'fipi-10-shkolkovo-10-142424':
        q['rows'][0]['words'] = ['пр..исполнен (отваги)', 'пр..дзащита', 'непр..ступная (крепость)']
        q['rows'][0]['solvedWords'] = ['прЕисполнен (отваги)', 'прЕдзащита', 'непрИступная (крепость)']
        q['rows'][0]['letter'] = '—'
        q['rows'][0]['isCorrectRow'] = False
        q['rows'][0]['explanation'] = 'прЕисполнен (отваги) — приставка ПРЕ- в высоком значении «очень»; прЕдзащита — приставка ПРЕД- (неизменяемая, пишется с Е); непрИступная (крепость) — приставка ПРИ- со значением невозможности приблизиться (взять приступом).'
    elif qid == 'fipi-10-shkolkovo-10-142436':
        q['rows'][4]['words'] = ['пр..обрёл', 'пр..озёрский', 'непр..глядный (на вид)']
        q['rows'][4]['solvedWords'] = ['прИобрёл', 'прИозёрский', 'непрИглядный (на вид)']
        q['rows'][4]['letter'] = 'И'
        q['rows'][4]['isCorrectRow'] = True
        q['rows'][4]['explanation'] = 'прИобрёл — приставка ПРИ- в значении присоединения/приобретения; прИозёрский — приставка ПРИ- в значении близости (около озера); непрИглядный (на вид) — приставка ПРИ- (словарное слово).'
    elif qid == 'fipi-10-neofamily-10-49633':
        q['rows'][1]['words'] = ['неб..ющийся', 'кон..юнктура', 'с..экономить']
        q['rows'][1]['solvedWords'] = ['небЬющийся', 'конЪюнктура', 'сэкономить']
        q['rows'][1]['letter'] = '—'
        q['rows'][1]['isCorrectRow'] = False
        q['rows'][1]['explanation'] = 'небЬющийся — разделительный Ь в корне слова перед Ю; конЪюнктура — разделительный Ъ после иноязычной приставки КОН- перед Ю; сэкономить — перед гласной Э разделительный знак не пишется.'
    elif qid == 'fipi-10-neofamily-10-48653':
        q['rows'][4]['words'] = ['пр..мыкающий (к дому)', 'пр..шитый', 'пр..лепить']
        q['rows'][4]['solvedWords'] = ['прИмыкающий (к дому)', 'прИшитый', 'прИлепить']
        q['rows'][4]['letter'] = 'И'
        q['rows'][4]['isCorrectRow'] = True
    elif qid == 'fipi-10-neofamily-10-35959':
        q['rows'][2]['words'] = ['в..дремнуть', '..держал (слово)', 'бе..корыстный']
        q['rows'][2]['solvedWords'] = ['вздремнуть', 'Сдержал (слово)', 'беСкорыстный']
        q['rows'][2]['letter'] = '—'
        q['rows'][2]['isCorrectRow'] = False

    for r in q['rows']:
        r['explanation'] = fix_expl(r['explanation'])

def main():
    print("[1/5] Healing public/data/fipiTasksBank.json and fipiTasksBank9_15.json...")
    for path in ['public/data/fipiTasksBank.json', 'public/data/fipiTasksBank9_15.json']:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        for q in data:
            if str(q.get('task')) == '10':
                heal_task10_question(q)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  Saved {path}")

    print("[2/5] Healing src/data/starterBank.json...")
    with open('src/data/starterBank.json', 'r', encoding='utf-8') as f:
        starter = json.load(f)
    if 'fipi' in starter:
        for q in starter['fipi']:
            if str(q.get('task')) == '10':
                heal_task10_question(q)
    with open('src/data/starterBank.json', 'w', encoding='utf-8') as f:
        json.dump(starter, f, ensure_ascii=False, separators=(',', ':'))
    print("  Saved src/data/starterBank.json")

    print("[3/5] Healing sprint banks...")
    sp_fixes = {
        'sp-10-shkolkovo-10-142438-r4-w1': {
            'prefix': 'раз', 'answer': 'Ъ', 'suffix': 'ём',
            'word': 'разЪём', 'wordGap': 'раз..ём',
            'options': ['Ъ', 'Ь', '—'],
            'explanation': '«разЪём» — разделительный Ъ пишется после русской приставки РАЗ- на согласную перед йотированной гласной Ё.',
            'rule': '«разЪём» — разделительный Ъ пишется после русской приставки РАЗ- на согласную перед йотированной гласной Ё.'
        },
        'sp-10-shkolkovo-10-142438-r4-w3': {
            'prefix': 'дет', 'answer': '—', 'suffix': 'ясли',
            'word': 'детясли', 'wordGap': 'дет..ясли',
            'options': ['Ъ', 'Ь', '—'],
            'explanation': '«детясли» — сложносокращённое слово (детские ясли); разделительный Ъ после первой части сложносокращённых слов не пишется.',
            'rule': '«детясли» — сложносокращённое слово (детские ясли); разделительный Ъ после первой части сложносокращённых слов не пишется.'
        },
        'sp-10-neofamily-10-79884-r4-w2': {
            'prefix': 'дет', 'answer': '—', 'suffix': 'ясли',
            'word': 'детясли', 'wordGap': 'дет..ясли',
            'options': ['Ъ', 'Ь', '—'],
            'explanation': '«детясли» — сложносокращённое слово (детские ясли); разделительный Ъ после первой части сложносокращённых слов не пишется.',
            'rule': '«детясли» — сложносокращённое слово (детские ясли); разделительный Ъ после первой части сложносокращённых слов не пишется.'
        },
        'sp-10-neofamily-10-54718-r3-w1': {
            'prefix': 'пр', 'answer': 'Е', 'suffix': 'дательский',
            'word': 'прЕдательский', 'wordGap': 'пр..дательский',
            'options': ['Е', 'И'],
            'explanation': '«прЕдательский» — словарное слово с приставкой ПРЕ- в значении передачи/измены.',
            'rule': '«прЕдательский» — словарное слово с приставкой ПРЕ- в значении передачи/измены.'
        },
        'sp-10-neofamily-10-54718-r3-w3': {
            'prefix': 'пр', 'answer': 'И', 'suffix': 'дать (бодрости)',
            'word': 'прИдать (бодрости)', 'wordGap': 'пр..дать (бодрости)',
            'options': ['Е', 'И'],
            'explanation': '«прИдать (бодрости)» — приставка ПРИ- в значении добавления, усиления качества.',
            'rule': '«прИдать (бодрости)» — приставка ПРИ- в значении добавления, усиления качества.'
        },
        'sp-10-neofamily-10-28073-r5-w3': {
            'prefix': 'в', 'answer': 'Ь', 'suffix': 'юнок',
            'word': 'вЬюнок', 'wordGap': 'в..юнок',
            'options': ['Ъ', 'Ь', '—'],
            'explanation': '«вЬюнок» — разделительный Ь пишется в корне слова перед буквой Ю.',
            'rule': '«вЬюнок» — разделительный Ь пишется в корне слова перед буквой Ю.'
        },
        'sp-10-shkolkovo-10-142449-r5-w2': {
            'prefix': 'пр', 'answer': 'А', 'suffix': 'родина',
            'word': 'прАродина', 'wordGap': 'пр..родина',
            'options': ['А', 'О'],
            'explanation': '«прАродина» — приставка ПРА- со значением древности, первоначальности.',
            'rule': '«прАродина» — приставка ПРА- со значением древности, первоначальности.'
        },
        'sp-10-neofamily-10-49633-r2-w2': {
            'prefix': 'кон', 'answer': 'Ъ', 'suffix': 'юнктура',
            'word': 'конЪюнктура', 'wordGap': 'кон..юнктура',
            'options': ['Ъ', 'Ь', '—'],
            'explanation': '«конЪюнктура» — разделительный Ъ пишется после иноязычной приставки КОН- перед буквой Ю.',
            'rule': '«конЪюнктура» — разделительный Ъ пишется после иноязычной приставки КОН- перед буквой Ю.'
        }
    }

    for path in ['public/data/sprintBank.json', 'public/data/sprintBank9_15.json']:
        with open(path, 'r', encoding='utf-8') as f:
            sprint_data = json.load(f)
        for s in sprint_data:
            if str(s.get('task')) == '10':
                sid = s['id']
                if sid in sp_fixes:
                    s.update(sp_fixes[sid])
                if s.get('explanation'):
                    s['explanation'] = fix_expl(s['explanation'])
                if s.get('rule'):
                    s['rule'] = fix_expl(s['rule'])
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(sprint_data, f, ensure_ascii=False, indent=2)
        print(f"  Saved {path}")

    print("[4/5] Updating scripts/sync_all_banks_to_primary_sources.py to make changes permanent...")
    # Update heal_tasks_9_13 in sync script
    sync_script_path = 'scripts/sync_all_banks_to_primary_sources.py'
    with open(sync_script_path, 'r', encoding='utf-8') as f:
        sync_code = f.read()

    # Replace the bad indices in sync_all_banks_to_primary_sources.py
    old_block = '''    # 1. fipi-10-shkolkovo-10-142438 & fipi-10-neofamily-10-79884: дет..ясли -> детясли (no Ъ)
    for qid, new_indices in [("fipi-10-shkolkovo-10-142438", [2, 3]), ("fipi-10-neofamily-10-79884", [3, 5])]:
        if qid in q_map:
            q = q_map[qid]
            q["correctIndices"] = new_indices
            r4 = q["rows"][3]
            r4["solvedWords"][0] = "детясли"'''
    
    if old_block in sync_code:
        print("  Found old buggy block in sync_all_banks_to_primary_sources.py, patching...")
        # We can replace this section with call to heal_task10_question
        sync_code = sync_code.replace(
            '''    # 1. fipi-10-shkolkovo-10-142438 & fipi-10-neofamily-10-79884: дет..ясли -> детясли (no Ъ)
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
            sp_map[sp_id]["rule"] = sp_map[sp_id]["explanation"]''',
            '''    # Task 10 permanent heals
    from heal_task10_authentic import heal_task10_question, sp_fixes as t10_sp_fixes, fix_expl as t10_fix_expl
    for q in fipi_bank:
        if str(q.get("task")) == "10":
            heal_task10_question(q)
    for s in sprint_bank:
        if str(s.get("task")) == "10":
            sid = s["id"]
            if sid in t10_sp_fixes:
                s.update(t10_sp_fixes[sid])
            if s.get("explanation"):
                s["explanation"] = t10_fix_expl(s["explanation"])
            if s.get("rule"):
                s["rule"] = t10_fix_expl(s["rule"])'''
        )
        with open(sync_script_path, 'w', encoding='utf-8') as f:
            f.write(sync_code)
        print("  Patched scripts/sync_all_banks_to_primary_sources.py")

    print("[5/5] All heals applied successfully.")

if __name__ == '__main__':
    main()
