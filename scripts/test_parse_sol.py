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
    
    # Try pattern 1: "(1)... — rule" or "(1) rule"
    p1 = re.compile(r"^\(?(\d{1,2})\)?(?:\s*предложение)?\s*[-–—:.]\s*(.+)$", re.I)
    p2 = re.compile(r"^\((\d{1,2})\)\s*.*?[-–—]\s*(.+)$")
    
    curr_s = None
    curr_text = []
    
    for ln in lines:
        ln_s = ln.strip()
        if not ln_s:
            continue
        # Stop at "Ответ:" or "Источник:"
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

# Test on 10 NF and 10 SHK
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

print("Testing parser on 5 NF questions:")
for q in t21_list[:5]:
    raw_id = q['id'].split('-')[-1]
    sol = clean_html_text(nf_map[raw_id]['solution'])
    parsed = parse_sentence_explanations(sol, len(q['rows']))
    print(q['id'], f"Parsed {len(parsed)} / {len(q['rows'])} sentences:")
    for snum in sorted(parsed.keys()):
        print(f"  ({snum}) {parsed[snum][:60]}")
    print()

print("Testing parser on 5 SHK questions:")
shk_list = [q for q in t21_list if q['id'].startswith('shk-')][:5]
for q in shk_list:
    raw_id = q['id'].split('-')[-1]
    sol = clean_html_text(db_map[raw_id])
    parsed = parse_sentence_explanations(sol, len(q['rows']))
    print(q['id'], f"Parsed {len(parsed)} / {len(q['rows'])} sentences:")
    for snum in sorted(parsed.keys()):
        print(f"  ({snum}) {parsed[snum][:60]}")
    print()
