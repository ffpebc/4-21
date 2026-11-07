import json
import re
import sys
import subprocess
from pathlib import Path

# 1. Load app bank
with open('public/data/fipiTasksBank.json', 'r', encoding='utf-8') as f:
    app_bank = json.load(f)

t14_app = [q for q in app_bank if str(q.get('task')) == '14']
print(f"Loaded {len(t14_app)} Task 14 questions from app bank.")

# 2. Load 432f74b
raw_432 = subprocess.check_output(['git', 'show', '432f74b:src/data/fipiTasksBank9_15.json']).decode('utf-8')
orig_432 = {q['id']: q for q in json.loads(raw_432) if str(q.get('task')) == '14'}

# 3. Load NeoFamily cache
with open('.cache/neofamily_4_22.json', 'r', encoding='utf-8') as f:
    nf = json.load(f)
nf_14 = {str(item.get('id') or item.get('task_id')): item for item in nf.get('14', [])}

# 4. Load Shkolkovo DB
import sqlite3
conn = sqlite3.connect('/home/sergei/ege_trainer/ege_trainer.db')
cur = conn.cursor()
cur.execute('''
    SELECT k.id, k.body_html, k.solution_html, k.answer_text, th.name
    FROM tasks k
    JOIN themes th ON k.theme_id = th.id
    JOIN parent_topics p ON th.parent_topic_id = p.id
    WHERE p.subject_id = 2 AND p.exam_position = 14
''')
shk_db_14 = {str(row[0]): row for row in cur.fetchall()}
conn.close()

print(f"Loaded {len(orig_432)} from 432f74b, {len(nf_14)} from NeoFamily, {len(shk_db_14)} from Shkolkovo DB.")

