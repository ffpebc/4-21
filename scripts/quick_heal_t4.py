import json
import sys
import os

sys.path.insert(0, 'scripts')
from sync_all_banks_to_primary_sources import heal_task_4

for path in ['public/data/fipiTasksBank.json', 'public/data/fipiTasksBank9_15.json']:
    with open(path, 'r', encoding='utf-8') as f:
        fipi = json.load(f)
    heal_task_4(fipi, [])
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(fipi, f, ensure_ascii=False, indent=2)

print("Task 4 healed in both public banks!")
