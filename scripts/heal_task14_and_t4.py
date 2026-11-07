import json
import re

print("Loading banks...")
with open("public/data/fipiTasksBank.json", "r", encoding="utf-8") as f:
    fipi_bank = json.load(f)
with open("src/data/starterBank.json", "r", encoding="utf-8") as f:
    starter_bank = json.load(f)

# 1. Fix Task 4 "нет кремня"
for q in fipi_bank:
    if q.get("id") == "nf-4-77729":
        for r in q["rows"]:
            if r["words"] == ["нет крЕмня"]:
                r["solvedWords"] = ["нет кремнЯ"]
                r["letter"] = "Я"
                r["explanation"] = "В слове «нет крЕмня» допущена акцентологическая ошибка; орфоэпическая норма — ударение на «Я»: «нет кремнЯ»."

# 2. Fix Task 14 issues in fipi_bank
for q in fipi_bank:
    if str(q.get("task")) != "14":
        continue
        
    # Fix HTML corruptions
    for r in q["rows"]:
        for fld in ["words", "solvedWords"]:
            txt = r[fld][0]
            txt = txt.replace("&ldquо;", "«").replace("&rdquо;", "»")
            txt = txt.replace('&amp;#x2013;">', "—").replace('&амр;#х2013;">', "—")
            txt = txt.replace("&sну;", "")
            txt = re.sub(r"\(ПО\)СВОЕМУ\)\.", "(ПО)СВОЕМУ.", txt)
            txt = re.sub(r"ПО-СВОЕМУ\)\.", "ПО-СВОЕМУ.", txt)
            txt = txt.replace("хлынул", "хлынул").replace("бывает", "бывает")
            txt = txt.replace("(ЗА)ЧАСТУЮ", "(ЗА)ЧАСТУЮ").replace("ЗАЧАСТУЮ", "ЗАЧАСТУЮ")
            txt = txt.replace("(ПО)НЕМНОГУ", "(ПО)НЕМНОГУ").replace("ПОНЕМНОГУ", "ПОНЕМНОГУ")
            txt = txt.replace("продвигались", "продвигались").replace("вперёд", "вперёд").replace("прежде", "прежде")
            r[fld] = [txt]

    if q["id"] == "fipi-14-neofamily-14-49857":
        r1 = q["rows"][0]
        r1["words"] = ["(ПО)МНЕНИЮ учителей, Мария получит отличные оценки, (ТАК)КАК она учится очень хорошо."]
        r1["solvedWords"] = ["ПО МНЕНИЮ учителей, Мария получит отличные оценки, ТАК КАК она учится очень хорошо."]
        r1["letter"] = "РАЗДЕЛЬНО / РАЗДЕЛЬНО"
        r1["explanation"] = "«ПО МНЕНИЮ» — вводное сочетание (предлог ПО с существительным); пишется раздельно; поэтому пишется РАЗДЕЛЬНО — «ПО МНЕНИЮ».; «ТАК КАК» — наречное сочетание / составной союз; всегда пишется раздельно; поэтому пишется РАЗДЕЛЬНО — «ТАК КАК»."

    if q["id"] == "fipi-14-neofamily-14-49007":
        r1 = q["rows"][0]
        r1["words"] = ["Отец и сын, казалось, поругались (НА)СМЕРТЬ, наговорив (С)ГОРЯЧА друг другу обидных слов."]
        r1["solvedWords"] = ["Отец и сын, казалось, поругались НАСМЕРТЬ, наговорив СГОРЯЧА друг другу обидных слов."]
        r1["explanation"] = "«НАСМЕРТЬ» — наречие; пишется слитно; поэтому пишется СЛИТНО — «НАСМЕРТЬ».; «СГОРЯЧА» — наречие, образованное от прилагательного приставочно-суффиксальным способом; пишется слитно; поэтому пишется СЛИТНО — «СГОРЯЧА»."

        r4 = q["rows"][3]
        r4["words"] = ["(ОТ)ЧАСТИ ваша гипотеза является верной, но указывать на слабые места я (ПО)ПРОСТУ не желаю."]
        r4["solvedWords"] = ["ОТЧАСТИ ваша гипотеза является верной, но указывать на слабые места я ПОПРОСТУ не желаю."]
        r4["explanation"] = "«ОТЧАСТИ» — наречие; пишется слитно; поэтому пишется СЛИТНО — «ОТЧАСТИ».; «ПОПРОСТУ» — наречие с приставкой ПО- (на -у, не на -ому/-ему/-ски); пишется слитно; поэтому пишется СЛИТНО — «ПОПРОСТУ»."

print("Saving fipiTasksBank.json and fipiTasksBank9_15.json...")
with open("public/data/fipiTasksBank.json", "w", encoding="utf-8") as f:
    json.dump(fipi_bank, f, ensure_ascii=False, indent=2)
with open("public/data/fipiTasksBank9_15.json", "w", encoding="utf-8") as f:
    json.dump(fipi_bank, f, ensure_ascii=False, indent=2)

print("Updating starterBank.json...")
fipi_map = {q["id"]: q for q in fipi_bank}
for sq in starter_bank.get("fipi", []):
    if sq["id"] in fipi_map:
        matched = fipi_map[sq["id"]]
        sq["rows"] = matched["rows"]
        sq["correctIndices"] = matched["correctIndices"]
        if "target" in matched:
            sq["target"] = matched["target"]
        if "instruction" in matched:
            sq["instruction"] = matched["instruction"]

starter_str = json.dumps(starter_bank, ensure_ascii=False, separators=(",", ":"))
with open("src/data/starterBank.json", "w", encoding="utf-8") as f:
    f.write(starter_str)

print("Done! Both public banks and starterBank updated cleanly.")
