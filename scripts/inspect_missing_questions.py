import json
import sqlite3
import re
import html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

with open(ROOT / "public/data/fipiTasksBank9_15.json", "r", encoding="utf-8") as f:
    app_bank = json.load(f)

app_t4_ids = set(q["id"] for q in app_bank if str(q.get("task")) == "4")

# Load NF raw
with open(ROOT / ".cache/neofamily_4_22.json", "r", encoding="utf-8") as f:
    nf = json.load(f)

missing_nf = []
for item in nf.get("4", []):
    item_id = item.get("id") or item.get("task_id")
    qid = f"nf-4-{item_id}"
    if qid not in app_t4_ids:
        missing_nf.append((qid, item))

print(f"Missing NF questions: {len(missing_nf)}")
for qid, item in missing_nf:
    print(f"\nMissing NF: {qid}")
    print("Question raw:", repr(item.get("question", "")[:200]))
    print("Answer:", item.get("answer"))

# Load Shkolkovo raw
conn = sqlite3.connect("/home/sergei/ege_trainer/ege_trainer.db")
cur = conn.cursor()
cur.execute("""
    SELECT k.id, k.body_html, k.solution_html, k.answer_text, th.name
    FROM tasks k
    JOIN themes th ON k.theme_id = th.id
    JOIN parent_topics p ON th.parent_topic_id = p.id
    WHERE p.subject_id = 2 AND p.exam_position = 4 AND k.answer_text IS NOT NULL AND k.answer_text != ''
""")
missing_shk = []
for row in cur.fetchall():
    qid = f"shk-4-{row[0]}"
    if qid not in app_t4_ids:
        missing_shk.append((qid, row))
conn.close()

print(f"\nMissing Shkolkovo questions: {len(missing_shk)}")
for qid, row in missing_shk[:10]:
    print(f"\nMissing Shk: {qid} ({row[4]})")
    print("Body raw:", repr(row[1][:200]))
    print("Answer text:", repr(row[3]))
