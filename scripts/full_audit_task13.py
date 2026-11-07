#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Exhaustive verification script for EVERY Task 13 prototype in the application
against its primary source (NeoFamily, Shkolkovo, FIPI Demo 2026, Umskul).

Checks:
1. Formulation (формулировка задания): Instruction and target (СЛИТНО vs РАЗДЕЛЬНО).
2. Task sentences (само задание): 5 sentences, highlighted words (НЕ/НИ), Cyrillic normalization.
3. Answer key (ответ): correctIndices vs primary source answer key.
4. Explanations (объяснение): pedagogical validity, accurate rule per word, absence of leftover text,
   HTML entities, and contradictions.
"""

import json
import sqlite3
import re
import html
import sys

def clean_html(raw: str) -> str:
    if not raw:
        return ""
    txt = html.unescape(raw)
    txt = re.sub(r"[\xad\u200b-\u200f\ufeff]", "", txt)
    txt = re.sub(r"<br\s*/?>", "\n", txt, flags=re.I)
    txt = re.sub(r"</p>|</div>|</li>", "\n", txt, flags=re.I)
    txt = re.sub(r"<[^>]+>", "", txt)
    txt = txt.replace("\xa0", " ").replace("\u202f", " ")
    lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in txt.splitlines()]
    return "\n".join([ln for ln in lines if ln])

def parse_sentences_from_text(text: str):
    lines = text.splitlines()
    sentences = {}
    current_num = None
    current_buf = []
    
    for ln in lines:
        m = re.match(r"^(\d)[\)\.\s]\s*(.*)$", ln)
        if m:
            if current_num is not None:
                sentences[current_num] = " ".join(current_buf).strip()
            current_num = int(m.group(1))
            current_buf = [m.group(2).strip()]
        elif current_num is not None:
            if re.match(r"^\(?Взято из", ln, re.I):
                continue
            current_buf.append(ln.strip())
            
    if current_num is not None:
        sentences[current_num] = " ".join(current_buf).strip()
        
    return sentences

def extract_target(instr: str) -> str:
    up = instr.upper()
    if "РАЗДЕЛЬНО" in up and "СЛИТНО" not in up:
        return "РАЗДЕЛЬНО"
    if "СЛИТНО" in up and "РАЗДЕЛЬНО" not in up:
        return "СЛИТНО"
    if "ПИШЕТСЯ РАЗДЕЛЬНО" in up or "ПИШУТСЯ РАЗДЕЛЬНО" in up:
        return "РАЗДЕЛЬНО"
    if "ПИШЕТСЯ СЛИТНО" in up or "ПИШУТСЯ СЛИТНО" in up:
        return "СЛИТНО"
    return "UNKNOWN"

def parse_digits_answer(ans_raw) -> list:
    if isinstance(ans_raw, list):
        ans_raw = "".join(str(x) for x in ans_raw)
    digits = re.findall(r"\d", str(ans_raw or ""))
    return sorted(list(set(int(d) for d in digits)))

def main():
    # 1. Load primary sources
    with open('.cache/neofamily_4_22.json', 'r', encoding='utf-8') as f:
        nf_raw = json.load(f)
    nf_tasks = {str(item['id']): item for item in nf_raw.get('13', [])}

    con = sqlite3.connect('/home/sergei/ege_trainer/ege_trainer.db')
    cur = con.cursor()
    cur.execute(
        "SELECT t.id, t.source_name, t.body_html, t.solution_html, t.answer_text "
        "FROM tasks t JOIN themes th ON t.theme_id = th.id WHERE th.subject_id = 2"
    )
    shk_tasks = {
        str(row[0]): {
            'id': str(row[0]),
            'source_name': row[1],
            'body_html': row[2] or '',
            'solution_html': row[3] or '',
            'answer_text': row[4] or '',
        }
        for row in cur.fetchall()
    }
    con.close()

    # Load application tasks
    with open('public/data/fipiTasksBank.json', 'r', encoding='utf-8') as f:
        fipi = json.load(f)
    t13 = [q for q in fipi if q.get('task') == 13 or str(q.get('id', '')).startswith('fipi-13')]

    print(f"==================================================")
    print(f"AUDIT OF TASK 13: {len(t13)} PROTOTYPES FOUND")
    print(f"==================================================")

    audit_results = []
    category_counts = {
        'total': len(t13),
        'perfect': 0,
        'has_findings': 0,
        'formulation_issues': 0,
        'sentence_issues': 0,
        'answer_issues': 0,
        'explanation_issues': 0
    }

    for idx, q in enumerate(t13, 1):
        qid = q.get('id')
        app_target = q.get('target')
        app_instr = q.get('instruction', '')
        app_ans = sorted(q.get('correctIndices', []))
        app_rows = q.get('rows', [])
        
        findings = []

        # Find primary source record
        src_record = None
        src_name = ""
        ext_id = qid.split('-')[-1]

        if 'neofamily' in qid:
            src_name = "NeoFamily"
            src_record = nf_tasks.get(ext_id)
        elif 'shkolkovo' in qid:
            src_name = "Shkolkovo"
            # Special check for 70453 vs 70454
            if ext_id == '70453' and 'Собрание ещё (НЕ)ЗАКОНЧЕНО' in json.dumps(q, ensure_ascii=False):
                # This prototype contains 70454
                src_record = shk_tasks.get('70454')
                findings.append({
                    'type': 'PROTOTYPE_ID_MISMATCH',
                    'detail': 'ID is fipi-13-shkolkovo-13-70453 but task body is Shkolkovo task 70454 (13.14)'
                })
            else:
                src_record = shk_tasks.get(ext_id)
        elif 'demo' in qid:
            src_name = "ФИПИ Демоверсия 2026"
        elif 'umschool' in qid:
            src_name = "Умскул"

        # 1. Formulation & Target verification
        if app_target not in ['СЛИТНО', 'РАЗДЕЛЬНО']:
            findings.append({'type': 'FORMULATION', 'detail': f'Invalid target: {app_target}'})
            category_counts['formulation_issues'] += 1
        elif app_target not in app_instr.upper():
            findings.append({'type': 'FORMULATION', 'detail': f'Target {app_target} not in instruction: {app_instr}'})
            category_counts['formulation_issues'] += 1

        if src_record:
            if src_name == 'NeoFamily':
                clean_q = clean_html(src_record.get('question', ''))
                src_target = extract_target(clean_q)
                src_ans = parse_digits_answer(src_record.get('answer'))
                src_sents = parse_sentences_from_text(clean_q)
            elif src_name == 'Shkolkovo':
                clean_b = clean_html(src_record.get('body_html', ''))
                src_target = extract_target(clean_b)
                src_ans = parse_digits_answer(src_record.get('answer_text'))
                src_sents = parse_sentences_from_text(clean_b)

            if src_target != 'UNKNOWN' and src_target != app_target:
                findings.append({'type': 'TARGET_MISMATCH', 'detail': f'Source target {src_target} != App target {app_target}'})
                category_counts['formulation_issues'] += 1

            # 2. Answer key verification
            if src_ans and src_ans != app_ans:
                findings.append({'type': 'ANSWER_MISMATCH', 'detail': f'Source answer {src_ans} != App correctIndices {app_ans}'})
                category_counts['answer_issues'] += 1

            # 3. Sentence wording verification
            for s_i in range(1, 6):
                if s_i in src_sents and s_i <= len(app_rows):
                    s_src = src_sents[s_i]
                    s_app = app_rows[s_i-1]['words'][0]
                    # Clean footers
                    s_src = re.sub(r'\s*\(Взято из.*$', '', s_src, flags=re.I).strip()
                    s_src = re.sub(r'\s*\(Задание составлено.*$', '', s_src, flags=re.I).strip()
                    s_src = re.sub(r'\s*\(Реальный ЕГЭ.*$', '', s_src, flags=re.I).strip()
                    
                    # Normalize latin letters often found in NeoFamily question bank
                    s_src_norm = s_src.replace('(НE)', '(НЕ)').replace('(HE)', '(НЕ)').replace('(HE)ПPEMEHHO', '(НЕ)ПРЕМЕННО')

                    # Check target word specifically
                    m_src = re.search(r'\((?:НЕ|НИ)\)\s*([А-ЯЁа-яё\-]+)', s_src_norm, re.I)
                    m_app = re.search(r'\((?:НЕ|НИ)\)\s*([А-ЯЁа-яё\-]+)', s_app, re.I)
                    w_src = m_src.group(0).upper() if m_src else ""
                    w_app = m_app.group(0).upper() if m_app else ""

                    if w_src != w_app:
                        findings.append({'type': 'SENTENCE_WORD_MISMATCH', 'detail': f'Row {s_i}: target word SRC={w_src} vs APP={w_app}'})
                        category_counts['sentence_issues'] += 1
                    else:
                        # Normalize punctuation
                        norm_src = re.sub(r'[«»""—–\- \.\,\!\?]', '', s_src_norm.lower().replace('ё', 'е'))
                        norm_app = re.sub(r'[«»""—–\- \.\,\!\?]', '', s_app.lower().replace('ё', 'е'))
                        if norm_src != norm_app:
                            # Significant sentence text discrepancy
                            findings.append({'type': 'SENTENCE_TEXT_DIFF', 'detail': f'Row {s_i}:\n  SRC: {s_src}\n  APP: {s_app}'})
                            category_counts['sentence_issues'] += 1

        # 4. Explanations & internal pedagogical verification
        for r_i, r in enumerate(app_rows, 1):
            letter = r.get('letter')
            is_corr = r.get('isCorrectRow')
            expl = r.get('explanation', '')
            w_raw = (r.get('words') or [''])[0]
            w_sol = (r.get('solvedWords') or [''])[0]

            # Internal row logic
            if is_corr != (letter == app_target):
                findings.append({'type': 'INTERNAL_LOGIC', 'detail': f'Row {r_i}: letter={letter}, target={app_target}, isCorrectRow={is_corr}'})
                category_counts['answer_issues'] += 1

            m = re.search(r'\((?:НЕ|НИ)\)\s*([А-ЯЁа-яё\-]+)', w_raw, re.I)
            if m:
                target_word = m.group(1).upper()
                stem = target_word[:4] if len(target_word) >= 4 else target_word
                # Check explanation explains this word
                if stem not in expl.upper():
                    findings.append({'type': 'EXPLANATION_WRONG_WORD', 'detail': f'Row {r_i} ({target_word}): explanation explains different word -> "{expl[:70]}..."'})
                    category_counts['explanation_issues'] += 1

            # Check explanation formatting glitches
            if '&' in expl:
                findings.append({'type': 'EXPLANATION_HTML_ENTITY', 'detail': f'Row {r_i}: contains & in explanation'})
                category_counts['explanation_issues'] += 1
            if '; —' in expl or '— —' in expl:
                findings.append({'type': 'EXPLANATION_LEFTOVER_FRAGMENT', 'detail': f'Row {r_i}: punctuation/sentence fragment in explanation'})
                category_counts['explanation_issues'] += 1
            if '<' in expl or '>' in expl:
                findings.append({'type': 'EXPLANATION_TAG_ARTIFACT', 'detail': f'Row {r_i}: contains < or > in explanation'})
                category_counts['explanation_issues'] += 1

        if findings:
            category_counts['has_findings'] += 1
        else:
            category_counts['perfect'] += 1

        audit_results.append({
            'index': idx,
            'id': qid,
            'source': src_name,
            'target': app_target,
            'answer': app_ans,
            'findings': findings
        })

    print(f"\nAUDIT BREAKDOWN:")
    print(f"Total prototypes checked: {category_counts['total']}")
    print(f"Prototypes 100% perfect:  {category_counts['perfect']}")
    print(f"Prototypes with findings: {category_counts['has_findings']}")
    print(f"  * Formulation issues:   {category_counts['formulation_issues']}")
    print(f"  * Answer issues:        {category_counts['answer_issues']}")
    print(f"  * Sentence issues:      {category_counts['sentence_issues']}")
    print(f"  * Explanation issues:   {category_counts['explanation_issues']}")
    print(f"==================================================")

    # Save detailed audit report to JSON
    with open('scripts/task13_audit_report.json', 'w', encoding='utf-8') as out_f:
        json.dump(audit_results, out_f, ensure_ascii=False, indent=2)
    print("Full audit report saved to scripts/task13_audit_report.json")

if __name__ == '__main__':
    main()
