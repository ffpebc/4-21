# -*- coding: utf-8 -*-
import json, re

with open('src/data/allWordsBank9_15.json', 'r', encoding='utf-8') as f:
    words = json.load(f)

print(f"Total words in bank: {len(words)}")
