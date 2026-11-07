import json
import re
import subprocess
import html

# Load banks
with open('public/data/fipiTasksBank.json', 'r', encoding='utf-8') as f:
    fipi_bank = json.load(f)
with open('public/data/sprintBank.json', 'r', encoding='utf-8') as f:
    sprint_bank = json.load(f)
with open('src/data/starterBank.json', 'r', encoding='utf-8') as f:
    starter_bank = json.load(f)

raw_432 = subprocess.check_output(['git', 'show', '432f74b:src/data/fipiTasksBank9_15.json']).decode('utf-8')
orig_432 = {q['id']: q for q in json.loads(raw_432) if str(q.get('task')) == '14'}

def clean_sentence_text(txt: str) -> str:
    txt = txt.replace('&ldquо;', '«').replace('&rdquо;', '»')
    txt = txt.replace('&amp;#x2013;">', '—').replace('&амр;#х2013;">', '—')
    txt = txt.replace('&sну;', '')
    txt = re.sub(r'\(ПО\)СВОЕМУ\)\.', '(ПО)СВОЕМУ.', txt)
    txt = re.sub(r'ПО-СВОЕМУ\)\.', 'ПО-СВОЕМУ.', txt)
    # Fix corrupted words in 29663
    txt = txt.replace('хлынул', 'хлынул').replace('хлы&sну;нул', 'хлынул')
    txt = txt.replace('бы&sну;ва&sну;ет', 'бывает').replace('бывает', 'бывает')
    txt = txt.replace('(ЗА)ЧА&sну;СТУЮ', '(ЗА)ЧАСТУЮ').replace('ЗАЧА&sну;СТУЮ', 'ЗАЧАСТУЮ')
    txt = txt.replace('(ПО)НЕ&sну;МНО&sну;ГУ', '(ПО)НЕМНОГУ').replace('ПОНЕ&sну;МНО&sну;ГУ', 'ПОНЕМНОГУ')
    txt = txt.replace('про&sну;дви&sну;га&sну;лись', 'продвигались')
    txt = txt.replace('впе&sну;ред', 'вперёд').replace('пре&sну;жде', 'прежде')
    return txt

cleaned_sentences = 0
for q in fipi_bank:
    if str(q.get('task')) != '14':
        continue
    for r in q['rows']:
        old_w = r['words'][0]
        old_s = r['solvedWords'][0]
        new_w = clean_sentence_text(old_w)
        new_s = clean_sentence_text(old_s)
        if new_w != old_w or new_s != old_s:
            r['words'] = [new_w]
            r['solvedWords'] = [new_s]
            cleaned_sentences += 1

print(f"Cleaned {cleaned_sentences} corrupted sentences.")

# Fix fipi-14-neofamily-14-49857 Row 1
q_49857 = next(q for q in fipi_bank if q['id'] == 'fipi-14-neofamily-14-49857')
r1_49857 = q_49857['rows'][0]
r1_49857['words'] = ['(ПО)МНЕНИЮ учителей, Мария получит отличные оценки, (ТАК)КАК она учится очень хорошо.']
r1_49857['solvedWords'] = ['ПО МНЕНИЮ учителей, Мария получит отличные оценки, ТАК КАК она учится очень хорошо.']
r1_49857['letter'] = 'РАЗДЕЛЬНО / РАЗДЕЛЬНО'
r1_49857['explanation'] = '«ПО МНЕНИЮ» — вводное сочетание (предлог ПО с существительным); пишется раздельно; поэтому пишется РАЗДЕЛЬНО — «ПО МНЕНИЮ».; «ТАК КАК» — наречное сочетание / составной союз; всегда пишется раздельно; поэтому пишется РАЗДЕЛЬНО — «ТАК КАК».'

# Fix fipi-14-neofamily-14-49007 Row 1 & Row 4
q_49007 = next(q for q in fipi_bank if q['id'] == 'fipi-14-neofamily-14-49007')
r1_49007 = q_49007['rows'][0]
r1_49007['words'] = ['Отец и сын, казалось, поругались (НА)СМЕРТЬ, наговорив (С)ГОРЯЧА друг другу обидных слов.']
r1_49007['solvedWords'] = ['Отец и сын, казалось, поругались НАСМЕРТЬ, наговорив СГОРЯЧА друг другу обидных слов.']
r1_49007['explanation'] = '«НАСМЕРТЬ» — наречие; пишется слитно; поэтому пишется СЛИТНО — «НАСМЕРТЬ».; «СГОРЯЧА» — наречие, образованное от прилагательного приставочно-суффиксальным способом; пишется слитно; поэтому пишется СЛИТНО — «СГОРЯЧА».'

r4_49007 = q_49007['rows'][3]
r4_49007['words'] = ['(ОТ)ЧАСТИ ваша гипотеза является верной, но указывать на слабые места я (ПО)ПРОСТУ не желаю.']
r4_49007['solvedWords'] = ['ОТЧАСТИ ваша гипотеза является верной, но указывать на слабые места я ПОПРОСТУ не желаю.']
r4_49007['explanation'] = '«ОТЧАСТИ» — наречие; пишется слитно; поэтому пишется СЛИТНО — «ОТЧАСТИ».; «ПОПРОСТУ» — наречие с приставкой ПО- (на -у, не на -ому/-ему/-ски); пишется слитно; поэтому пишется СЛИТНО — «ПОПРОСТУ».'

# Enhance explanations from orig_432 where generic fallback was used
enhanced_expls = 0
for q in fipi_bank:
    if str(q.get('task')) != '14':
        continue
    oq = orig_432.get(q['id'])
    if not oq:
        continue
    for ridx, (r, orow) in enumerate(zip(q['rows'], oq['rows']), 1):
        expl = r['explanation']
        if 'в соответствии с орфографической нормой' in expl or 'представляет собой раздельное сочетание слов' in expl:
            o_expl = orow.get('explanation', '')
            parts = re.split(r'\.\s*;\s*(?=«)', expl)
            letters = [x.strip() for x in r['letter'].split('/')]
            new_parts = []
            for sidx, p in enumerate(parts):
                let = letters[sidx]
                label_text = "ЧЕРЕЗ ДЕФИС" if let == "ДЕФИСНО" else let
                m = re.search(r'^«([^»]+)»', p)
                if not m:
                    new_parts.append(p)
                    continue
                w = m.group(1)
                
                # Check if this specific part had generic fallback
                if 'в соответствии с орфографической нормой' in p or 'представляет собой раздельное сочетание слов' in p:
                    # Look for authentic explanation in o_expl
                    # Extract sentence or clause from o_expl discussing w
                    w_esc = re.escape(w.replace('-', '[-]'))
                    m_auth = re.search(r'(?:[1-5]\)\s*)?(?:[А-ЯЁа-яё\s«»"\'()-]*?\b)?' + w_esc + r'\b\s*[—–-]\s*([^;.\n]+(?:;[^;.\n]+)?)', o_expl, re.I)
                    if m_auth:
                        reason = m_auth.group(1).strip()
                        # clean html or tags
                        reason = re.sub(r'<[^>]+>', '', reason).strip()
                        # Remove redundant "пишется слитно/раздельно" from reason tail
                        reason = re.sub(r'[,;]?\s*(?:поэтому\s+)?пиш[уе]тся\s+(?:слитно|раздельно|через дефис)\s*$', '', reason, flags=re.I).strip()
                        if len(reason) > 5:
                            enhanced_rule = f"«{w}» — {reason}; поэтому пишется {label_text} — «{w}»."
                            new_parts.append(enhanced_rule)
                            enhanced_expls += 1
                            continue
                new_parts.append(p)
            r['explanation'] = '; '.join(new_parts)

print(f"Enhanced {enhanced_expls} generic explanations with primary source pedagogy.")

# Save public banks
with open('public/data/fipiTasksBank.json', 'w', encoding='utf-8') as f:
    json.dump(fipi_bank, f, ensure_ascii=False, indent=2)
with open('public/data/fipiTasksBank9_15.json', 'w', encoding='utf-8') as f:
    json.dump(fipi_bank, f, ensure_ascii=False, indent=2)

# Update starter bank task 14
starter_t14 = [q for q in fipi_bank if q['id'] in [x['id'] for x in starter_bank.get('fipi', []) if str(x.get('task')) == '14']]
for st_q in starter_bank.get('fipi', []):
    if str(st_q.get('task')) == '14':
        match = next((q for q in fipi_bank if q['id'] == st_q['id']), None)
        if match:
            st_q['rows'] = match['rows']
            st_q['instruction'] = match.get('instruction') or match.get('rule') or ''
            st_q['target'] = match.get('target', 'СЛИТНО')
            st_q['correctIndices'] = match['correctIndices']

with open('src/data/starterBank.json', 'w', encoding='utf-8') as f:
    json.dump(starter_bank, f, ensure_ascii=False, indent=2)

# Sync sprint cards
def sync_sprint_t14(s):
    m = re.match(r"^sp-14-(.+)-r(\d+)-w(\d+)$", s["id"])
    if not m:
        return
    qid = f"fipi-14-{m.group(1)}"
    ridx = int(m.group(2))
    widx = int(m.group(3))
    
    q = next((x for x in fipi_bank if x['id'] == qid), None)
    if not q or ridx > len(q['rows']):
        return
    r = q['rows'][ridx - 1]
    letters = [x.strip() for x in r['letter'].split('/')]
    parts = re.split(r'\.\s*;\s*(?=«)', r['explanation'])
    if widx <= len(letters) and widx <= len(parts):
        s['answer'] = letters[widx - 1]
        s['options'] = ["СЛИТНО", "ДЕФИСНО", "РАЗДЕЛЬНО"]
        s['explanation'] = parts[widx - 1]
        s['rule'] = parts[widx - 1]

sprint_updated = 0
for s in sprint_bank:
    if str(s.get('task')) == '14':
        sync_sprint_t14(s)
        sprint_updated += 1

for s in starter_bank.get('sprint', []):
    if str(s.get('task')) == '14':
        sync_sprint_t14(s)

with open('public/data/sprintBank.json', 'w', encoding='utf-8') as f:
    json.dump(sprint_bank, f, ensure_ascii=False, indent=2)
with open('public/data/sprintBank9_15.json', 'w', encoding='utf-8') as f:
    json.dump(sprint_bank, f, ensure_ascii=False, indent=2)
with open('src/data/starterBank.json', 'w', encoding='utf-8') as f:
    json.dump(starter_bank, f, ensure_ascii=False, indent=2)

print(f"Updated {sprint_updated} Sprint cards for Task 14.")
