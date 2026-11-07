import json
import sqlite3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 1. Load app bank
with open(ROOT / "public/data/fipiTasksBank9_15.json", "r", encoding="utf-8") as f:
    app_bank = json.load(f)

app_t4 = {q["id"]: q for q in app_bank if str(q.get("task")) == "4"}
print(f"App Task 4 total questions: {len(app_t4)}")

# 2. Load NeoFamily
with open(ROOT / ".cache/neofamily_4_22.json", "r", encoding="utf-8") as f:
    nf = json.load(f)

nf_raw = {}
for item in nf.get("4", []):
    item_id = item.get("id") or item.get("task_id")
    nf_raw[f"nf-4-{item_id}"] = item

# 3. Load Shkolkovo
conn = sqlite3.connect("/home/sergei/ege_trainer/ege_trainer.db")
cur = conn.cursor()
cur.execute("""
    SELECT k.id, k.body_html, k.solution_html, k.answer_text, th.name
    FROM tasks k
    JOIN themes th ON k.theme_id = th.id
    JOIN parent_topics p ON th.parent_topic_id = p.id
    WHERE p.subject_id = 2 AND p.exam_position = 4 AND k.answer_text IS NOT NULL AND k.answer_text != ''
""")
shk_raw = {}
for row in cur.fetchall():
    shk_raw[f"shk-4-{row[0]}"] = row
conn.close()

print(f"NF raw available: {len(nf_raw)}")
print(f"Shkolkovo raw available: {len(shk_raw)}")

app_nf = [qid for qid in app_t4 if qid.startswith("nf-")]
app_shk = [qid for qid in app_t4 if qid.startswith("shk-")]

matched_nf = [qid for qid in app_nf if qid in nf_raw]
matched_shk = [qid for qid in app_shk if qid in shk_raw]
unmatched = [qid for qid in app_t4 if qid not in nf_raw and qid not in shk_raw]

print(f"Matched NF: {len(matched_nf)} / {len(app_nf)}")
print(f"Matched Shkolkovo: {len(matched_shk)} / {len(app_shk)}")
print(f"Unmatched in app: {len(unmatched)}")
