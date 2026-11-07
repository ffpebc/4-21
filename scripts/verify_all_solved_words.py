import json
import re

with open('public/data/fipiTasksBank.json', 'r', encoding='utf-8') as f:
    app_bank = json.load(f)
t14_app = [q for q in app_bank if str(q.get('task')) == '14']

words_by_letter = {'СЛИТНО': set(), 'ДЕФИСНО': set(), 'РАЗДЕЛЬНО': set()}

# In each row, extract the two solved tokens
for q in t14_app:
    for ridx, r in enumerate(q['rows'], 1):
        letters = [x.strip() for x in r['letter'].split('/')]
        expl = r['explanation']
        # explanation usually contains: «WORD» — ...; «WORD» — ...
        matches = re.findall(r'«([^»]+)»', expl)
        if len(matches) >= 2:
            w1, w2 = matches[0], matches[1]
            words_by_letter[letters[0]].add((w1, q['id'], ridx, 1))
            words_by_letter[letters[1]].add((w2, q['id'], ridx, 2))

print(f"Total solved words: СЛИТНО={len(words_by_letter['СЛИТНО'])}, ДЕФИСНО={len(words_by_letter['ДЕФИСНО'])}, РАЗДЕЛЬНО={len(words_by_letter['РАЗДЕЛЬНО'])}")

# Check for anomalies:
# 1. Any word classified as СЛИТНО that has spaces or hyphens
for w, qid, ridx, widx in words_by_letter['СЛИТНО']:
    if ' ' in w or '-' in w:
        print(f"ANOMALY in СЛИТНО: {w} in {qid} R{ridx}")

# 2. Any word classified as ДЕФИСНО that does NOT have a hyphen
for w, qid, ridx, widx in words_by_letter['ДЕФИСНО']:
    if '-' not in w:
        print(f"ANOMALY in ДЕФИСНО: {w} in {qid} R{ridx}")

# 3. Any word classified as РАЗДЕЛЬНО that does NOT have spaces (or is not multi-word)
for w, qid, ridx, widx in words_by_letter['РАЗДЕЛЬНО']:
    if ' ' not in w:
        print(f"ANOMALY in РАЗДЕЛЬНО: {w} in {qid} R{ridx}")

