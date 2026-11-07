import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT / "scripts"))

from audit_task_4_all import mismatched_row_words, app_t4, nf_raw, shk_raw

by_qid = {}
for m in mismatched_row_words:
    by_qid.setdefault(m["qid"], []).append(m)

print(f"Total mismatched row words: {len(mismatched_row_words)}")
print(f"Unique questions with mismatched words: {len(by_qid)}")

for qid, diffs in by_qid.items():
    app_q = [q for q in app_t4 if q["id"] == qid][0]
    print("\n==========================================")
    src = app_q.get('source')
    ans = app_q.get('correctIndices')
    print(f"Question ID: {qid} | Source: {src}")
    print(f"App answers: {ans}")
    for d in diffs:
        row_idx = d["row"]
        row_obj = app_q["rows"][row_idx - 1]
        app_w = d['app_w']
        raw_w = d['raw_w']
        solved = row_obj.get('solvedWords')
        correct = row_obj.get('isCorrectRow')
        expl = row_obj.get('explanation')
        print(f"  Row {row_idx}: App='{app_w}' | Raw='{raw_w}' | Solved={solved} | isCorrect={correct}")
        print(f"         Expl: {expl}")
