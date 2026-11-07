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

discrepancies = []

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
            bw, blet, brule, btopic, _ = resolve_t14_token(sl, clean_s)
            
            # Check if blet != curr_let
            if blet != curr_let:
                discrepancies.append({
                    'qid': qid,
                    'ridx': ridx,
                    'sidx': sidx + 1,
                    'target': target,
                    'slot': sl,
                    'curr_let': curr_let,
                    'resolver_let': blet,
                    'resolver_word': bw,
                    'sentence': raw_s,
                    'orig_expl': orig_expl
                })

print(f"Total discrepancies between base_resolver and curr_let: {len(discrepancies)}")

# Group discrepancies by slot
by_slot = {}
for d in discrepancies:
    by_slot.setdefault(d['slot'], []).append(d)

print(f"Unique slots with discrepancies: {len(by_slot)}")
for sl, items in sorted(by_slot.items(), key=lambda x: len(x[1]), reverse=True)[:30]:
    sample = items[0]
    print(f"Slot: {sl:<20} Count: {len(items):<3} App: {sample['curr_let']:<10} Resolver: {sample['resolver_let']:<10}")
