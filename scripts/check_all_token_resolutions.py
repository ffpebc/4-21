import json
import re
import subprocess
import html

raw_432 = subprocess.check_output(['git', 'show', '432f74b:src/data/fipiTasksBank9_15.json']).decode('utf-8')
orig_432 = {q['id']: q for q in json.loads(raw_432) if str(q.get('task')) == '14'}

with open('public/data/fipiTasksBank.json', 'r', encoding='utf-8') as f:
    app_bank = json.load(f)
t14_app = [q for q in app_bank if str(q.get('task')) == '14']

def clean_txt(s):
    if not s: return ""
    s = html.unescape(s)
    s = s.replace('&ldquо;', '«').replace('&rdquо;', '»').replace('&sну;', '').replace('&амр;#х2013;">', '—')
    s = s.replace('&amp;#x2013;">', '—').replace('&nbsp;', ' ')
    return s

# Let's inspect all tokens in the app bank
errors = []

for q in t14_app:
    qid = q['id']
    target = q['target']
    correct_indices = q['correctIndices']
    oq = orig_432.get(qid)
    
    for ridx, r in enumerate(q['rows'], 1):
        raw_sent = r['words'][0]
        solved_sent = r['solvedWords'][0]
        letters = [x.strip() for x in r['letter'].split('/')]
        is_correct = r['isCorrectRow']
        
        # Check if isCorrect matches target and letters
        expected_correct = (letters[0] == target and letters[1] == target)
        if is_correct != expected_correct:
            errors.append((qid, ridx, 'isCorrectRow mismatch', is_correct, expected_correct))
        if (ridx in correct_indices) != is_correct:
            errors.append((qid, ridx, 'correctIndices mismatch', ridx in correct_indices, is_correct))

print(f"Internal consistency errors: {len(errors)}")

