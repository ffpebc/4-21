import json
import sqlite3
import html
import re
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CANONICAL_INSTRUCTION = "Расставьте знаки препинания: укажите все цифры, на месте которых в предложении должны стоять запятые."
CANONICAL_TOPIC = "Знаки препинания в сложном предложении с разными видами связи"
CANONICAL_RULE = "Знаки препинания в сложных предложениях с разными видами связи (на стыке союзов: правило ТО, НО, ТАК)."
CANONICAL_TARGET = "ЗАПЯТЫЕ"

def clean_nf_solution(raw_html: str) -> str:
    if not raw_html:
        return ""
    t = html.unescape(raw_html)
    t = re.sub(r"[\xad\u200b-\u200f\ufeff]", "", t)
    t = re.sub(r"<p>\s*<strong>\s*Источник\b.*?$", "", t, flags=re.I | re.S)
    t = re.sub(r"<p>\s*<strong>\s*Ответ\b.*?$", "", t, flags=re.I | re.S)
    t = re.sub(r"<strong>\s*Ответ\b.*?(?:</p>|$)", "", t, flags=re.I)
    t = re.sub(r"<strong>\s*Источник\b.*?(?:</p>|$)", "", t, flags=re.I)
    t = re.sub(r"<br\s*/?>", "\n", t, flags=re.I)
    t = re.sub(r"</p>|</div>|</li>", "\n", t, flags=re.I)
    t = re.sub(r"<[^>]+>", "", t)
    t = t.replace("\xa0", " ").replace("\u202f", " ")
    lines = [re.sub(r"\s+", " ", l).strip() for l in t.splitlines() if re.sub(r"\s+", " ", l).strip()]
    if lines and re.match(r"^решение:?$", lines[0], re.I):
        lines = lines[1:]
    return "\n".join(lines)

def clean_shk_solution(raw_html: str) -> str:
    if not raw_html:
        return ""
    t = html.unescape(raw_html)
    t = re.sub(r"<!--.*?-->", "", t, flags=re.S)
    t = re.sub(r"[\xad\u200b-\u200f\ufeff]", "", t)
    t = re.sub(r"<br\s*/?>", "\n", t, flags=re.I)
    t = re.sub(r"</p>|</div>|</li>", "\n", t, flags=re.I)
    t = re.sub(r"<[^>]+>", "", t)
    t = t.replace("\xa0", " ").replace("\u202f", " ")
    lines = []
    for l in t.splitlines():
        cl = re.sub(r"\s+", " ", l).strip()
        if not cl:
            continue
        if cl in (
            "Грамматические основы",
            "Союзные слова",
            "Союзы",
            "Придаточная часть выделена цветом",
            "Придаточные части выделены цветом",
            "Главная часть выделена цветом",
            "Союзы и союзные слова"
        ):
            continue
        if re.match(r"^\(,\)$", cl):
            continue
        lines.append(cl)
    return "\n".join(lines)

def extract_digit_explanation(full_expl: str, digit: int) -> str:
    if not full_expl:
        return ""
    lines = full_expl.split("\n")
    matches = []
    d_str = str(digit)
    header_pat = re.compile(
        rf"(?:(?:[Цц]ифр[аы]|позици[яи]|на месте)\s+)?\b{d_str}\b(?:\s*,\s*\d+)*\s*[-–—:]"
        rf"|\b{d_str}\s*[-–—:\.)]"
        rf"|[Зз]апят(?:ая|ые|ую|ыми|ой)\s+(?:в\s+цифр(?:е|ах)|под\s+номер(?:ом|ами)|на\s+месте)?\s*(?:(?:\d+\s*(?:,|и)\s*)*){d_str}\b"
        rf"|[Цц]ифр(?:а|ы)\s+(?:(?:\d+\s*(?:,|и)\s*)*){d_str}\b",
        re.I
    )
    for l in lines:
        if header_pat.search(l):
            clean_l = l.strip()
            clean_l = re.sub(r"^(?:(?:[Цц]ифр[аы]|позици[яи]|на месте)\s+)?\b" + d_str + r"\b(?:\s*,\s*\d+)*\s*[-–—:\.)]\s*", "", clean_l).strip()
            if clean_l and clean_l not in matches:
                matches.append(clean_l)
                
    if matches:
        res = " ".join(matches)
        if not res.endswith((".", "!", "?")):
            res += "."
        return res
    return ""

def clean_sentence_text(sentence: str) -> str:
    s = sentence.strip()
    s = re.sub(r"^(?:стоять\s+запятая\(-ые\)\.?\s*)+", "", s, flags=re.I).strip()
    s = re.sub(r"^(?:Расставьте|Укажите|Знаки препинания)[^.]*\.\s*", "", s, flags=re.I).strip()
    s = re.sub(r"\(\s*(\d+)\s*\)", r"(\1)", s)
    s = re.sub(r"[ \t\xa0]+", " ", s).strip()
    return s

def atomic_write_json(file_path, data, indent=2):
    tmp_path = str(file_path) + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=indent)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp_path, file_path)

def main():
    print("[1/5] Loading primary sources...")
    with open(ROOT / ".cache/neofamily_4_22.json", "r", encoding="utf-8") as f:
        nf_raw = json.load(f)
    nf_tasks = {str(item["id"]): item for item in nf_raw.get("20", [])}

    con = sqlite3.connect("/home/sergei/ege_trainer/ege_trainer.db")
    cur = con.cursor()
    cur.execute("""
        SELECT k.id, k.body_html, k.solution_html, k.answer_text, th.name
        FROM tasks k
        JOIN themes th ON k.theme_id = th.id
        JOIN parent_topics p ON th.parent_topic_id = p.id
        WHERE p.subject_id = 2 AND p.exam_position = 20
    """)
    shk_tasks = {str(r[0]): {"body_html": r[1], "solution_html": r[2], "answer_text": r[3], "theme_name": r[4]} for r in cur.fetchall()}
    con.close()

    print("[2/5] Loading bank files...")
    fipi_path = ROOT / "public/data/fipiTasksBank.json"
    fipi_9_15_path = ROOT / "public/data/fipiTasksBank9_15.json"
    starter_path = ROOT / "src/data/starterBank.json"
    sprint_path = ROOT / "public/data/sprintBank.json"
    sprint_9_15_path = ROOT / "public/data/sprintBank9_15.json"

    with open(fipi_path, "r", encoding="utf-8") as f:
        all_fipi = json.load(f)

    with open(sprint_path, "r", encoding="utf-8") as f:
        all_sprint = json.load(f)

    with open(starter_path, "r", encoding="utf-8") as f:
        starter_data = json.load(f)

    print("[3/5] Auditing and healing Task 20 in FIPI banks...")
    t20_fipi = [q for q in all_fipi if str(q.get("task")) == "20"]

    clean_solutions_cache = {}
    for q in t20_fipi:
        qid = q["id"]
        q["instruction"] = CANONICAL_INSTRUCTION
        q["topic"] = CANONICAL_TOPIC
        q["rule"] = CANONICAL_RULE
        q["target"] = CANONICAL_TARGET
        q["questionKind"] = "numbered_gaps"

        sent = clean_sentence_text(q.get("sentence", ""))
        q["sentence"] = sent

        found_digits = sorted({int(m.group(1)) for m in re.finditer(r"\((\d+)\)", sent)})
        correct_indices = sorted(q["correctIndices"])
        q["correctIndices"] = correct_indices

        raw_sol = ""
        src_label = q.get("source", "")
        if qid.startswith("nf-20-"):
            orig_id = qid.replace("nf-20-", "")
            orig = nf_tasks.get(orig_id)
            if orig:
                raw_sol = orig.get("solution", "")
            clean_sol = clean_nf_solution(raw_sol)
        elif qid.startswith("shk-20-"):
            orig_id = qid.replace("shk-20-", "")
            orig = shk_tasks.get(orig_id)
            if orig:
                raw_sol = orig.get("solution_html", "")
            clean_sol = clean_shk_solution(raw_sol)
        else:
            clean_sol = ""

        clean_solutions_cache[qid] = clean_sol
        if clean_sol:
            q["explanation"] = clean_sol

        rows = []
        for d in found_digits:
            is_comma = d in correct_indices
            status_text = "запятая ставится" if is_comma else "запятая не нужна"
            letter = "," if is_comma else "—"
            
            d_expl = extract_digit_explanation(clean_sol, d)
            if not d_expl:
                m = re.search(rf"(\S+)\s*\({d}\)\s*(\S+)", sent)
                before_word = m.group(1).lower() if m else ""
                after_word = m.group(2).lower() if m else ""
                
                is_junction = (before_word in ("и", "что", "но", "а", "хотя", "если") and 
                               after_word in ("если", "когда", "хотя", "пока", "как", "чтобы", "едва", "лишь"))
                
                if is_junction:
                    if is_comma:
                        d_expl = f"Стык союзов («{before_word}» и «{after_word}»): запятая ставится, так как далее в предложении нет второй части союза («то», «так», «но»)."
                    else:
                        d_expl = f"Стык союзов («{before_word}» и «{after_word}»): запятая не ставится, так как далее следует вторая часть союза («то», «так» или «но»)."
                elif before_word in ("и", "но", "а", "или", "да"):
                    if is_comma:
                        d_expl = f"Сочинительный союз «{before_word}» соединяет самостоятельные предикативные части сложного предложения (разные грамматические основы)."
                    else:
                        d_expl = f"Сочинительный союз «{before_word}» связывает однородные придаточные части (или однородные члены), поэтому запятая не ставится."
                else:
                    if is_comma:
                        d_expl = "Запятая отделяет придаточную часть сложного предложения от главной части."
                    else:
                        d_expl = "Знак препинания на границе данных компонентов предложения не требуется."

            full_row_expl = f"({d}) — {status_text}. {d_expl}"
            rows.append({
                "words": [f"Позиция ({d})"],
                "solvedWords": [f"({d}) — {status_text}"],
                "letter": letter,
                "isCorrectRow": is_comma,
                "explanation": full_row_expl,
            })

        q["rows"] = rows

    print("[4/5] Synchronizing Sprint items and starterBank...")
    sent_to_fipi = {}
    for q in t20_fipi:
        s_clean = re.sub(r"\s+", " ", q.get("sentence", "")).strip()
        if len(s_clean) >= 35:
            sent_to_fipi[s_clean[:65]] = q

    for s in all_sprint:
        if str(s.get("task")) != "20":
            continue
        
        ctx = s.get("context", "")
        m_digit = re.search(r"\((\d+)\)", s.get("prefix", "") or ctx)
        digit = int(m_digit.group(1)) if m_digit else 1
        
        matched_q = None
        for s_key, fq in sent_to_fipi.items():
            if s_key in ctx:
                matched_q = fq
                break
        
        is_comma = False
        full_sol = ""
        matched_sent = ""
        if matched_q:
            is_comma = digit in matched_q.get("correctIndices", [])
            full_sol = clean_solutions_cache.get(matched_q["id"], "")
            matched_sent = matched_q.get("sentence", "")
            s["context"] = f"[Позиция ({digit})] {matched_sent}"
        else:
            is_comma = s.get("answer") == "ЗАПЯТАЯ НУЖНА"
            full_sol = "Запятая ставится на стыке союзов при отсутствии слов 'то, так, но'."

        ans_lbl = "ЗАПЯТАЯ НУЖНА" if is_comma else "БЕЗ ЗАПЯТОЙ"
        s["answer"] = ans_lbl
        s["options"] = ["ЗАПЯТАЯ НУЖНА", "БЕЗ ЗАПЯТОЙ"]
        s["prefix"] = f"Нужна ли запятая на месте ({digit})?"
        s["topic"] = CANONICAL_TOPIC
        s["rule"] = CANONICAL_RULE
        
        comma_str = "запятая ставится" if is_comma else "запятая не нужна"
        d_expl = extract_digit_explanation(full_sol, digit) if full_sol else ""
        if d_expl:
            s["explanation"] = f"Позиция ({digit}) — {comma_str}. {d_expl}"
        elif matched_q and digit <= len(matched_q.get("rows", [])):
            s["explanation"] = matched_q["rows"][digit - 1]["explanation"]
        elif full_sol:
            s["explanation"] = f"Позиция ({digit}) — {comma_str}. {full_sol.splitlines()[0]}"
        else:
            s["explanation"] = f"Позиция ({digit}) — {comma_str} по правилу постановки знаков препинания в сложном предложении с разными видами связи."

    # Starter bank Task 20 sync
    for q in starter_data.get("fipi", []):
        if str(q.get("task")) == "20":
            matched = next((f for f in t20_fipi if f["id"] == q["id"]), None)
            if matched:
                q["instruction"] = matched["instruction"]
                q["topic"] = matched["topic"]
                q["rule"] = matched["rule"]
                q["target"] = matched["target"]
                q["sentence"] = matched["sentence"]
                q["correctIndices"] = matched["correctIndices"]
                q["rows"] = matched["rows"]
                q["explanation"] = matched.get("explanation", "")

    for s in starter_data.get("sprint", []):
        if str(s.get("task")) == "20":
            s["topic"] = CANONICAL_TOPIC
            s["rule"] = CANONICAL_RULE
            s["answer"] = "ЗАПЯТАЯ НУЖНА"
            s["options"] = ["ЗАПЯТАЯ НУЖНА", "БЕЗ ЗАПЯТОЙ"]
            s["prefix"] = "Нужна ли запятая на месте (1)?"
            s["context"] = "[Позиция (1)] Саврасов отправлял учеников работать на натуре в Сокольники (1) куда ходила конка (2) но (3) куда добирались юные пейзажисты непременно пешком (4) чтобы сэкономить единственный имевшийся в кармане пятак."
            s["explanation"] = "Позиция (1) — запятая ставится. Здесь заканчивается главное предложение («Саврасов отправлял учеников работать на натуре в Сокольники») и открывается первое придаточное предложение («куда ходила конка»)."

    print("[5/5] Writing atomic updates to disk...")
    atomic_write_json(fipi_path, all_fipi, indent=2)
    atomic_write_json(fipi_9_15_path, all_fipi, indent=2)
    atomic_write_json(sprint_path, all_sprint, indent=2)
    atomic_write_json(sprint_9_15_path, all_sprint, indent=2)
    atomic_write_json(starter_path, starter_data, indent=None)

    print("Task 20 atomic synchronization complete!")

if __name__ == "__main__":
    main()
