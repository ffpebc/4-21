#!/usr/bin/env python3
import json
import re
import os

def heal_text(s: str) -> str:
    if not isinstance(s, str):
        return s
    # Collapse multiple consecutive opening/closing parens
    s = re.sub(r'\({2,}', '(', s)
    s = re.sub(r'\){2,}', ')', s)
    # Fix nested parens like ((foo) (bar)) -> (foo bar) or ((foo)) -> (foo)
    s = re.sub(r'\(\s*\(([^()]+)\)\s*\(([^()]+)\)\s*\)', r'(\1 \2)', s)
    s = re.sub(r'\(\(([^()]+)\)\)', r'(\1)', s)
    s = re.sub(r'\(\(([^()]+)\)', r'(\1)', s)
    return s

def heal_obj(obj):
    if isinstance(obj, str):
        return heal_text(obj)
    if isinstance(obj, list):
        return [heal_obj(x) for x in obj]
    if isinstance(obj, dict):
        return {k: heal_obj(v) for k, v in obj.items()}
    return obj

data_dirs = ['public/data', 'dist/data']
files_to_heal = [
    'fipiTasksBank.json',
    'fipiTasksBank9_15.json',
    'sprintBank.json',
    'sprintBank9_15.json',
    'allWordsBank.json',
    'allWordsBank9_15.json'
]

total_healed = 0

for d in data_dirs:
    for f in files_to_heal:
        p = os.path.join(d, f)
        if not os.path.exists(p):
            continue
        print(f"Healing {p}...")
        with open(p, 'r', encoding='utf-8') as fh:
            raw = fh.read()
        
        # Check double parens count before
        before_cnt = len(re.findall(r'\(\(', raw))
        
        data = json.loads(raw)
        healed_data = heal_obj(data)
        
        out_raw = json.dumps(healed_data, ensure_ascii=False, indent=2)
        after_cnt = len(re.findall(r'\(\(', out_raw))
        
        with open(p, 'w', encoding='utf-8') as fh:
            fh.write(out_raw)
        
        print(f"  {p}: double parens {before_cnt} -> {after_cnt}")
        total_healed += (before_cnt - after_cnt)

print(f"Done! Total double parens fixed in JSON data files: {total_healed}")
