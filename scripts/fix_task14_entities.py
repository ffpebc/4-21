import json
import re

def clean_mixed_corruptions(txt):
    # &ldquо; or &rdquо; with mixed latin/cyrillic
    txt = re.sub(r'&[lL][dD][qQ][uU][oоOО];?', '«', txt)
    txt = re.sub(r'&[rR][dD][qQ][uU][oоOО];?', '»', txt)
    # &амр;#х2013;"> or &amp;#x2013;">
    txt = re.sub(r'&(?:амр|amp);#?[xх]?[0-9a-fA-F]*;?(">)?', '—', txt)
    # &sну;
    txt = re.sub(r'&[sS][нН][уУ];?', '', txt)
    txt = re.sub(r'\(ПО\)СВОЕМУ\)\.', '(ПО)СВОЕМУ.', txt)
    txt = re.sub(r'ПО-СВОЕМУ\)\.', 'ПО-СВОЕМУ.', txt)
    # Also clean foreign words in quotes
    txt = txt.replace('«Раrdоn!»', '«Pardon!»').replace('«Меrсi!»', '«Merci!»')
    return txt

for path in ['public/data/fipiTasksBank.json', 'public/data/fipiTasksBank9_15.json']:
    with open(path, 'r', encoding='utf-8') as f:
        bank = json.load(f)
    for q in bank:
        if str(q.get('task')) == '14':
            for r in q['rows']:
                r['words'] = [clean_mixed_corruptions(r['words'][0])]
                r['solvedWords'] = [clean_mixed_corruptions(r['solvedWords'][0])]
                # Also clean explanation if needed
                r['explanation'] = clean_mixed_corruptions(r['explanation'])
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(bank, f, ensure_ascii=False, indent=2)

print("Entities cleaned successfully in public banks!")
