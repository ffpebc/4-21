import json
import re

with open('public/data/fipiTasksBank.json', 'r', encoding='utf-8') as f:
    app_bank = json.load(f)
t14_app = [q for q in app_bank if str(q.get('task')) == '14']

anomalies = []

for q in t14_app:
    qid = q['id']
    target = q['target']
    
    for ridx, r in enumerate(q['rows'], 1):
        letters = [x.strip() for x in r['letter'].split('/')]
        raw = r['words'][0]
        solved = r['solvedWords'][0]
        expl = r['explanation']
        
        # split explanation by semicolon
        # e.g. "«ПО-СВИНСКИ» — ...; «В СВЯЗИ» — ..."
        expl_parts = [p.strip() for p in expl.split(';') if p.strip()]
        
        # For each of the 2 slots:
        for sidx in (0, 1):
            let = letters[sidx]
            ep = expl_parts[sidx] if sidx < len(expl_parts) else ""
            m = re.search(r'«([^»]+)»', ep)
            word = m.group(1) if m else "???"
            
            # Check correctness:
            # If let == СЛИТНО: word MUST NOT contain space or hyphen
            if let == 'СЛИТНО' and (' ' in word or '-' in word):
                anomalies.append((qid, ridx, sidx+1, word, let, "Has space or hyphen but marked СЛИТНО", raw))
            # If let == ДЕФИСНО: word MUST contain hyphen
            elif let == 'ДЕФИСНО' and ('-' not in word):
                anomalies.append((qid, ridx, sidx+1, word, let, "No hyphen but marked ДЕФИСНО", raw))
            # If let == РАЗДЕЛЬНО: word MUST contain space
            elif let == 'РАЗДЕЛЬНО' and (' ' not in word):
                anomalies.append((qid, ridx, sidx+1, word, let, "No space but marked РАЗДЕЛЬНО", raw))

print(f"Proper structural anomalies found: {len(anomalies)}")
for a in anomalies:
    print("ANOMALY:", a)
