#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json

with open('scripts/task13_audit_report.json', 'r', encoding='utf-8') as f:
    report = json.load(f)

print(f"Total prototypes: {len(report)}")
perfect = [r for r in report if not r['findings']]
findings = [r for r in report if r['findings']]
print(f"Perfect: {len(perfect)}")
print(f"With findings: {len(findings)}")

sources = {}
for r in report:
    s = r['source']
    sources[s] = sources.get(s, 0) + 1
print("Sources distribution:", sources)

targets = {}
for r in report:
    t = r['target']
    targets[t] = targets.get(t, 0) + 1
print("Targets distribution:", targets)
