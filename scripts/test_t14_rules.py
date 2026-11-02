# -*- coding: utf-8 -*-
import json, re

# Known database of exact slot resolutions for Task 14
with open('src/data/fipiTasksBank9_15.json', 'r', encoding='utf-8') as f:
    fipi = json.load(f)

t14 = [q for q in fipi if q.get('task') == '14']

print(f"Total Task 14 tasks: {len(t14)}")
