import json
import sqlite3
import re
import html

def clean_html_text(raw_html: str) -> str:
    if not raw_html:
        return ''
    txt = html.unescape(raw_html)
    txt = re.sub(r'[\xad\u200b-\u200f\ufeff]', '', txt)
    txt = re.sub(r'<br\s*/?>', '\n', txt, flags=re.I)
    txt = re.sub(r'</p>|</div>|</li>', '\n', txt, flags=re.I)
    txt = re.sub(r'<[^>]+>', '', txt)
    txt = txt.replace('\xa0', ' ').replace('\u202f', ' ')
    lines = [ln.strip() for ln in txt.splitlines() if ln.strip()]
    return '\n'.join(lines)

def parse_sentence_explanations(sol_text: str, num_sents: int) -> dict[int, str]:
    sent_expl = {}
    lines = sol_text.splitlines()
    
    # Try pattern 1: "(1)... — rule" or "1 - rule" or "1 предложение: rule"
    p1 = re.compile(r"^\(?(\d{1,2})\)?(?:\s*предложение)?\s*[-–—:.]\s*(.+)$", re.I)
    p2 = re.compile(r"^\((\d{1,2})\)\s*.*?[-–—]\s*(.+)$")
    
    curr_s = None
    curr_text = []
    
    for ln in lines:
        ln_s = ln.strip()
        if not ln_s:
            continue
        if re.match(r"^(?:Ответ|Источник)\s*:", ln_s, flags=re.I):
            break
        
        m1 = p1.match(ln_s)
        m2 = p2.match(ln_s)
        matched_s = None
        matched_txt = None
        
        if m2:
            snum = int(m2.group(1))
            if 1 <= snum <= num_sents:
                matched_s = snum
                matched_txt = m2.group(2).strip()
        elif m1:
            snum = int(m1.group(1))
            if 1 <= snum <= num_sents:
                matched_s = snum
                matched_txt = m1.group(2).strip()
        
        if matched_s is not None:
            if curr_s is not None:
                sent_expl[curr_s] = " ".join(curr_text).strip()
            curr_s = matched_s
            curr_text = [matched_txt]
        else:
            if curr_s is not None:
                curr_text.append(ln_s)
    
    if curr_s is not None:
        sent_expl[curr_s] = " ".join(curr_text).strip()
        
    return sent_expl

with open('.cache/neofamily_4_22.json', 'r', encoding='utf-8') as f:
    nf_raw = json.load(f)
nf_map = {str(item['id']): item for item in nf_raw.get('21', [])}

con = sqlite3.connect('/home/sergei/ege_trainer/ege_trainer.db')
cur = con.cursor()
cur.execute('SELECT t.id, t.solution_html FROM tasks t JOIN themes th ON t.theme_id = th.id WHERE th.subject_id = 2')
db_map = {str(row[0]): row[1] for row in cur.fetchall()}
con.close()

with open('public/data/fipiTasksBank.json', 'r', encoding='utf-8') as f:
    fipi = json.load(f)
t21_list = [q for q in fipi if str(q.get('task')) == '21']

total_parsed_sents = 0
total_sents = 0
questions_with_zero_parsed = []

for q in t21_list:
    raw_id = q['id'].split('-')[-1]
    if q['id'].startswith('nf-'):
        sol = clean_html_text(nf_map[raw_id]['solution'])
    else:
        sol = clean_html_text(db_map[raw_id])
    
    num_s = len(q['rows'])
    total_sents += num_s
    parsed = parse_sentence_explanations(sol, num_s)
    total_parsed_sents += len(parsed)
    if len(parsed) == 0:
        questions_with_zero_parsed.append((q['id'], sol[:150]))

print(f"Total Task 21 prototypes: {len(t21_list)}")
print(f"Total sentences: {total_sents}")
print(f"Total per-sentence parsed explanations: {total_parsed_sents}")
print(f"Questions with 0 parsed sentences: {len(questions_with_zero_parsed)}")
for qid, s in questions_with_zero_parsed[:5]:
    print(f"  {qid}: {s}")
