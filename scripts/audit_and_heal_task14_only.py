import json
import re
import subprocess
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from master_heal_and_audit import resolve_t14_token as base_resolve_t14_token

LAT_TO_CYR = str.maketrans("ABCEHKMOPTXYabcehkmoptxy", "АВСЕНКМОРТХУавсенкмортху")

def norm_yo(s: str) -> str:
    s = s or ""
    s = re.sub(r"[\xad\u200b-\u200f\ufeff\u0300\u0301]", "", s)
    s = s.translate(str.maketrans("ÁÓÉÍÚÝáóéíúý", "АОЕИУЫаоеиуы"))
    return s.replace("Ё", "Е").replace("ё", "е")

def clean_t14_raw_sentence(sent: str) -> str:
    sent = sent.replace('&ldquо;', '«').replace('&rdquо;', '»')
    sent = sent.replace('&amp;#x2013;">', '—').replace('&амр;#х2013;">', '—')
    sent = sent.replace('&sну;', '')
    sent = re.sub(r'\(ПО\)СВОЕМУ\)\.', '(ПО)СВОЕМУ.', sent)
    sent = re.sub(r'ПО-СВОЕМУ\)\.', 'ПО-СВОЕМУ.', sent)
    sent = sent.replace('хлы&sну;нул', 'хлынул').replace('бы&sну;ва&sну;ет', 'бывает')
    sent = sent.replace('(ЗА)ЧА&sну;СТУЮ', '(ЗА)ЧАСТУЮ').replace('ЗАЧА&sну;СТУЮ', 'ЗАЧАСТУЮ')
    sent = sent.replace('(ПО)НЕ&sну;МНО&sну;ГУ', '(ПО)НЕМНОГУ').replace('ПОНЕ&sну;МНО&sну;ГУ', 'ПОНЕМНОГУ')
    sent = sent.replace('про&sну;дви&sну;га&sну;лись', 'продвигались').replace('впе&sну;ред', 'вперёд').replace('пре&sну;жде', 'прежде')
    sent = sent.translate(LAT_TO_CYR)
    sent = re.sub(r"(?<=[А-ЯЁ()])3|3(?=[А-ЯЁ()])", "З", sent)
    sent = re.sub(r"[А-ЯЁа-яё]*\([А-ЯЁ\s-]+\)[А-ЯЁа-яё]*", lambda m: m.group(0).upper(), sent)
    
    # Fix spacing issues inside brackets
    sent = re.sub(r"\(ПОТОМУ\s+ЧТО\)", "(ПОТОМУ) ЧТО", sent)
    sent = re.sub(r"\(ЧТО\s+БЫ\)", "ЧТО(БЫ)", sent)
    sent = re.sub(r"\(ПО\s+ТОМУ\)", "(ПО)ТОМУ", sent)
    sent = re.sub(r"\(РАЗНО\s+ЦВЕТНЫХ\)", "(РАЗНО)ЦВЕТНЫХ", sent)
    sent = re.sub(r"\(МАТЬ-И-МАЧЕХА\)", "(МАТЬ)И(МАЧЕХА)", sent)
    
    sent = re.sub(r"\(ТОЧЬ\)\s*\(?В\)?\s*\(?ТОЧЬ\)?", "ТОЧЬ(В)ТОЧЬ", sent, flags=re.I)
    sent = re.sub(r"\(БОК\)\s*\(?О\)?\s*\(?БОК\)?", "БОК(О)БОК", sent, flags=re.I)
    sent = re.sub(
        r"\(В\)\s*\(КОНЦЕ\)\s*КОНЦОВ|\bВ\s*\(КОНЦЕ\)\s*КОНЦОВ|\bВ\s*КОНЦЕ\s*\(КОНЦОВ\)",
        "(В)КОНЦЕ КОНЦОВ",
        sent,
        flags=re.I,
    )
    sent = re.sub(r"\(КОЕ\)\s*\(?О\)?\s*ЧЁМ", "КОЕ(О)ЧЁМ", sent, flags=re.I)
    sent = re.sub(r"\(КОЕ\)\s*\(?С\)?\s*КЕМ", "КОЕ(С)КЕМ", sent, flags=re.I)
    sent = re.sub(r"\(В\)\s*\(ПОЛ\)ГОЛОСА", "(В)ПОЛГОЛОСА", sent, flags=re.I)
    sent = re.sub(r"\(В\)\s*\(ПОЛ\)СИЛЫ", "(В)ПОЛСИЛЫ", sent, flags=re.I)
    sent = re.sub(r"\(НЕ\)\s*\(В\)ПОПАД", "(НЕ)ВПОПАД", sent, flags=re.I)
    sent = re.sub(r"\(НЕ\)\s*\(В\)ДОМЁК", "(НЕ)ВДОМЁК", sent, flags=re.I)
    sent = re.sub(r"\(НЕ\)\s*\(В\)ЗНАЧАЙ", "(НЕ)ВЗНАЧАЙ", sent, flags=re.I)
    sent = re.sub(r"\(ИС\)\s*\(ПОД\)ЛОБЬЯ", "(ИС)ПОДЛОБЬЯ", sent, flags=re.I)
    sent = re.sub(r"\(СЛЕД\)\s*\(В\)СЛЕД", "СЛЕД(В)СЛЕД", sent, flags=re.I)
    sent = re.sub(r"\(ТАК\)\s*\(ЖЕ\)", "ТАК(ЖЕ)", sent, flags=re.I)
    sent = re.sub(r"\bИЗ\s+\(ЗА\)", "ИЗ(ЗА)", sent)
    sent = re.sub(r"(?<![А-ЯЁа-яё])(\([А-ЯЁ]{1,6}\))\s+([А-ЯЁ]{2,})(?!\s*\()", r"\1\2", sent)
    sent = re.sub(r"(?<!\)\s)(?<![А-ЯЁа-яё]\()([А-ЯЁ]{2,})\s+(\([А-ЯЁ]{1,6}\))(?![А-ЯЁа-яё])", r"\1\2", sent)
    sent = re.sub(r"([А-ЯЁ]{2,})\s+(\((?:ТО|ЖЕ|БЫ|ЛИ|КА|НИБУДЬ|ЛИБО|ТАКИ)\))(?![А-ЯЁа-яё])", r"\1\2", sent)
    sent = re.sub(
        r"(?<![А-ЯЁа-яё])(\((?:ИЗ|ПОД|НАД|ЗА|ПО|ОТ|ДО|ВО|СО|БЕЗ|В|С|К|У|О)\))\s+(\(?[А-ЯЁ]{2,}\)?)",
        r"\1\2",
        sent,
    )
    return sent

def extract_t14_slots(sent: str) -> list[str]:
    slots = re.findall(r"\(В\)КОНЦЕ КОНЦОВ|[А-ЯЁ]*\([А-ЯЁ\s-]+\)[А-ЯЁ]*", sent)
    return [s for s in slots if re.search(r"[А-ЯЁ]{2,}", re.sub(r"[()\s-]", "", s))]

def split_slot_parts(slot: str) -> list[str]:
    if slot == "(В)КОНЦЕ КОНЦОВ":
        return ["В", "КОНЦЕ", "КОНЦОВ"]
    parts = [p.strip(" -") for p in re.split(r"[()\s]+", slot) if p.strip(" -")]
    return [p.upper() for p in parts]

def detect_t14_from_expl(slot: str, expl: str, slot_idx: int = 0, same_slots: bool = False):
    parts = split_slot_parts(slot)
    if len(parts) < 2:
        return None
    if len(parts) == 3 and parts == ["В", "КОНЦЕ", "КОНЦОВ"]:
        return "В КОНЦЕ КОНЦОВ", "РАЗДЕЛЬНО"
    slitno = "".join(parts)
    defis = "-".join(parts)
    razdel = " ".join(parts)
    slitno_e = norm_yo(slitno)
    defis_e = norm_yo(defis)
    razdel_e = norm_yo(razdel)
    expl_e = norm_yo(expl)
    expl_e = re.sub(r"(?<=[А-ЯA-Z])\s*-\s*(?=[А-ЯA-Z])", "-", expl_e)

    if same_slots:
        m_raz = re.search(r"(?<![А-ЯЁа-яё])" + re.escape(razdel_e) + r"(?![А-ЯЁа-яё])", expl_e)
        m_sli = re.search(r"(?<![А-ЯЁа-яё])" + re.escape(slitno_e) + r"(?![А-ЯЁа-яё])", expl_e)
        if m_raz and m_sli:
            ordered = [(m_raz.start(), (razdel, "РАЗДЕЛЬНО")), (m_sli.start(), (slitno, "СЛИТНО"))]
            ordered.sort(key=lambda x: x[0])
            return ordered[slot_idx][1]

    esc_slot = re.escape(norm_yo(slot))
    m = re.search(esc_slot + r"\s*\((?:в данном случае\s+)?([А-ЯЁA-Z\s-]+?)\s+[—\-]\s+", expl_e, re.I)
    if m:
        form = re.sub(r"\s+", " ", m.group(1).strip().upper())
        if "-" in form:
            return defis, "ДЕФИСНО"
        elif " " in form:
            return razdel, "РАЗДЕЛЬНО"
        else:
            return slitno, "СЛИТНО"

    m2 = re.search(
        esc_slot + r"\s*\((.{1,350}?)(?:не путать|сравните|(?<!\?)\)\s+[а-яёА-ЯЁ])",
        expl_e,
        re.I | re.S,
    )
    if m2:
        inside = m2.group(1)
        if re.search(r"пиш[уе]тся\s+раздельно", inside, re.I):
            return razdel, "РАЗДЕЛЬНО"
        if re.search(r"пиш[уе]тся\s+через\s+дефис", inside, re.I):
            return defis, "ДЕФИСНО"
        if re.search(r"пиш[уе]тся\s+слитно", inside, re.I):
            return slitno, "СЛИТНО"

    clean_ex = re.sub(r"(?:не путать|сравните|кроме|отличать от)[^.;)]*", "", expl_e, flags=re.I)

    p0 = norm_yo(parts[0])
    p1_stem = norm_yo(parts[1])[:-2] if len(parts[1]) >= 5 else norm_yo(parts[1])
    stem_defis = p0 + "-" + p1_stem
    stem_slitno = p0 + p1_stem

    has_defis = bool(re.search(r"(?<![А-ЯЁа-яё-])" + re.escape(stem_defis) + r"[А-ЯЁа-яё]*", clean_ex, re.I))
    has_razdel_upper = bool(re.search(r"(?<![А-ЯЁа-яё])" + re.escape(razdel_e) + r"(?![А-ЯЁа-яё])", clean_ex))
    has_slitno_upper = bool(re.search(r"(?<![А-ЯЁа-яё])" + re.escape(stem_slitno) + r"[А-ЯЁ]*", clean_ex))

    if has_defis and not has_razdel_upper and not has_slitno_upper:
        return defis, "ДЕФИСНО"
    if has_razdel_upper and not has_defis and not has_slitno_upper:
        return razdel, "РАЗДЕЛЬНО"
    if has_slitno_upper and not has_defis and not has_razdel_upper:
        return slitno, "СЛИТНО"

    for form, orig_form, label, kw in [
        (stem_defis, defis, "ДЕФИСНО", "дефис"),
        (razdel_e, razdel, "РАЗДЕЛЬНО", r"раздельно|в два слова|существительное с предлогом|предлог с"),
        (stem_slitno, slitno, "СЛИТНО", "слитно"),
    ]:
        if re.search(re.escape(form) + r"[А-ЯЁа-яё]*[^.;]{0,90}(?:" + kw + r")", clean_ex, re.I):
            return orig_form, label
    return None

def make_t14_rule_and_topic(word: str, let: str, base_rule: str, base_topic: str, orig_expl: str = ""):
    label_text = "ЧЕРЕЗ ДЕФИС" if let == "ДЕФИСНО" else let
    
    # Check if orig_expl has rich explanation for word
    if orig_expl:
        w_esc = re.escape(word.replace('-', '[-]'))
        m_auth = re.search(r'(?:[1-5]\)\s*)?(?:[А-ЯЁа-яё\s«»"\'()-]*?\b)?' + w_esc + r'\b\s*[—–-]\s*([^;.\n]+(?:;[^;.\n]+)?)', orig_expl, re.I)
        if m_auth:
            reason = re.sub(r'<[^>]+>', '', m_auth.group(1)).strip()
            reason = re.sub(r'[,;]?\s*(?:поэтому\s+)?пиш[уе]тся\s+(?:слитно|раздельно|через дефис)\s*$', '', reason, flags=re.I).strip()
            if len(reason) > 5 and not reason.lower().startswith('пишется'):
                topic = f"Написание слов ({'через дефис' if let == 'ДЕФИСНО' else let.lower()})"
                rule = f"«{word}» — {reason}; поэтому пишется {label_text} — «{word}»."
                return rule, topic

    if base_rule and f"пишется {label_text}" in base_rule:
        if not (
            (let == "СЛИТНО" and ("(через дефис)" in base_topic or "(раздельно)" in base_topic))
            or (let == "ДЕФИСНО" and ("(слитно)" in base_topic or "(раздельно)" in base_topic))
            or (let == "РАЗДЕЛЬНО" and ("(слитно)" in base_topic or "(через дефис)" in base_topic))
        ):
            clean_base_rule = (
                base_rule.replace("устойчивое сочетание / производный предлог", "наречное сочетание")
                .replace("наречие или производный предлог", "наречное выражение")
                .replace("либо полное причастие", "причастие")
            )
            return clean_base_rule, base_topic

    if let == "ДЕФИСНО":
        topic = "Дефисное написание слов (через дефис)"
        rule = f"«{word}» — пишется через дефис в соответствии с орфографической нормой русского языка; поэтому пишется ЧЕРЕЗ ДЕФИС — «{word}»."
    elif let == "РАЗДЕЛЬНО":
        topic = "Раздельное написание слов (раздельно)"
        rule = f"«{word}» — пишется раздельно в соответствии с орфографической нормой русского языка; поэтому пишется РАЗДЕЛЬНО — «{word}»."
    else:
        topic = "Слитное написание слов (слитно)"
        rule = f"«{word}» — пишется слитно в соответствии с орфографической нормой русского языка; поэтому пишется СЛИТНО — «{word}»."
    return rule, topic

print("Loading data...")
with open("public/data/fipiTasksBank.json", "r", encoding="utf-8") as f:
    fipi_bank = json.load(f)
with open("public/data/sprintBank.json", "r", encoding="utf-8") as f:
    sprint_bank = json.load(f)
with open("src/data/starterBank.json", "r", encoding="utf-8") as f:
    starter_bank = json.load(f)

raw_432 = subprocess.check_output(["git", "show", "432f74b:src/data/fipiTasksBank9_15.json"]).decode("utf-8")
orig_map = {q["id"]: q for q in json.loads(raw_432) if str(q.get("task")) == "14"}

t14_questions = [q for q in fipi_bank if str(q.get("task")) == "14"]
print(f"Loaded {len(t14_questions)} Task 14 questions.")

slot_lookup = {}
repaired_q = 0

for q in t14_questions:
    oq = orig_map.get(q["id"])
    if not oq:
        continue
    orig_rule = oq.get("rule") or q.get("instruction") or ""
    if "ДЕФИС" in orig_rule.upper():
        target = "ДЕФИСНО"
    elif "РАЗДЕЛЬНО" in orig_rule.upper():
        target = "РАЗДЕЛЬНО"
    else:
        target = "СЛИТНО"

    dedup_indices = sorted(set(oq["correctIndices"]))

    expl_lets_on_correct = []
    for ridx in dedup_indices:
        if 1 <= ridx <= len(oq["rows"]):
            orow = oq["rows"][ridx - 1]
            raw_s = clean_t14_raw_sentence(orow["words"][0])
            slts = extract_t14_slots(raw_s)
            same_s = len(slts) == 2 and slts[0] == slts[1]
            for sidx, sl in enumerate(slts):
                d = detect_t14_from_expl(sl, orow.get("explanation", ""), sidx, same_s)
                if d is not None:
                    expl_lets_on_correct.append(d[1])
    if expl_lets_on_correct and len(set(expl_lets_on_correct)) == 1:
        detected_target = expl_lets_on_correct[0]
        if detected_target != target:
            target = detected_target

    if target == "РАЗДЕЛЬНО":
        canonical_instruction = "Укажите варианты ответов, в которых все выделенные слова пишутся РАЗДЕЛЬНО. Запишите номера ответов."
    elif target == "ДЕФИСНО":
        canonical_instruction = "Укажите варианты ответов, в которых все выделенные слова пишутся ЧЕРЕЗ ДЕФИС. Запишите номера ответов."
    else:
        canonical_instruction = "Укажите варианты ответов, в которых все выделенные слова пишутся СЛИТНО. Запишите номера ответов."

    q["correctIndices"] = dedup_indices
    q["instruction"] = canonical_instruction
    q["rule"] = "Слитное, дефисное, раздельное написание слов"
    q["target"] = target
    repaired_q += 1

    for ridx, (r, orow) in enumerate(zip(q["rows"], oq["rows"]), 1):
        orig_ok = ridx in dedup_indices
        raw_sent = clean_t14_raw_sentence(orow["words"][0])
        slots = extract_t14_slots(raw_sent)
        same_slots = len(slots) == 2 and slots[0] == slots[1]

        resolved_words = []
        resolved_letters = []
        resolved_rules = []

        for sidx, sl in enumerate(slots):
            parts = split_slot_parts(sl)
            bw, blet, brule, btopic, _ = base_resolve_t14_token(sl, raw_sent)
            if orig_ok:
                let = target
                if target == "ДЕФИСНО":
                    word = "-".join(parts)
                elif target == "РАЗДЕЛЬНО":
                    word = " ".join(parts)
                else:
                    word = "".join(parts)
            else:
                d = detect_t14_from_expl(sl, orow.get("explanation", ""), sidx, same_slots)
                if d is not None:
                    word, let = d
                else:
                    word, let = bw, blet

            # Special overrides for verified tokens
            if sl == "(ПО)МНЕНИЮ":
                word = "ПО МНЕНИЮ"
                let = "РАЗДЕЛЬНО"
            elif sl == "(С)ГОРЯЧА":
                word = "СГОРЯЧА"
                let = "СЛИТНО"
            elif sl == "(ПО)ПРОСТУ":
                word = "ПОПРОСТУ"
                let = "СЛИТНО"

            rule, topic = make_t14_rule_and_topic(
                word, let,
                brule if blet == let else "",
                btopic if blet == let else "",
                orow.get("explanation", "")
            )
            resolved_words.append(word)
            resolved_letters.append(let)
            resolved_rules.append(rule)
            slot_lookup[(q["id"], ridx, sidx + 1)] = (word, let, rule, topic, raw_sent, parts)

        solved_sent = raw_sent
        for sl, w_res in zip(slots, resolved_words):
            solved_sent = solved_sent.replace(sl, w_res, 1)

        r["words"] = [raw_sent]
        r["solvedWords"] = [solved_sent]
        r["letter"] = " / ".join(resolved_letters)
        r["isCorrectRow"] = orig_ok
        r["explanation"] = "; ".join(resolved_rules)

# Update Sprint cards
def resolve_sprint_t14_card(s):
    m = re.match(r"^sp-14-(.+)-r(\d+)-w(\d+)$", s["id"])
    if not m:
        return False
    qid = f"fipi-14-{m.group(1)}"
    ridx = int(m.group(2))
    widx = int(m.group(3))

    chosen = slot_lookup.get((qid, ridx, widx))
    if not chosen:
        return False

    word, let, rule, topic, raw_sent, _ = chosen
    s["answer"] = let
    s["options"] = ["СЛИТНО", "ДЕФИСНО", "РАЗДЕЛЬНО"]
    s["explanation"] = rule
    s["rule"] = rule
    s["topic"] = topic
    return True

fixed_sprint = 0
for s in sprint_bank:
    if str(s.get("task")) == "14" and resolve_sprint_t14_card(s):
        fixed_sprint += 1

for s in starter_bank.get("sprint", []):
    if str(s.get("task")) == "14":
        resolve_sprint_t14_card(s)

print(f"Task 14: healed {repaired_q} prototypes and {fixed_sprint} sprint cards.")

# Save files atomically
print("Saving fipiTasksBank.json and fipiTasksBank9_15.json...")
with open("public/data/fipiTasksBank.json.tmp", "w", encoding="utf-8") as f:
    json.dump(fipi_bank, f, ensure_ascii=False, indent=2)
os.replace("public/data/fipiTasksBank.json.tmp", "public/data/fipiTasksBank.json")

with open("public/data/fipiTasksBank9_15.json.tmp", "w", encoding="utf-8") as f:
    json.dump(fipi_bank, f, ensure_ascii=False, indent=2)
os.replace("public/data/fipiTasksBank9_15.json.tmp", "public/data/fipiTasksBank9_15.json")

print("Saving sprintBank.json and sprintBank9_15.json...")
with open("public/data/sprintBank.json.tmp", "w", encoding="utf-8") as f:
    json.dump(sprint_bank, f, ensure_ascii=False, indent=2)
os.replace("public/data/sprintBank.json.tmp", "public/data/sprintBank.json")

with open("public/data/sprintBank9_15.json.tmp", "w", encoding="utf-8") as f:
    json.dump(sprint_bank, f, ensure_ascii=False, indent=2)
os.replace("public/data/sprintBank9_15.json.tmp", "public/data/sprintBank9_15.json")

# Update starter bank task 14
for st_q in starter_bank.get("fipi", []):
    if str(st_q.get("task")) == "14":
        matched = next((q for q in fipi_bank if q["id"] == st_q["id"]), None)
        if matched:
            st_q["rows"] = matched["rows"]
            st_q["correctIndices"] = matched["correctIndices"]
            st_q["instruction"] = matched["instruction"]
            st_q["target"] = matched["target"]
            st_q["rule"] = matched["rule"]

with open("src/data/starterBank.json.tmp", "w", encoding="utf-8") as f:
    json.dump(starter_bank, f, ensure_ascii=False, separators=(",", ":"))
os.replace("src/data/starterBank.json.tmp", "src/data/starterBank.json")

print("All Task 14 data healed and synchronized successfully!")
