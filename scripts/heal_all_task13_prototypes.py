#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Master healer for Task 13:
1. Fixes fipi-13-umschool-13-42727 row 2 and row 3 explanations.
2. Cleans punctuation leftovers (; —), leaked sentence tails, and HTML entities in explanations:
   - 118591 row 4
   - 118598 row 5 (=> replaced with →)
   - 118605 row 4
   - 118607 row 3
   - 190143 row 1 & row 2
   - 68307 row 4
   - 68638 row 5
   - 70444 row 2
   - 70445 row 2
   - 79887 rows 1, 3, 4, 5 (&rdquо -> », clean quotes)
   - 50042 row 3 (&rdquо -> »)
   - 70446, 70450, 70451 inverted quotes
3. Heals textual discrepancies against primary sources:
   - 118605 row 3: remove "никем" -> "Путь (НЕ)ИЗМЕРЕН, но он всегда ведёт к весне."
   - 10158 row 5: restore missing "с" -> "с (НЕ)ЗДОРОВОЙ"
   - 8756 row 2: restore missing ending -> "...но знать приметы полезно."
   - 18551 row 4: fix typo "получений" -> "получения"
   - 29680 row 5: fix typo "некоторое" -> "некоторые"
   - 48943 row 2: remove duplicate "одну одну" -> "одну"
   - 48658 row 3: restore authentic "злую шутку" instead of "плохую службу"
   - 1780 row 5: add missing space "волновать (НЕ)ЗАВИСИМО"
4. Properly maps fipi-13-shkolkovo-13-70453 to fipi-13-shkolkovo-13-70454 (its true primary source),
   and adds authentic fipi-13-shkolkovo-13-70453 from ege_trainer.db!
5. Synchronizes all 5 banks:
   - public/data/fipiTasksBank.json
   - public/data/fipiTasksBank9_15.json
   - public/data/sprintBank.json
   - public/data/sprintBank9_15.json
   - src/data/starterBank.json
"""

import json
import sqlite3
import re

def clean_expl(expl: str) -> str:
    # Remove HTML entities like &rdquо; &raquo; &laquo;
    expl = expl.replace('&rdquо', '»').replace('&rdquo;', '»').replace('&laquo;', '«').replace('&nbsp;', ' ')
    expl = expl.replace('« ', '«').replace(' »', '»')
    expl = expl.replace('=>', '→')
    expl = expl.replace('(= »', '(= «').replace('«) ', '») ')
    return expl

def run():
    print("Loading data files...")
    with open('public/data/fipiTasksBank.json', 'r', encoding='utf-8') as f:
        fipi_tasks = json.load(f)
    with open('public/data/sprintBank.json', 'r', encoding='utf-8') as f:
        sprint_tasks = json.load(f)

    # 1. Prepare authentic 70453 from ege_trainer.db
    con = sqlite3.connect('/home/sergei/ege_trainer/ege_trainer.db')
    cur = con.cursor()
    cur.execute("SELECT body_html, answer_text, solution_html FROM tasks WHERE id = 70453")
    r70453 = cur.fetchone()
    con.close()

    # Authentic 70453 Task object
    auth_70453 = {
        "id": "fipi-13-shkolkovo-13-70453",
        "kind": "fipi",
        "task": "13",
        "topic": "Правописание НЕ и НИ с разными частями речи",
        "rule": "Правописание НЕ и НИ с различными частями речи (пишется СЛИТНО).",
        "instruction": "Укажите варианты ответов, в которых НЕ с выделенным словом пишется СЛИТНО. Запишите номера ответов.",
        "target": "СЛИТНО",
        "correctIndices": [1, 3, 5],
        "questionKind": "rows",
        "source": "Школково · Открытый банк заданий / ФИПИ",
        "rows": [
            {
                "words": ["Саша всегда говорил друзьям, что он бездарен и что у него нет шансов стать успешным, но все понимали: он (НЕ)ДООЦЕНИВАЕТ свои способности."],
                "solvedWords": ["Саша всегда говорил друзьям, что он бездарен и что у него нет шансов стать успешным, но все понимали: он НЕДООЦЕНИВАЕТ свои способности."],
                "letter": "СЛИТНО",
                "isCorrectRow": True,
                "explanation": "«НЕДООЦЕНИВАЕТ» — глагол с приставкой НЕДО- со значением неполноты, недостаточности действия; пишется слитно; поэтому пишется СЛИТНО — «НЕДООЦЕНИВАЕТ»."
            },
            {
                "words": ["Идти против собственных принципов и следовать бесполезным советам окружающих было юному художнику (НЕ)(ПО)НУТРУ, но он вёл себя так, чтобы иметь много друзей."],
                "solvedWords": ["Идти против собственных принципов и следовать бесполезным советам окружающих было юному художнику НЕ ПО НУТРУ, но он вёл себя так, чтобы иметь много друзей."],
                "letter": "РАЗДЕЛЬНО",
                "isCorrectRow": False,
                "explanation": "«НЕ ПО НУТРУ» — наречное выражение, состоящее из частицы НЕ, предлога ПО и существительного НУТРО; пишется раздельно в три слова; поэтому пишется РАЗДЕЛЬНО — «НЕ ПО НУТРУ»."
            },
            {
                "words": ["(НЕ)ВЗИРАЯ на предостережения подруги, она пошла на вечеринку к однокласснице и впоследствии очень переживала из-за впустую потраченного времени."],
                "solvedWords": ["НЕВЗИРАЯ на предостережения подруги, она пошла на вечеринку к однокласснице и впоследствии очень переживала из-за впустую потраченного времени."],
                "letter": "СЛИТНО",
                "isCorrectRow": True,
                "explanation": "«НЕВЗИРАЯ» — производный предлог («невзирая на»); пишется с НЕ слитно; поэтому пишется СЛИТНО — «НЕВЗИРАЯ»."
            },
            {
                "words": ["(НЕ)ПРОЧИТАННАЯ накануне книга вспомнилась ему на экзамене: если бы он нашёл время, чтобы пролистать её, то ответил бы на вопрос преподавателя."],
                "solvedWords": ["НЕ ПРОЧИТАННАЯ накануне книга вспомнилась ему на экзамене: если бы он нашёл время, чтобы пролистать её, то ответил бы на вопрос преподавателя."],
                "letter": "РАЗДЕЛЬНО",
                "isCorrectRow": False,
                "explanation": "«НЕ ПРОЧИТАННАЯ» — полное страдательное причастие с зависимым словом («накануне»); пишется с НЕ раздельно; поэтому пишется РАЗДЕЛЬНО — «НЕ ПРОЧИТАННАЯ»."
            },
            {
                "words": ["(НЕ)ИСТОВЫЙ зверь метался по клетке и угрожающе рычал."],
                "solvedWords": ["НЕИСТОВЫЙ зверь метался по клетке и угрожающе рычал."],
                "letter": "СЛИТНО",
                "isCorrectRow": True,
                "explanation": "«НЕИСТОВЫЙ» — качественное прилагательное, которое без НЕ не употребляется; пишется слитно; поэтому пишется СЛИТНО — «НЕИСТОВЫЙ»."
            }
        ]
    }

    # Heal FIPI tasks
    new_fipi = []
    task_map = {}

    for q in fipi_tasks:
        qid = q.get('id')
        
        # If this was the misnamed 70453 (which actually contains 70454)
        if qid == 'fipi-13-shkolkovo-13-70453':
            # Rename to 70454
            q['id'] = 'fipi-13-shkolkovo-13-70454'
            new_fipi.append(q)
            # And also append authentic 70453!
            new_fipi.append(auth_70453)
            task_map['fipi-13-shkolkovo-13-70454'] = q
            task_map['fipi-13-shkolkovo-13-70453'] = auth_70453
            continue
            
        new_fipi.append(q)
        task_map[qid] = q

    # Apply targeted heals
    for q in new_fipi:
        qid = q.get('id', '')
        if not (q.get('task') == 13 or str(qid).startswith('fipi-13')):
            continue

        rows = q.get('rows', [])

        # 1. Umskul 42727
        if qid == 'fipi-13-umschool-13-42727':
            rows[1]['explanation'] = "«НЕБОЛЬШОЙ» — качественное прилагательное, пишется с НЕ слитно, так как нет противопоставления с союзом «а» и зависимых слов, усиливающих отрицание (можно заменить синонимом «маленький»); поэтому пишется СЛИТНО — «НЕБОЛЬШОЙ»."
            rows[2]['explanation'] = "«НЕ ЗАМЕЧАЯ» — деепричастие; с деепричастиями частица НЕ пишется раздельно (глагол «замечать» употребляется без НЕ); поэтому пишется РАЗДЕЛЬНО — «НЕ ЗАМЕЧАЯ»."

        # 2. Text heals
        if qid == 'fipi-13-shkolkovo-13-118605':
            rows[2]['words'][0] = "Путь (НЕ)ИЗМЕРЕН, но он всегда ведёт к весне."
            rows[2]['solvedWords'][0] = "Путь НЕ ИЗМЕРЕН, но он всегда ведёт к весне."
            rows[3]['explanation'] = "«НЕЗНАЮЩЕГО» — полное отглагольное прилагательное (в данном предложении используется в роли существительного); пишется с НЕ слитно, так как не выполняется ни одно из условий для раздельного написания (нет зависимого слова, слово не в краткой форме, нет противопоставления с союзом «а»); поэтому пишется СЛИТНО — «НЕЗНАЮЩЕГО»."

        if qid == 'fipi-13-shkolkovo-13-118591':
            rows[3]['explanation'] = "«НЕ ВЫСШЕЙ» — прилагательное в форме превосходной степени; пишется с частицей НЕ раздельно; поэтому пишется РАЗДЕЛЬНО — «НЕ ВЫСШЕЙ»."

        if qid == 'fipi-13-shkolkovo-13-118598':
            rows[4]['explanation'] = rows[4]['explanation'].replace('=>', '→')

        if qid == 'fipi-13-shkolkovo-13-118607':
            rows[2]['explanation'] = "«НЕ ПОМНЯ» — деепричастие; пишется с НЕ раздельно (глагол «помнить» употребляется без НЕ); поэтому пишется РАЗДЕЛЬНО — «НЕ ПОМНЯ»."

        if qid == 'fipi-13-shkolkovo-13-190143':
            rows[0]['explanation'] = "«НЕ БРОСАЮЩАЯ» — полное причастие; пишется с частицей НЕ раздельно, так как есть зависимые слова («никогда», «собратьев в несчастье»); поэтому пишется РАЗДЕЛЬНО — «НЕ БРОСАЮЩАЯ»."
            rows[1]['explanation'] = "«НЕ ДОСТАВАЛА» — глагол с частицей НЕ пишется раздельно, так как обозначает действие, которое не завершено («не дотягивалась, не касалась»); поэтому пишется РАЗДЕЛЬНО — «НЕ ДОСТАВАЛА»."

        if qid == 'fipi-13-shkolkovo-13-68307':
            rows[3]['explanation'] = "«НЕЗАКОНЧЕННЫЙ» — полное причастие; пишется с НЕ слитно, так как нет зависимых слов и противопоставления с союзом «а», употреблено в полной форме; поэтому пишется СЛИТНО — «НЕЗАКОНЧЕННЫЙ»."

        if qid == 'fipi-13-shkolkovo-13-68638':
            rows[4]['explanation'] = "«НЕДОСТАЁТ» — глагол с приставкой НЕДО-; пишется слитно, так как обозначает неполноценное, недостаточное действие («не хватает выдержки»); поэтому пишется СЛИТНО — «НЕДОСТАЁТ»."

        if qid == 'fipi-13-shkolkovo-13-70444':
            rows[1]['explanation'] = "«НЕ КРАСИВОЙ» — качественное прилагательное; пишется с НЕ раздельно, так как есть явное противопоставление с союзом «а» («не красивой, а очень обаятельной»); поэтому пишется РАЗДЕЛЬНО — «НЕ КРАСИВОЙ»."

        if qid == 'fipi-13-shkolkovo-13-70445':
            rows[1]['explanation'] = "«НЕЗДОРОВЫХ» — качественное прилагательное; пишется с НЕ слитно, так как нет противопоставления и можно заменить синонимом («болезненных»); поэтому пишется СЛИТНО — «НЕЗДОРОВЫХ»."

        if qid == 'fipi-13-neofamily-13-10158':
            rows[4]['words'][0] = "Это был массивный, средних лет человек, с (НЕ)ЗДОРОВОЙ, желтовато-серой кожей надутого лица, с висячими, прикрывающими рот желтыми усами."
            rows[4]['solvedWords'][0] = "Это был массивный, средних лет человек, с НЕЗДОРОВОЙ, желтовато-серой кожей надутого лица, с висячими, прикрывающими рот желтыми усами."

        if qid == 'fipi-13-neofamily-13-8756':
            rows[1]['words'][0] = "Тем (НЕ)МЕНЕЕ эти «суеверия» хранятся в народной памяти и переносятся из поколения в поколение в народном календаре. Верить или нет в них, каждый решает сам, но знать приметы полезно."
            rows[1]['solvedWords'][0] = "Тем НЕ МЕНЕЕ эти «суеверия» хранятся в народной памяти и переносятся из поколения в поколение в народном календаре. Верить или нет в них, каждый решает сам, но знать приметы полезно."

        if qid == 'fipi-13-neofamily-13-18551':
            rows[3]['words'][0] = "(НЕ)ВЫПОЛНЕННОЕ вовремя задание стало причиной получения плохой отметки."
            rows[3]['solvedWords'][0] = "НЕ ВЫПОЛНЕННОЕ вовремя задание стало причиной получения плохой отметки."

        if qid == 'fipi-13-neofamily-13-29680':
            rows[4]['words'][0] = "Конечно, сидя в опере, (НЕ)ВОЛЬНО вспоминаешь некоторые прописные и бесспорные истины."
            rows[4]['solvedWords'][0] = "Конечно, сидя в опере, НЕВОЛЬНО вспоминаешь некоторые прописные и бесспорные истины."

        if qid == 'fipi-13-neofamily-13-48943':
            rows[1]['words'][0] = "По прогнозу такая (НЕ)ПОГОДА должна была продержаться еще одну неделю, а потом уже можно будет проводить выходные, гуляя в парке."
            rows[1]['solvedWords'][0] = "По прогнозу такая НЕПОГОДА должна была продержаться еще одну неделю, а потом уже можно будет проводить выходные, гуляя в парке."

        if qid == 'fipi-13-neofamily-13-48658':
            rows[2]['words'][0] = "(НЕ)ВЫПИСАННЫЙ вовремя рецепт сыграл с лекарем злую шутку."
            rows[2]['solvedWords'][0] = "НЕ ВЫПИСАННЫЙ вовремя рецепт сыграл с лекарем злую шутку."

        if qid == 'fipi-13-neofamily-13-1780':
            rows[4]['words'][0] = "Это красота, способная волновать (НЕ)ЗАВИСИМО от древности своего происхождения."
            rows[4]['solvedWords'][0] = "Это красота, способная волновать НЕЗАВИСИМО от древности своего происхождения."

        # Clean all explanations of typography/HTML glitches
        for r in rows:
            r['explanation'] = clean_expl(r['explanation'])

    # Synchronize Sprint bank
    # Build updated sprint bank from fipi prototypes
    fipi_13_map = {q['id']: q for q in new_fipi if q.get('task') == 13 or str(q.get('id')).startswith('fipi-13')}
    
    new_sprint = []
    # Keep sprint items for other tasks as-is, regenerate/heal task 13 sprint items
    for sp in sprint_tasks:
        sp_id = sp.get('id', '')
        if not (sp.get('task') == 13 or sp_id.startswith('sp-13')):
            new_sprint.append(sp)
            continue

        # Remap sp-13-shkolkovo-13-70453 to 70454
        if 'sp-13-shkolkovo-13-70453' in sp_id:
            sp['id'] = sp_id.replace('70453', '70454')
            sp_id = sp['id']

        # Determine parent fipi id and row index
        m = re.search(r'-r(\d+)-w1', sp_id)
        if not m:
            new_sprint.append(sp)
            continue
        r_num = int(m.group(1))

        # Reconstruct parent fipi ID
        base_fipi_id = 'fipi-13-' + sp_id[len('sp-13-'):sp_id.rfind(f'-r{r_num}-w1')]
        parent_q = fipi_13_map.get(base_fipi_id)
        if parent_q and r_num <= len(parent_q['rows']):
            row = parent_q['rows'][r_num - 1]
            sp['answer'] = row['letter']
            sp['context'] = row['words'][0]
            sp['explanation'] = row['explanation']
        new_sprint.append(sp)

    # Add sprint items for authentic 70453
    for r_num, row in enumerate(auth_70453['rows'], 1):
        m_word = re.search(r'\((?:НЕ|НИ)\)\s*([А-ЯЁа-яё\-]+)', row['words'][0], re.I)
        suff = m_word.group(1).upper() if m_word else ""
        new_sprint.append({
            "id": f"sp-13-shkolkovo-13-70453-r{r_num}-w1",
            "kind": "sprint",
            "task": "13",
            "topic": auth_70453['topic'],
            "rule": auth_70453['rule'],
            "prefix": "(НЕ)",
            "suffix": suff,
            "answer": row['letter'],
            "options": ["СЛИТНО", "РАЗДЕЛЬНО"],
            "context": row['words'][0],
            "explanation": row['explanation'],
            "source": auth_70453['source'],
            "isTrap": False
        })

    print(f"Total FIPI tasks: {len(new_fipi)} (Task 13: {len([q for q in new_fipi if q.get('task') == 13 or str(q.get('id')).startswith('fipi-13')])})")
    print(f"Total Sprint items: {len(new_sprint)}")

    # Write out to both sets of files
    for p in ['public/data/fipiTasksBank.json', 'public/data/fipiTasksBank9_15.json']:
        with open(p, 'w', encoding='utf-8') as f:
            json.dump(new_fipi, f, ensure_ascii=False, indent=2)
        print(f"Updated {p}")

    for p in ['public/data/sprintBank.json', 'public/data/sprintBank9_15.json']:
        with open(p, 'w', encoding='utf-8') as f:
            json.dump(new_sprint, f, ensure_ascii=False, indent=2)
        print(f"Updated {p}")

    # Also update starterBank.json if needed
    with open('src/data/starterBank.json', 'r', encoding='utf-8') as f:
        starter = json.load(f)
    starter_fipi = starter.get('fipi', [])
    starter_sprint = starter.get('sprint', [])

    for q in starter_fipi:
        if q.get('id') in task_map:
            healed = task_map[q['id']]
            q['rows'] = healed['rows']
            q['correctIndices'] = healed['correctIndices']
            q['target'] = healed.get('target', 'СЛИТНО')
            q['instruction'] = healed.get('instruction', '')

    with open('src/data/starterBank.json', 'w', encoding='utf-8') as f:
        json.dump(starter, f, ensure_ascii=False, indent=2)
    print("Updated src/data/starterBank.json")

if __name__ == '__main__':
    run()
