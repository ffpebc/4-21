import json
import sqlite3
import re
import html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 1. Load app bank
with open(ROOT / "public/data/fipiTasksBank9_15.json", "r", encoding="utf-8") as f:
    app_bank = json.load(f)

app_t4 = [q for q in app_bank if str(q.get("task")) == "4"]
print(f"Loaded {len(app_t4)} Task 4 questions from app bank.")

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

def clean_html(raw_html: str) -> str:
    txt = html.unescape(raw_html or "")
    txt = re.sub(r"<br\s*/?>", "\n", txt, flags=re.I)
    txt = re.sub(r"</p>", "\n", txt, flags=re.I)
    txt = re.sub(r"</div\s*>", "\n", txt, flags=re.I)
    txt = re.sub(r"<li\s*>", "\n", txt, flags=re.I)
    txt = re.sub(r"<[^>]+>", "", txt)
    txt = txt.replace("\xa0", " ").replace("&nbsp;", " ")
    return txt

def extract_rows_from_text(raw_text: str):
    rows = {}
    instr_lines = []
    lines = [ln.strip() for ln in clean_html(raw_text).splitlines() if ln.strip()]
    for ln in lines:
        m = re.match(r"^([1-5])[\)\.]\s*(.+)$", ln)
        if m:
            rows[int(m.group(1))] = m.group(2).strip()
        elif not rows:
            instr_lines.append(ln)
    instr = " ".join(instr_lines).strip()
    return instr, rows

def normalize_ans(ans):
    if isinstance(ans, list):
        ans = "".join(str(x) for x in ans)
    digits = [int(d) for d in re.findall(r"[1-5]", str(ans))]
    return sorted(set(digits))

# Audit results containers
mismatched_instructions = []
mismatched_row_words = []
mismatched_answers = []
internal_consistency_errors = []
explanation_errors = []
missing_primary_source = []

for q in app_t4:
    qid = q["id"]
    app_instr = q.get("instruction", "").strip()
    app_rows = q.get("rows", [])
    app_ans = sorted(q.get("correctIndices", []))
    
    # Check internal consistency: rows count == 5
    if len(app_rows) != 5:
        internal_consistency_errors.append((qid, f"Row count is {len(app_rows)}, expected 5"))
    
    # Check correctIndices against isCorrectRow
    for idx, r in enumerate(app_rows, 1):
        is_ok = r.get("isCorrectRow")
        in_ans = (idx in app_ans)
        if is_ok != in_ans:
            internal_consistency_errors.append((qid, f"Row {idx} isCorrectRow={is_ok} but idx in app_ans is {in_ans}"))
        
        words = r.get("words", [])
        if not words or not words[0].strip():
            internal_consistency_errors.append((qid, f"Row {idx} missing words"))
        
        solved = r.get("solvedWords", [])
        if not solved or not solved[0].strip():
            internal_consistency_errors.append((qid, f"Row {idx} missing solvedWords"))
            
        letter = r.get("letter", "")
        if not letter:
            internal_consistency_errors.append((qid, f"Row {idx} missing letter"))
            
        expl = r.get("explanation", "").strip()
        if not expl:
            explanation_errors.append((qid, idx, "Empty explanation"))

    # Compare with primary source
    raw_instr = ""
    raw_rows = {}
    raw_ans_digits = []
    raw_sol_text = ""

    if qid.startswith("nf-"):
        if qid not in nf_raw:
            missing_primary_source.append(qid)
            continue
        item = nf_raw[qid]
        q_text = item.get("question", "")
        raw_instr, raw_rows = extract_rows_from_text(q_text)
        raw_ans_digits = normalize_ans(item.get("answer", []))
        raw_sol_text = clean_html(item.get("solution", ""))
    elif qid.startswith("shk-"):
        if qid not in shk_raw:
            missing_primary_source.append(qid)
            continue
        row = shk_raw[qid]
        body_html = row[1]
        raw_sol_text = clean_html(row[2])
        ans_txt = row[3]
        raw_instr, raw_rows = extract_rows_from_text(body_html)
        raw_ans_digits = normalize_ans(ans_txt)
    else:
        missing_primary_source.append(qid)
        continue

    # Compare answers
    if app_ans != raw_ans_digits:
        mismatched_answers.append({
            "qid": qid,
            "app_ans": app_ans,
            "raw_ans": raw_ans_digits,
            "source": q.get("source"),
        })

    # Compare row words
    for idx in range(1, 6):
        if idx in raw_rows and idx <= len(app_rows):
            raw_w = raw_rows[idx].strip()
            app_w = app_rows[idx-1]["words"][0].strip()
            # clean any trailing dots or punctuation
            raw_w_clean = re.sub(r"[\.,;]+$", "", raw_w).strip()
            app_w_clean = re.sub(r"[\.,;]+$", "", app_w).strip()
            if raw_w_clean != app_w_clean:
                mismatched_row_words.append({
                    "qid": qid,
                    "row": idx,
                    "app_w": app_w,
                    "raw_w": raw_w,
                })

    # Check formulation / instruction
    # Check if primary source asked for НЕВЕРНО vs ВЕРНО
    raw_instr_lower = raw_instr.lower()
    app_instr_lower = app_instr.lower()
    if "неверно" in raw_instr_lower and "неверно" not in app_instr_lower:
        mismatched_instructions.append({
            "qid": qid,
            "issue": "Primary asked for НЕВЕРНО, but app asked for ВЕРНО",
            "raw_instr": raw_instr,
            "app_instr": app_instr,
        })
    elif "неверно" not in raw_instr_lower and "неверно" in app_instr_lower:
        mismatched_instructions.append({
            "qid": qid,
            "issue": "Primary asked for ВЕРНО, but app asked for НЕВЕРНО",
            "raw_instr": raw_instr,
            "app_instr": app_instr,
        })

print("\n--- AUDIT SUMMARY ---")
print(f"Missing primary source: {len(missing_primary_source)}")
print(f"Internal consistency errors: {len(internal_consistency_errors)}")
print(f"Mismatched instructions: {len(mismatched_instructions)}")
print(f"Mismatched answers: {len(mismatched_answers)}")
print(f"Mismatched row words: {len(mismatched_row_words)}")
print(f"Explanation errors: {len(explanation_errors)}")

if mismatched_answers:
    print(f"\nSample mismatched answers (first 10):")
    for m in mismatched_answers[:10]:
        print(f"  {m['qid']} ({m['source']}): app={m['app_ans']} vs raw={m['raw_ans']}")

if mismatched_row_words:
    print(f"\nSample mismatched row words (first 10):")
    for m in mismatched_row_words[:10]:
        print(f"  {m['qid']} row {m['row']}: app='{m['app_w']}' vs raw='{m['raw_w']}'")

if internal_consistency_errors:
    print(f"\nSample internal errors (first 10):")
    for m in internal_consistency_errors[:10]:
        print(f"  {m}")
