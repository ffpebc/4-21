import json
import re
import subprocess

raw_432 = subprocess.check_output(['git', 'show', '432f74b:src/data/fipiTasksBank9_15.json']).decode('utf-8')
orig_432 = {q['id']: q for q in json.loads(raw_432) if str(q.get('task')) == '14'}

with open('public/data/fipiTasksBank.json', 'r', encoding='utf-8') as f:
    app_bank = json.load(f)
t14_app = [q for q in app_bank if str(q.get('task')) == '14']

def norm(s):
    return s.replace('ё', 'е').replace('Ё', 'Е').upper()

def extract_slots(sent):
    # normalize brackets
    slots = re.findall(r'\(В\)КОНЦЕ КОНЦОВ|[А-ЯЁ]*\([А-ЯЁ\s-]+\)[А-ЯЁ]*', sent)
    return [s for s in slots if re.search(r'[А-ЯЁ]{2,}', re.sub(r'[()\s-]', '', s))]

def determine_spelling_from_expl(slot, expl):
    # Slot parts, e.g. "(ПО)ЭТОМУ" -> ["ПО", "ЭТОМУ"]
    parts = [p.strip(" -") for p in re.split(r"[()\s]+", slot) if p.strip(" -")]
    if not parts:
        return None
    slitno = "".join(parts)
    defis = "-".join(parts)
    razdel = " ".join(parts)
    
    # check in expl
    expl_u = norm(expl)
    
    # Check explicit patterns like "ЧЕРЕЗ ДЕФИС", "РАЗДЕЛЬНО", "СЛИТНО"
    # Often the explanation starts with the word or has "СЛИТНО", "РАЗДЕЛЬНО", "ЧЕРЕЗ ДЕФИС"
    # Let's search for mentions of slitno, defis, razdel
    pass

# Let's see what current app has for letter on each row
mismatches_app_vs_correct = []
for q in t14_app:
    target = q['target'] # СЛИТНО, ДЕФИСНО, РАЗДЕЛЬНО
    for ridx, r in enumerate(q['rows'], 1):
        letters = [x.strip() for x in r['letter'].split('/')]
        is_correct = ridx in q['correctIndices']
        both_target = len(letters) == 2 and letters[0] == target and letters[1] == target
        if is_correct != both_target:
            mismatches_app_vs_correct.append((q['id'], ridx, target, letters, is_correct, both_target, r['words'][0]))

print(f"Current app: rows where (letter == target) != isCorrectRow: {len(mismatches_app_vs_correct)}")
if mismatches_app_vs_correct:
    for m in mismatches_app_vs_correct[:10]:
        print("  Mismatch:", m)
