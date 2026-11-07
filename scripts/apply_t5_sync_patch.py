import re

with open('scripts/sync_all_banks_to_primary_sources.py', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update T5_ABBREVS
old_abbrevs = '"РФ", "США", "СССР", "МГИМО", "МГУ", "ВУЗ", "ВУЗА", "ГИБДД", "ДНК", "РНК",'
new_abbrevs = '"РФ", "США", "СССР", "МГИМО", "МГУ", "ВУЗ", "ВУЗА", "ГИБДД", "ДНК", "РНК", "РКП", "КГБ", "ВВП", "МИД", "ЦК",'
assert old_abbrevs in text
text = text.replace(old_abbrevs, new_abbrevs, 1)

# 2. In extract_task_5_sentences_from_primary, strip trailing annotations and instruction fragments
old_strip = """        # Strip leaked fragments from instructions
        ln = re.sub(r"^к выделенному слову пароним\.?\s*", "", ln, flags=re.I).strip()
        if not ln:
            continue"""

new_strip = """        # Strip leaked fragments from instructions
        ln = re.sub(r"^(?:к выделенному слову пароним|подобрав\\s+к\\s+выделенному|Запишите подобранное)\\.?\\s*", "", ln, flags=re.I).strip()
        if not ln:
            continue
        # Strip trailing scraper metadata annotations
        ln = re.sub(
            r"\\s*\\(?(?:Задание\\s+(?:составлено|из\\s+сборника|взято)|Взято\\s+из)[^)]*\\)?\\.?$",
            "",
            ln,
            flags=re.I,
        ).strip()
        if not ln:
            continue"""

assert old_strip in text
text = text.replace(old_strip, new_strip, 1)

# Ensure lines end with proper terminal punctuation
old_ln_add = """        ln = re.sub(r"^\\d+[\\).\\s]+\\s*", "", ln).strip()
        if ln:
            lines.append(ln)"""

new_ln_add = """        ln = re.sub(r"^\\d+[\\).\\s]+\\s*", "", ln).strip()
        if ln:
            if not ln.endswith((".", "!", "?", "…", ":")):
                ln += "."
            lines.append(ln)"""

assert old_ln_add in text
text = text.replace(old_ln_add, new_ln_add, 1)

# 3. Add helper function parse_shk_t5_row_explanations
helper_func = '''def parse_shk_t5_row_explanations(sol_clean: str) -> list[str] | None:
    if not sol_clean or "Здесь скоро появится решение" in sol_clean:
        return None
    p_num = re.compile(r"(?:^|\\n)\\s*([1-5])\\s*[\\)\\.]\\s*", re.M)
    splits = list(p_num.finditer(sol_clean))
    if len(splits) == 5:
        chunks = []
        for i in range(5):
            start = splits[i].end()
            end = splits[i + 1].start() if i < 4 else len(sol_clean)
            c = sol_clean[start:end].strip()
            c = re.sub(r"\\s*\\(?(?:Задание\\s+(?:составлено|из\\s+сборника|взято)|Взято\\s+из)[^)]*\\)?\\.?$", "", c, flags=re.I).strip()
            chunks.append(c)
        return chunks

    lines = [ln.strip() for ln in sol_clean.splitlines() if ln.strip()]
    row_chunks = [ln for ln in lines if re.search(r"—\\s*(?:верно|неверно)", ln, re.I)]
    if len(row_chunks) == 5:
        cleaned_chunks = []
        for c in row_chunks:
            c = re.sub(r"\\s*\\(?(?:Задание\\s+(?:составлено|из\\s+сборника|взято)|Взято\\s+из)[^)]*\\)?\\.?$", "", c, flags=re.I).strip()
            cleaned_chunks.append(c)
        return cleaned_chunks
    return None


'''

assert 'def heal_task_5(' in text
text = text.replace('def heal_task_5(', helper_func + 'def heal_task_5(', 1)

# 4. In heal_task_5, ensure standard instruction and per-row explanations
old_sol_block = """        sol_raw = clean_html_text(rec.get("solution_html") or "")
        sol_clean = re.sub(r"\\s+", " ", sol_raw).strip()

        new_rows = []
        for idx, (s, cw) in enumerate(zip(sents, caps_words)):
            rnum = idx + 1
            is_err = rnum == err_idx
            if is_err:
                solved_s = s.replace(cw, corr_cw, 1) if cw else s
                expl = (
                    f"Лексическая ошибка в употреблении паронима «{cw}». "
                    f"По смыслу контекста требуется пароним «{corr_cw}»."
                    + (f" {sol_clean}" if sol_clean else "")
                )
                let = primary_ans
            else:
                solved_s = s
                expl = f"Пароним «{cw}» употреблён абсолютно верно в соответствии со своим лексическим значением."
                let = cw.lower()"""

new_sol_block = """        q["instruction"] = "В одном из приведённых ниже предложений НЕВЕРНО употреблено выделенное слово. Исправьте лексическую ошибку, подобрав к выделенному слову пароним. Запишите подобранное слово."

        sol_raw = clean_html_text(rec.get("solution_html") or "")
        sol_clean = re.sub(r"\\s+", " ", sol_raw).strip()
        sol_clean = re.sub(r"\\s*\\(?(?:Задание\\s+(?:составлено|из\\s+сборника|взято)|Взято\\s+из)[^)]*\\)?\\.?$", "", sol_clean, flags=re.I).strip()
        if "Здесь скоро появится решение" in sol_clean:
            sol_clean = ""

        FALLBACK_SOLUTIONS = {
            "shk-5-19298": "Исполнительский — относящийся к исполнителю, к исполнению произведения (исполнительское мастерство). Исполнительный — старательный, точно исполняющий обязанности; осуществляющий управление (исполнительная власть).",
            "shk-5-19324": "Изобретательский — относящийся к изобретателю, к изобретательству (изобретательская деятельность). Изобретательный — находчивый, быстро находящий решения (изобретательный ум).",
            "shk-5-84763": "Выбирать — отдавать предпочтение чему-либо из наличного (выбирать между водой и напитком). Избирать — голосованием выбирать кого-либо на выборную должность (избирать депутата).",
            "shk-5-84769": "Информированность — степень осведомлённости (информированность населения). Информативность — насыщенность полезной информацией (информативность текста).",
            "shk-5-84771": "Лесной — находящийся в лесу, связанный с лесом (лесной ручей, лесная тропа). Лесистый — обильно поросший лесом (лесистая местность).",
        }
        if not sol_clean and q["id"] in FALLBACK_SOLUTIONS:
            sol_clean = FALLBACK_SOLUTIONS[q["id"]]

        shk_row_chunks = parse_shk_t5_row_explanations(sol_clean) if (q["id"].startswith("shk-") or "shkolkovo" in q["id"]) else None

        new_rows = []
        for idx, (s, cw) in enumerate(zip(sents, caps_words)):
            rnum = idx + 1
            is_err = rnum == err_idx
            shk_chunk = shk_row_chunks[idx] if (shk_row_chunks and idx < len(shk_row_chunks)) else ""
            if is_err:
                solved_s = s.replace(cw, corr_cw, 1) if cw else s
                specific_sol = shk_chunk if shk_chunk else sol_clean
                expl = (
                    f"Лексическая ошибка в употреблении паронима «{cw}». "
                    f"По смыслу контекста требуется пароним «{corr_cw}»."
                    + (f" {specific_sol}" if specific_sol else "")
                )
                let = primary_ans
            else:
                solved_s = s
                if shk_chunk:
                    expl = f"Пароним «{cw}» употреблён верно. {shk_chunk}"
                else:
                    expl = f"Пароним «{cw}» употреблён абсолютно верно в соответствии со своим лексическим значением."
                let = cw.lower()"""

assert old_sol_block in text
text = text.replace(old_sol_block, new_sol_block, 1)

# 5. In atomic save, ensure temp file rename
old_save = """    print("\\nSaving synchronized banks...")
    for path in ["public/data/fipiTasksBank.json", "public/data/fipiTasksBank9_15.json"]:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(fipi_bank, f, ensure_ascii=False, indent=2)

    for path in ["public/data/sprintBank.json", "public/data/sprintBank9_15.json"]:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(sprint_bank, f, ensure_ascii=False, indent=2)"""

new_save = """    print("\\nSaving synchronized banks atomically...")
    fipi_str = json.dumps(fipi_bank, ensure_ascii=False, indent=2)
    with open("public/data/fipiTasksBank.json.tmp", "w", encoding="utf-8") as f:
        f.write(fipi_str)
    os.replace("public/data/fipiTasksBank.json.tmp", "public/data/fipiTasksBank.json")
    with open("public/data/fipiTasksBank9_15.json.tmp", "w", encoding="utf-8") as f:
        f.write(fipi_str)
    os.replace("public/data/fipiTasksBank9_15.json.tmp", "public/data/fipiTasksBank9_15.json")

    sprint_str = json.dumps(sprint_bank, ensure_ascii=False, indent=2)
    with open("public/data/sprintBank.json.tmp", "w", encoding="utf-8") as f:
        f.write(sprint_str)
    os.replace("public/data/sprintBank.json.tmp", "public/data/sprintBank.json")
    with open("public/data/sprintBank9_15.json.tmp", "w", encoding="utf-8") as f:
        f.write(sprint_str)
    os.replace("public/data/sprintBank9_15.json.tmp", "public/data/sprintBank9_15.json")"""

assert old_save in text
text = text.replace(old_save, new_save, 1)

with open('scripts/sync_all_banks_to_primary_sources.py', 'w', encoding='utf-8') as f:
    f.write(text)

print('Patch applied successfully!')
