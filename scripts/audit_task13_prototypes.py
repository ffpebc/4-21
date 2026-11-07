#!/usr/bin/env python3
# -*- coding: utf-8 -*-

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
    """Parses 1) ... 2) ... 3) ... 4) ... 5) from raw text."""
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
            # Check if this line is footer like (Взято из...)
            if re.match(r"^\(?Взято из", ln, re.I):
                continue
            current_buf.append(ln.strip())
            
    if current_num is not None:
        sentences[current_num] = " ".join(current_buf).strip()
        
    return sentences

def extract_target_from_instruction(instr: str) -> str:
    instr_upper = instr.upper()
    if "РАЗДЕЛЬНО" in instr_upper and "СЛИТНО" not in instr_upper:
        return "РАЗДЕЛЬНО"
    if "СЛИТНО" in instr_upper and "РАЗДЕЛЬНО" not in instr_upper:
        return "СЛИТНО"
    # If both or neither, check context
    if "НЕ/НИ С ВЫДЕЛЕННЫМ СЛОВОМ ПИШЕТСЯ РАЗДЕЛЬНО" in instr_upper or "ПИШЕТСЯ РАЗДЕЛЬНО" in instr_upper:
        return "РАЗДЕЛЬНО"
    if "НЕ/НИ С ВЫДЕЛЕННЫМ СЛОВОМ ПИШЕТСЯ СЛИТНО" in instr_upper or "ПИШЕТСЯ СЛИТНО" in instr_upper:
        return "СЛИТНО"
    return "UNKNOWN"

def parse_digits_answer(ans_raw) -> list:
    if isinstance(ans_raw, list):
        ans_raw = "".join(str(x) for x in ans_raw)
    digits = re.findall(r"\d", str(ans_raw or ""))
    # sorted unique digits
    return sorted(list(set(int(d) for d in digits)))

def run_audit():
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

    print(f"Auditing {len(t13)} prototypes of Task 13...")

    mismatches = []
    discrepancies = {
        'missing_source': [],
        'target_mismatch': [],
        'answer_mismatch': [],
        'sentence_mismatch': [],
        'explanation_flaws': [],
        'internal_logic_flaws': [],
    }

    detailed_report = []

    for idx, q in enumerate(t13, 1):
        qid = q.get('id')
        app_target = q.get('target')
        app_instr = q.get('instruction', '')
        app_ans = sorted(q.get('correctIndices', []))
        app_rows = q.get('rows', [])
        
        # Check source record
        src_record = None
        src_type = None
        ext_id = None
        
        if 'neofamily' in qid:
            src_type = 'NeoFamily'
            ext_id = qid.split('-')[-1]
            src_record = nf_tasks.get(ext_id)
        elif 'shkolkovo' in qid:
            src_type = 'Shkolkovo'
            ext_id = qid.split('-')[-1]
            src_record = shk_tasks.get(ext_id)
        elif 'demo' in qid:
            src_type = 'FIPI Demo 2026'
        elif 'umschool' in qid:
            src_type = 'Umskul'
            
        report_item = {
            'index': idx,
            'id': qid,
            'source_type': src_type,
            'ext_id': ext_id,
            'issues': []
        }

        # 1. Internal logic check
        # target vs instruction
        if app_target not in ['СЛИТНО', 'РАЗДЕЛЬНО']:
            report_item['issues'].append(f"Invalid target: {app_target}")
            discrepancies['internal_logic_flaws'].append((qid, f"Invalid target: {app_target}"))
        if app_target not in app_instr.upper():
            report_item['issues'].append(f"Target '{app_target}' not found in instruction: '{app_instr}'")
            discrepancies['internal_logic_flaws'].append((qid, "Target not in instruction"))

        # Row internal consistency
        row_letters = []
        for r_i, r in enumerate(app_rows, 1):
            letter = r.get('letter')
            is_corr = r.get('isCorrectRow')
            row_letters.append(letter)
            if is_corr != (letter == app_target):
                msg = f"Row {r_i}: letter={letter}, target={app_target}, but isCorrectRow={is_corr}"
                report_item['issues'].append(msg)
                discrepancies['internal_logic_flaws'].append((qid, msg))
                
            # Explanation checks
            expl = r.get('explanation', '')
            w_raw = (r.get('words') or [''])[0]
            w_solv = (r.get('solvedWords') or [''])[0]
            
            # Word extraction
            m = re.search(r'\((?:НЕ|НИ)\)\s*([А-ЯЁа-яё\-]+)', w_raw, re.I)
            if not m:
                msg = f"Row {r_i}: cannot find (НЕ)/(НИ) in words: '{w_raw}'"
                report_item['issues'].append(msg)
                discrepancies['sentence_mismatch'].append((qid, msg))
            else:
                target_word = m.group(1).upper()
                # Check explanation content
                if not expl:
                    msg = f"Row {r_i}: explanation is EMPTY!"
                    report_item['issues'].append(msg)
                    discrepancies['explanation_flaws'].append((qid, msg))
                else:
                    # Does explanation say contradictory conclusion?
                    # e.g. letter is РАЗДЕЛЬНО, but explanation ends with "пишется СЛИТНО"
                    expl_upper = expl.upper()
                    has_split = "РАЗДЕЛЬНО" in expl_upper
                    has_merged = "СЛИТНО" in expl_upper
                    
                    # Look at concluding statement if any: e.g. "пишется с не раздельно", "поэтому пишется СЛИТНО"
                    concl_m = re.findall(r"(?:пишется|пишем)\s+(?:с\s+(?:не|ни)\s+)?(слитно|раздельно)", expl_upper, re.I)
                    if concl_m:
                        last_concl = concl_m[-1].upper()
                        if last_concl != letter:
                            # Contradiction!
                            msg = f"Row {r_i} ({target_word}): explanation says '{last_concl}' but letter is '{letter}'!"
                            report_item['issues'].append(msg)
                            discrepancies['explanation_flaws'].append((qid, msg))
                            
                    # Check if target_word matches explanation
                    stem = target_word[:4] if len(target_word) >= 4 else target_word
                    if stem not in expl_upper:
                        msg = f"Row {r_i}: word '{target_word}' does not match explanation: '{expl[:70]}...'"
                        report_item['issues'].append(msg)
                        discrepancies['explanation_flaws'].append((qid, msg))

        # Check correctIndices matches rows
        calc_corr = [i for i, r in enumerate(app_rows, 1) if r.get('letter') == app_target]
        if app_ans != calc_corr:
            msg = f"correctIndices={app_ans} does not match rows where letter==target: {calc_corr}"
            report_item['issues'].append(msg)
            discrepancies['internal_logic_flaws'].append((qid, msg))

        # 2. Compare against primary source
        if src_record:
            if src_type == 'NeoFamily':
                raw_q = src_record.get('question', '')
                clean_q = clean_html(raw_q)
                src_target = extract_target_from_instruction(clean_q)
                src_ans = parse_digits_answer(src_record.get('answer'))
                src_sentences = parse_sentences_from_text(clean_q)
                
                # Check target
                if src_target != 'UNKNOWN' and src_target != app_target:
                    msg = f"Source target is '{src_target}' but app target is '{app_target}'"
                    report_item['issues'].append(msg)
                    discrepancies['target_mismatch'].append((qid, msg))
                    
                # Check answer
                if src_ans and src_ans != app_ans:
                    msg = f"Source answer is {src_ans} but app correctIndices is {app_ans}"
                    report_item['issues'].append(msg)
                    discrepancies['answer_mismatch'].append((qid, msg))
                    
                # Check sentences
                if len(src_sentences) == 5:
                    for s_num in range(1, 6):
                        s_src = src_sentences.get(s_num, '')
                        if s_num <= len(app_rows):
                            s_app = (app_rows[s_num-1].get('words') or [''])[0]
                            # Compare words in sentence ignoring case and punctuation
                            w1 = "".join(re.findall(r"[А-Яа-яЁёA-Za-z0-9]", s_src.upper()))
                            w2 = "".join(re.findall(r"[А-Яа-яЁёA-Za-z0-9]", s_app.upper()))
                            if w1 != w2:
                                # Minor punctuation or different sentence?
                                msg = f"Sentence {s_num} text discrepancy:\n  SRC: {s_src}\n  APP: {s_app}"
                                report_item['issues'].append(msg)
                                discrepancies['sentence_mismatch'].append((qid, f"Sentence {s_num} mismatch"))
                                
            elif src_type == 'Shkolkovo':
                raw_body = src_record.get('body_html', '')
                clean_b = clean_html(raw_body)
                src_target = extract_target_from_instruction(clean_b)
                src_ans = parse_digits_answer(src_record.get('answer_text'))
                src_sentences = parse_sentences_from_text(clean_b)
                
                # Check target
                if src_target != 'UNKNOWN' and src_target != app_target:
                    msg = f"Source target is '{src_target}' but app target is '{app_target}'"
                    report_item['issues'].append(msg)
                    discrepancies['target_mismatch'].append((qid, msg))
                    
                # Check answer
                if src_ans and src_ans != app_ans:
                    msg = f"Source answer is {src_ans} but app correctIndices is {app_ans}"
                    report_item['issues'].append(msg)
                    discrepancies['answer_mismatch'].append((qid, msg))
                    
                # Check sentences
                if len(src_sentences) == 5:
                    for s_num in range(1, 6):
                        s_src = src_sentences.get(s_num, '')
                        if s_num <= len(app_rows):
                            s_app = (app_rows[s_num-1].get('words') or [''])[0]
                            w1 = "".join(re.findall(r"[А-Яа-яЁёA-Za-z0-9]", s_src.upper()))
                            w2 = "".join(re.findall(r"[А-Яа-яЁёA-Za-z0-9]", s_app.upper()))
                            if w1 != w2:
                                msg = f"Sentence {s_num} text discrepancy:\n  SRC: {s_src}\n  APP: {s_app}"
                                report_item['issues'].append(msg)
                                discrepancies['sentence_mismatch'].append((qid, f"Sentence {s_num} mismatch"))
        else:
            if src_type not in ['FIPI Demo 2026', 'Umskul']:
                discrepancies['missing_source'].append(qid)

        if report_item['issues']:
            detailed_report.append(report_item)

    print("\n" + "="*70)
    print("AUDIT SUMMARY REPORT")
    print("="*70)
    for k, v in discrepancies.items():
        print(f"{k}: {len(v)} occurrences")
    print(f"Total prototypes with any issues: {len(detailed_report)} / {len(t13)}")
    print("="*70)

    for r in detailed_report:
        print(f"\n[{r['id']}] (Source: {r['source_type']})")
        for iss in r['issues']:
            print(f"  * {iss}")

if __name__ == '__main__':
    run_audit()
