import json
import re
import sys
import subprocess

sys.path.insert(0, 'scripts')
from master_heal_and_audit import resolve_t14_token
from sync_all_banks_to_primary_sources import clean_t14_raw_sentence, extract_t14_slots, split_slot_parts

raw_432 = subprocess.check_output(['git', 'show', '432f74b:src/data/fipiTasksBank9_15.json']).decode('utf-8')
orig_432 = {q['id']: q for q in json.loads(raw_432) if str(q.get('task')) == '14'}

with open('public/data/fipiTasksBank.json', 'r', encoding='utf-8') as f:
    app_bank = json.load(f)
t14_app = [q for q in app_bank if str(q.get('task')) == '14']

mismatches_with_expl = []

for q in t14_app:
    qid = q['id']
    oq = orig_432.get(qid)
    target = q['target']
    
    for ridx, (r, orow) in enumerate(zip(q['rows'], oq['rows'] if oq else q['rows']), 1):
        raw_s = r['words'][0]
        clean_s = clean_t14_raw_sentence(raw_s)
        slots = extract_t14_slots(clean_s)
        curr_letters = [x.strip() for x in r['letter'].split('/')]
        curr_solved = r['solvedWords'][0]
        orig_expl = orow.get('explanation', '')
        
        for sidx, sl in enumerate(slots):
            curr_let = curr_letters[sidx] if sidx < len(curr_letters) else 'UNKNOWN'
            parts = split_slot_parts(sl)
            slitno = "".join(parts)
            defis = "-".join(parts)
            razdel = " ".join(parts)
            
            # Check what orig_expl says about this specific slot
            # Let's find mentions of this slot or its variants in orig_expl
            # e.g. "ЧТО БЫ - раздельно" or "ЧТО БЫ — местоимение" or "ЧТОБЫ — союз"
            expl_says = None
            if re.search(r'\b' + re.escape(slitno) + r'\b[^.?!;]{0,100}\b(слитно|пишется слитно)', orig_expl, re.I):
                expl_says = 'СЛИТНО'
            elif re.search(r'\b' + re.escape(razdel) + r'\b[^.?!;]{0,100}\b(раздельно|пишется раздельно|в два слова|с предлогом)', orig_expl, re.I):
                expl_says = 'РАЗДЕЛЬНО'
            elif re.search(r'\b' + re.escape(defis) + r'\b[^.?!;]{0,100}\b(дефис|через дефис|пишется через дефис)', orig_expl, re.I):
                expl_says = 'ДЕФИСНО'
            
            if expl_says and expl_says != curr_let:
                mismatches_with_expl.append({
                    'qid': qid,
                    'ridx': ridx,
                    'sidx': sidx + 1,
                    'slot': sl,
                    'curr_let': curr_let,
                    'expl_says': expl_says,
                    'sentence': raw_s,
                    'orig_expl': orig_expl
                })

print(f"Cases where curr_let directly contradicts orig_expl: {len(mismatches_with_expl)}")
for m in mismatches_with_expl:
    print(f"QID: {m['qid']} R{m['ridx']} S{m['sidx']} | Slot: {m['slot']} | App: {m['curr_let']} | Expl: {m['expl_says']}")
    print(f"  Sent: {m['sentence']}")
    print(f"  Expl: {m['orig_expl'][:150]}...")
    print()
