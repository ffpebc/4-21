import json
import sqlite3
import re
import html
from collections import defaultdict

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

def extract_primary_task21_sentences(body_html: str) -> dict[int, str]:
    txt = clean_html_text(body_html)
    txt = txt.replace("(З)", "(3)").replace("(з)", "(3)")
    txt = re.sub(r"(?:^|\n)\s*([1-9])\)\s*", r"\n(\1) ", txt)
    lines = [
        ln for ln in txt.splitlines()
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

with open('public/data/fipiTasksBank.json', 'r', encoding='utf-8') as f:
    fipi = json.load(f)
t21_list = [q for q in fipi if str(q.get('task')) == '21']

with open('.cache/neofamily_4_22.json', 'r', encoding='utf-8') as f:
    nf_raw = json.load(f)
nf_map = {str(item['id']): item for item in nf_raw.get('21', [])}

db_map = {}
con = sqlite3.connect('/home/sergei/ege_trainer/ege_trainer.db')
cur = con.cursor()
cur.execute('SELECT t.id, t.source_name, t.body_html, t.solution_html, t.answer_text FROM tasks t JOIN themes th ON t.theme_id = th.id WHERE th.subject_id = 2')
for row in cur.fetchall():
    db_map[str(row[0])] = {
        'id': str(row[0]),
        'source_name': row[1],
        'body_html': row[2] or '',
        'solution_html': row[3] or '',
        'answer_text': row[4] or ''
    }
con.close()

diff_count = 0
for q in t21_list:
    qid = q['id']
    raw_id = qid.split('-')[-1]
    if qid.startswith('nf-'):
        prim = nf_map.get(raw_id)
        prim_body = prim.get('question', '') if prim else ''
    else:
        prim = db_map.get(raw_id)
        prim_body = prim.get('body_html', '') if prim else ''
    
    prim_sents = extract_primary_task21_sentences(prim_body)
    app_rows = q.get('rows', [])
    
    # Check each sentence
    for snum, p_sent in prim_sents.items():
        if snum > len(app_rows):
            print(f'{qid}: Sentence {snum} missing from app! App only has {len(app_rows)} rows')
            diff_count += 1
            continue
        app_sent = app_rows[snum - 1]['words'][0]
        # Normalize and compare
        norm_p = norm_yo(re.sub(r'\s+', ' ', p_sent).strip())
        norm_a = norm_yo(re.sub(r'\s+', ' ', app_sent).strip())
        # Strip leading numbers
        norm_p_clean = re.sub(r'^\(\d+\)\s*', '', norm_p)
        norm_a_clean = re.sub(r'^\(\d+\)\s*', '', norm_a)
        if norm_p_clean != norm_a_clean:
            # Check length diff
            if abs(len(norm_p_clean) - len(norm_a_clean)) > 5 or norm_p_clean[:30] != norm_a_clean[:30]:
                print(f'{qid} S{snum} MISMATCH:')
                print(f'  Prim: {p_sent[:100]}')
                print(f'  App:  {app_sent[:100]}')
                diff_count += 1

print(f'Total significant sentence mismatches: {diff_count}')
