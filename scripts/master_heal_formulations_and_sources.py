import json
import re
import os

def find_lcs(s1, s2):
    m = [[0] * (1 + len(s2)) for _ in range(1 + len(s1))]
    longest, x_longest = 0, 0
    for x in range(1, 1 + len(s1)):
        for y in range(1, 1 + len(s2)):
            if s1[x - 1] == s2[y - 1]:
                m[x][y] = m[x - 1][y - 1] + 1
                if m[x][y] > longest:
                    longest = m[x][y]
                    x_longest = x
            else:
                m[x][y] = 0
    return s1[x_longest - longest: x_longest]

# 4 Missing explanations in Task 5
T5_CUSTOM_EXPLANATIONS = {
    'shk-5-17887': "Паронимы: изобретательный — изобретательский. «Изобретательный» — находчивый, способный изобретать (изобретательный ум). «Изобретательский» — относящийся к изобретателю или изобретательству. В предложении речь идёт о деятельности изобретателя, поэтому правильно: ИЗОБРЕТАТЕЛЬСКОЙ.",
    'shk-5-84763': "Паронимы: избирать — выбирать. «Избирать» — отдавать предпочтение голосованием (избирать депутата). «Выбирать» — определять нужное из имеющегося. В предложении речь идёт о выборе воды, поэтому правильно: ВЫБИРАЯ.",
    'shk-5-84769': "Паронимы: информативность — информированность — информационный. «Информированность» — осведомлённость, степень владения информацией. В предложении: ИНФОРМИРОВАННОСТЬ.",
    'shk-5-84771': "Паронимы: лесистый — лесной. «Лесистый» — обильно поросший лесом (лесистый берег). «Лесной» — находящийся в лесу, относящийся к лесу (лесной ручей, лесные озёра). В предложении речь о ручьях в лесу, поэтому правильно: ЛЕСНЫХ.",
}

def resolve_source(qid, current_source):
    if current_source and current_source != 'Unknown':
        return current_source
    if 'demo' in qid:
        return 'ФИПИ · Официальный демовариант'
    if 'neofamily' in qid:
        return 'NeoFamily · Открытый банк заданий / ФИПИ'
    if 'shkolkovo' in qid:
        return 'Школково · Открытый банк заданий / ФИПИ'
    if 'umschool' in qid:
        return 'Умскул · Открытый банк заданий'
    if 'bank' in qid:
        return 'Банк Задач · Реальный ЕГЭ / ФИПИ'
    if '100points' in qid:
        return '100балльный репетитор · Банк ЕГЭ'
    if qid.startswith('shk-'):
        return 'Школково · Открытый банк заданий / ФИПИ'
    if qid.startswith('nf-'):
        return 'NeoFamily · Реальный ЕГЭ / ФИПИ'
    return 'Банк ФИПИ'

def heal_task5(q):
    answers = [a.lower().strip() for a in q.get('textAnswers', [])]
    ans = answers[0] if answers else ''
    rows = q.get('rows', [])
    if not rows or not ans:
        return q

    expl_all = ' '.join(r.get('explanation', '') for r in rows)
    scores = [0] * len(rows)

    for i, r in enumerate(rows):
        w = r.get('words', [''])[0]
        caps = re.findall(r'\b[А-ЯЁ]{3,}\b', w)
        cap = caps[0].lower() if caps else ''
        if cap:
            if re.search(rf'«?{re.escape(cap)}»?\s*[-—–]\s*(?:неверно|ошибка|неправильно)', expl_all, re.I):
                scores[i] += 18
            if re.search(rf'заменить\s+на\s+«?{re.escape(ans)}»?', expl_all, re.I) and cap in expl_all:
                scores[i] += 15
            lcs = find_lcs(cap, ans)
            if len(lcs) >= 3:
                scores[i] += len(lcs) * 2
            if (cap.startswith('веч') and ans.startswith('век')) or (cap.startswith('век') and ans.startswith('веч')):
                scores[i] += 15
            if (cap.startswith('быв') and ans.startswith('был')) or (cap.startswith('был') and ans.startswith('быв')):
                scores[i] += 15
            if (cap.startswith('оде') and ans.startswith('наде')) or (cap.startswith('наде') and ans.startswith('оде')):
                scores[i] += 15
            if cap.startswith('дел') and ans.startswith('дел'):
                scores[i] += 10
            if (cap.startswith('цел') and ans.startswith('цел')):
                scores[i] += 10

    best_score = max(scores)
    best_idx = scores.index(best_score) if best_score > 0 else 0
    corr_idx = q.get('correctIndices', [1])[0] - 1

    # Preserve or use custom explanation
    best_expl = rows[best_idx].get('explanation', '')
    if len(best_expl.strip()) < 10:
        if q.get('id') in T5_CUSTOM_EXPLANATIONS:
            best_expl = T5_CUSTOM_EXPLANATIONS[q['id']]
        else:
            # check if row 0 has it
            r0_expl = rows[0].get('explanation', '')
            if len(r0_expl.strip()) >= 10:
                best_expl = r0_expl

    # Fix rows
    for i, r in enumerate(rows):
        w = r.get('words', [''])[0]
        caps = re.findall(r'\b[А-ЯЁ]{3,}\b', w)
        cap = caps[0] if caps else ''

        if i == best_idx:
            r['isCorrectRow'] = True
            r['letter'] = ans.upper()
            r['explanation'] = best_expl
            if cap:
                r['solvedWords'] = [w.replace(cap, ans.upper())]
            else:
                r['solvedWords'] = [ans.upper()]
        else:
            r['isCorrectRow'] = False
            r['letter'] = 'ВЕРНО'
            r['solvedWords'] = list(r.get('words', []))
            r['explanation'] = 'Пароним употреблён верно.'

    q['correctIndices'] = [best_idx + 1]
    q['instruction'] = 'В одном из приведённых ниже предложений НЕВЕРНО употреблено выделенное слово. Исправьте лексическую ошибку, подобрав к выделенному слову пароним. Запишите подобранное слово.'
    q['rule'] = 'Подберите верный пароним в соответствии с контекстом предложения и лексическим значением.'
    return q

def heal_task7(q):
    answers = [a.lower().strip() for a in q.get('textAnswers', [])]
    ans = answers[0] if answers else ''
    rows = q.get('rows', [])
    if not rows or not ans:
        return q

    expl_all = ' '.join(r.get('explanation', '') for r in rows)
    scores = [0] * len(rows)

    for i, r in enumerate(rows):
        w = r.get('words', [''])[0]
        caps = re.findall(r'\b[А-ЯЁ]{3,}\b', w)
        cap = caps[0].lower() if caps else ''

        if 'неверно' in expl_all or 'ошибка' in expl_all:
            if re.search(rf'{re.escape(w)}\s*[-—–]\s*(?:неверно|ошибка|неправильно)', expl_all, re.I):
                scores[i] += 25
            elif cap and re.search(rf'{re.escape(cap)}\s*[-—–]\s*(?:неверно|ошибка|неправильно)', expl_all, re.I):
                scores[i] += 20
        if cap and ans:
            if cap[:3] == ans[:3] or cap[-3:] == ans[-3:] or cap in ans or ans in cap:
                scores[i] += 12
        if 'ихн' in cap and ans == 'их':
            scores[i] += 30
        if ('ляж' in cap or 'ляжь' in cap) and ans == 'лягте':
            scores[i] += 30
        if ('ехай' in cap or 'езжай' in cap or 'едь' in cap) and ans == 'поезжай':
            scores[i] += 30
        if 'подскольз' in cap and 'поскольз' in ans:
            scores[i] += 30
        if 'пекёт' in cap and ans == 'печет':
            scores[i] += 30
        if 'махает' in cap and ans == 'машет':
            scores[i] += 30
        if 'трехста' in cap and 'трех' in ans:
            scores[i] += 30
        if ('ним' in cap or 'ней' in cap or 'нему' in cap) and ans in ['им', 'ей', 'ему']:
            scores[i] += 30

    best_score = max(scores)
    best_idx = scores.index(best_score) if best_score > 0 else 0

    best_expl = rows[best_idx].get('explanation', '')
    if len(best_expl.strip()) < 10:
        r0_expl = rows[0].get('explanation', '')
        if len(r0_expl.strip()) >= 10:
            best_expl = r0_expl

    for i, r in enumerate(rows):
        w = r.get('words', [''])[0]
        caps = re.findall(r'\b[А-ЯЁ]{3,}\b', w)
        cap = caps[0] if caps else ''

        if i == best_idx:
            r['isCorrectRow'] = True
            r['letter'] = ans.upper()
            r['explanation'] = best_expl
            if cap:
                r['solvedWords'] = [w.replace(cap, ans.upper())]
            else:
                r['solvedWords'] = [ans.upper()]
        else:
            r['isCorrectRow'] = False
            r['letter'] = 'ВЕРНО'
            r['solvedWords'] = list(r.get('words', []))
            r['explanation'] = 'Морфологическая форма образована верно.'

    q['correctIndices'] = [best_idx + 1]
    q['instruction'] = 'В одном из выделенных ниже слов допущена ошибка в образовании формы слова. Исправьте ошибку и запишите слово правильно.'
    q['rule'] = 'Морфологические нормы: правила образования грамматических форм слов (род, число, падеж, степени сравнения, формы глаголов).'
    return q

def heal_question(q):
    qid = str(q.get('id', ''))
    task = str(q.get('task', ''))
    q['source'] = resolve_source(qid, q.get('source'))

    if task == '4':
        q['instruction'] = 'Укажите варианты ответов, в которых верно выделена буква, обозначающая ударный гласный звук. Запишите номера ответов.'
        q['rule'] = 'Проверьте постановку ударения в соответствии с орфоэпическим словником ФИПИ.'
    elif task == '5':
        q = heal_task5(q)
    elif task == '6':
        expl_all = ' '.join(r.get('explanation', '') for r in q.get('rows', []))
        instr_raw = q.get('instruction', '') or ''
        if 'замен' in instr_raw or 'замен' in expl_all:
            q['instruction'] = 'Отредактируйте предложение: исправьте лексическую ошибку, заменив неверно употреблённое слово. Запишите подобранное слово, соблюдая нормы современного русского литературного языка.'
        else:
            q['instruction'] = 'Отредактируйте предложение: исправьте лексическую ошибку, исключив лишнее слово. Выпишите это слово.'
        q['rule'] = 'Устраните речевую ошибку (плеоназм, тавтологию или лексическую несочетаемость).'
    elif task == '7':
        q = heal_task7(q)
    elif task == '8':
        q['instruction'] = 'Установите соответствие между грамматическими ошибками и предложениями, в которых они допущены: к каждой позиции первого столбца подберите соответствующую позицию из второго столбца.'
        q['rule'] = 'Синтаксические нормы: грамматические ошибки в построении предложений различных типов.'
    elif task in ['9', '10', '11', '12']:
        q['instruction'] = 'Укажите варианты ответов, в которых во всех словах одного ряда пропущена одна и та же буква. Запишите номера ответов.'
        if task == '9':
            q['rule'] = 'Правописание безударных проверяемых, непроверяемых и чередующихся гласных корня.'
        elif task == '10':
            q['rule'] = 'Правописание приставок (на -З/-С, ПРЕ-/ПРИ-, буквы Ы/И после приставок, Ъ/Ь).'
        elif task == '11':
            q['rule'] = 'Правописание суффиксов различных частей речи (существительных, прилагательных, глаголов).'
        elif task == '12':
            q['rule'] = 'Правописание личных окончаний глаголов и суффиксов причастий настоящего времени.'
    elif task == '13':
        corr = q.get('correctIndices', [])
        rows = q.get('rows', [])
        is_razdelno = any('РАЗДЕЛЬНО' in rows[idx - 1].get('letter', '').upper() for idx in corr if idx <= len(rows))
        if is_razdelno:
            q['instruction'] = 'Укажите варианты ответов, в которых НЕ с выделенным словом пишется РАЗДЕЛЬНО. Запишите номера ответов.'
            q['rule'] = 'Правописание НЕ и НИ с различными частями речи (пишется РАЗДЕЛЬНО).'
        else:
            q['instruction'] = 'Укажите варианты ответов, в которых НЕ с выделенным словом пишется СЛИТНО. Запишите номера ответов.'
            q['rule'] = 'Правописание НЕ и НИ с различными частями речи (пишется СЛИТНО).'
    elif task == '14':
        corr = q.get('correctIndices', [])
        rows = q.get('rows', [])
        letters = [rows[idx - 1].get('letter', '').upper() for idx in corr if idx <= len(rows)]
        is_defis = any('ДЕФИС' in l for l in letters)
        is_razdelno = any('РАЗДЕЛЬНО' in l for l in letters)
        if is_defis:
            q['instruction'] = 'Укажите варианты ответов, в которых все выделенные слова пишутся ЧЕРЕЗ ДЕФИС. Запишите номера ответов.'
            q['rule'] = 'Слитное, дефисное и раздельное написание слов (пишутся ЧЕРЕЗ ДЕФИС).'
        elif is_razdelno:
            q['instruction'] = 'Укажите варианты ответов, в которых все выделенные слова пишутся РАЗДЕЛЬНО. Запишите номера ответов.'
            q['rule'] = 'Слитное, дефисное и раздельное написание слов (пишутся РАЗДЕЛЬНО).'
        else:
            q['instruction'] = 'Укажите варианты ответов, в которых все выделенные слова пишутся СЛИТНО. Запишите номера ответов.'
            q['rule'] = 'Слитное, дефисное и раздельное написание слов (пишутся СЛИТНО).'
    elif task == '15':
        corr = q.get('correctIndices', [])
        rows = q.get('rows', [])
        letters = [rows[idx - 1].get('letter', '').strip().upper() for idx in corr if idx <= len(rows)]
        is_single_n = all(l == 'Н' for l in letters) and len(letters) > 0
        if is_single_n:
            q['instruction'] = 'Укажите все цифры, на месте которых пишется Н. Запишите цифры в порядке возрастания.'
            q['rule'] = 'Правописание -Н- и -НН- в суффиксах различных частей речи (пишется одна буква Н).'
        else:
            q['instruction'] = 'Укажите все цифры, на месте которых пишется НН. Запишите цифры в порядке возрастания.'
            q['rule'] = 'Правописание -Н- и -НН- в суффиксах различных частей речи (пишется две буквы НН).'
    elif task == '16':
        q['instruction'] = 'Расставьте знаки препинания. Укажите предложения, в которых нужно поставить ОДНУ запятую. Запишите номера этих предложений.'
        q['rule'] = 'Пунктуация в сложносочинённом предложении (ССП) и в предложениях с однородными членами (ОДНУ запятую).'
    elif task in ['17', '18', '19', '20']:
        q['instruction'] = 'Расставьте знаки препинания: укажите все цифры, на месте которых в предложении должны стоять запятые.'
        if task == '17':
            q['rule'] = 'Знаки препинания в предложениях с обособленными членами (причастными, деепричастными оборотами).'
        elif task == '18':
            q['rule'] = 'Знаки препинания в предложениях с вводными словами, конструкциями и обращениями.'
        elif task == '19':
            q['rule'] = 'Знаки препинания в сложноподчинённом предложении (СПП) с придаточными.'
        elif task == '20':
            q['rule'] = 'Знаки препинания в сложных предложениях с разными видами связи (на стыке союзов).'
    elif task == '21':
        instr_raw = (q.get('instruction') or '').lower()
        if 'двоеточи' in instr_raw:
            q['instruction'] = 'Найдите предложения, в которых ДВОЕТОЧИЕ ставится в соответствии с одним и тем же правилом пунктуации. Запишите номера этих предложений.'
            q['rule'] = 'Пунктуационный анализ текста: постановка ДВОЕТОЧИЯ по единому правилу синтаксиса.'
        elif 'тире' in instr_raw:
            q['instruction'] = 'Найдите предложения, в которых ТИРЕ ставится в соответствии с одним и тем же правилом пунктуации. Запишите номера этих предложений.'
            q['rule'] = 'Пунктуационный анализ текста: постановка ТИРЕ по единому правилу синтаксиса.'
        else:
            q['instruction'] = 'Найдите предложения, в которых ЗАПЯТАЯ(-ЫЕ) ставится(-ятся) в соответствии с одним и тем же правилом пунктуации. Запишите номера этих предложений.'
            q['rule'] = 'Пунктуационный анализ текста: постановка ЗАПЯТОЙ(-ЫХ) по единому правилу синтаксиса.'
    elif task == '22':
        q['instruction'] = 'Установите соответствие между предложениями (выделенными фразами) и средствами выразительности: к каждой позиции первого столбца подберите соответствующую позицию из второго столбца.'
        q['rule'] = 'Языковые средства выразительности: распознавание тропов, фигур речи, лексических и синтаксических средств.'

    return q

def main():
    print('Starting Master Heal of Formulations, Answers, Rules and Sources...')
    pub_path = 'public/data/fipiTasksBank.json'
    with open(pub_path, 'r', encoding='utf-8') as f:
        bank = json.load(f)

    healed_bank = []
    for q in bank:
        healed_bank.append(heal_question(q))

    with open(pub_path, 'w', encoding='utf-8') as f:
        json.dump(healed_bank, f, ensure_ascii=False, indent=2)
    print(f'Saved {len(healed_bank)} healed tasks to {pub_path}.')

    pub_915_path = 'public/data/fipiTasksBank9_15.json'
    with open(pub_915_path, 'w', encoding='utf-8') as f:
        json.dump(healed_bank, f, ensure_ascii=False, indent=2)
    print(f'Saved {len(healed_bank)} healed tasks to {pub_915_path}.')

    # Now heal starterBank.json
    sb_path = 'src/data/starterBank.json'
    with open(sb_path, 'r', encoding='utf-8') as f:
        starter = json.load(f)

    healed_lookup = {q['id']: q for q in healed_bank}
    healed_sb_fipi = []
    for q in starter.get('fipi', []):
        qid = q.get('id')
        if qid in healed_lookup:
            healed_sb_fipi.append(healed_lookup[qid])
        else:
            healed_sb_fipi.append(heal_question(q))

    starter['fipi'] = healed_sb_fipi

    # Save minified starterBank
    with open(sb_path, 'w', encoding='utf-8') as f:
        json.dump(starter, f, ensure_ascii=False, separators=(',', ':'))

    size_kb = os.path.getsize(sb_path) / 1024
    print(f'Saved starterBank.json ({size_kb:.1f} KB, limit: 500 KB).')

if __name__ == '__main__':
    main()
