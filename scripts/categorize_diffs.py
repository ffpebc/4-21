import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT / "scripts"))

from audit_task_4_all import mismatched_row_words, app_t4, nf_raw, shk_raw

print(f"Total mismatched row words: {len(mismatched_row_words)}")

categories = {
    "yo_character": [],     # e.g. Ë vs Ё (Latin diaeresis vs Cyrillic)
    "whitespace_punct": [], # trailing space, dots, quotes
    "different_word": [],   # actual different word
}

for m in mismatched_row_words:
    app_w = m["app_w"]
    raw_w = m["raw_w"]
    # check if normalizing Cyrillic/Latin Ё or spaces makes them equal
    norm_app = app_w.replace("Ë", "Ё").replace("ë", "ё").strip()
    norm_raw = raw_w.replace("Ë", "Ё").replace("ë", "ё").strip()
    if norm_app == norm_raw:
        categories["yo_character"].append(m)
    elif norm_app.replace(" ", "") == norm_raw.replace(" ", ""):
        categories["whitespace_punct"].append(m)
    else:
        categories["different_word"].append(m)

print(f"Categories:")
print(f"  - Yo character diffs: {len(categories['yo_character'])}")
print(f"  - Whitespace/punct diffs: {len(categories['whitespace_punct'])}")
print(f"  - Actual different words: {len(categories['different_word'])}")

print("\n--- ACTUAL DIFFERENT WORDS ---")
for m in categories["different_word"]:
    qid = m["qid"]
    app_q = [q for q in app_t4 if q["id"] == qid][0]
    r_idx = m["row"]
    row_obj = app_q["rows"][r_idx - 1]
    print(f"{qid} (row {r_idx}, ans={qid in nf_raw and r_idx in app_q['correctIndices']}): App='{m['app_w']}' vs Raw='{m['raw_w']}' | isCorrect={row_obj['isCorrectRow']} | Solved={row_obj['solvedWords']}")
