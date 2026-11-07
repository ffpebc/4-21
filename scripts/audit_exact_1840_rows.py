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
        
        parts = re.split(r'\.\s*;\s*(?=«)', expl)
        if len(parts) != 2:
            anomalies.append((qid, ridx, "Explanation parts != 2", len(parts)))
            continue
            
        for sidx in (0, 1):
            let = letters[sidx]
            ep = parts[sidx]
            m = re.search(r'^«([^»]+)»', ep)
            if not m:
                anomalies.append((qid, ridx, sidx+1, "No leading word in quotes", ep[:60]))
                continue
            word = m.group(1)
            
            # 1. If let == СЛИТНО, word should NOT have space or hyphen
            if let == 'СЛИТНО' and (' ' in word or '-' in word):
                anomalies.append((qid, ridx, sidx+1, word, let, "Has space/hyphen but marked СЛИТНО", raw))
            # 2. If let == ДЕФИСНО, word MUST have hyphen
            elif let == 'ДЕФИСНО' and ('-' not in word):
                anomalies.append((qid, ridx, sidx+1, word, let, "No hyphen but marked ДЕФИСНО", raw))
            # 3. If let == РАЗДЕЛЬНО, word MUST have space
            elif let == 'РАЗДЕЛЬНО' and (' ' not in word):
                anomalies.append((qid, ridx, sidx+1, word, let, "No space but marked РАЗДЕЛЬНО", raw))
                
            # 4. Check whether explanation text agrees with let:
            if let == 'СЛИТНО' and 'пишется СЛИТНО' not in ep:
                anomalies.append((qid, ridx, sidx+1, word, let, "Expl does not say 'пишется СЛИТНО'", ep[:80]))
            elif let == 'ДЕФИСНО' and 'пишется ЧЕРЕЗ ДЕФИС' not in ep:
                anomalies.append((qid, ridx, sidx+1, word, let, "Expl does not say 'пишется ЧЕРЕЗ ДЕФИС'", ep[:80]))
            elif let == 'РАЗДЕЛЬНО' and 'пишется РАЗДЕЛЬНО' not in ep:
                anomalies.append((qid, ridx, sidx+1, word, let, "Expl does not say 'пишется РАЗДЕЛЬНО'", ep[:80]))

print(f"Total anomalies across all 3,680 words: {len(anomalies)}")
for a in anomalies:
    print("ANOMALY:", a)
