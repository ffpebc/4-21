#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Deep audit of all Task 11 prototypes in the application against their primary sources.
"""
import glob
import html
import json
import os
import re
import sqlite3
import sys

# 1. Load app banks
with open("public/data/fipiTasksBank9_15.json", "r", encoding="utf-8") as f:
    bank_9_15 = json.load(f)

app_t11 = [q for q in bank_9_15 if str(q.get("task")) == "11"]
print(f"Loaded {len(app_t11)} Task 11 prototypes from fipiTasksBank9_15.json")

# 2. Load NeoFamily primary sources
with open(".cache/neofamily_4_22.json", "r", encoding="utf-8") as f:
    nf_all = json.load(f)

nf_raw = {}
for item in nf_all.get("11", []):
    iid = str(item.get("id") or item.get("task_id"))
    nf_raw[iid] = item

print(f"Loaded {len(nf_raw)} raw Task 11 items from NeoFamily cache.")

# 3. Load Shkolkovo primary sources from ege_trainer.db and .cache/shkolkovo/*.json
shk_raw = {}
if os.path.exists("/home/sergei/ege_trainer/ege_trainer.db"):
    conn = sqlite3.connect("/home/sergei/ege_trainer/ege_trainer.db")
    cur = conn.cursor()
    cur.execute("""
        SELECT t.id, t.body_html, t.solution_html, t.answer_text, t.source_name, th.name
        FROM tasks t
        LEFT JOIN themes th ON t.theme_id = th.id
    """)
    for row in cur.fetchall():
        shk_raw[str(row[0])] = {
            "id": str(row[0]),
            "body_html": row[1] or "",
            "solution_html": row[2] or "",
            "answer_text": row[3] or "",
            "source_name": row[4] or "",
            "theme_name": row[5] or ""
        }
    conn.close()

for path in glob.glob(".cache/shkolkovo/*.json"):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    items = data if isinstance(data, list) else (data.get("items") or data.get("data") or [])
    for it in items:
        if isinstance(it, dict) and "id" in it:
            iid = str(it["id"])
            if iid not in shk_raw:
                shk_raw[iid] = {
                    "id": iid,
                    "body_html": it.get("body_html") or it.get("body") or "",
                    "solution_html": it.get("solution_html") or it.get("solution") or "",
                    "answer_text": it.get("answer_text") or it.get("answer") or "",
                    "source_name": it.get("source_name") or "",
                    "theme_name": it.get("theme_name") or ""
                }

print(f"Loaded {len(shk_raw)} total Shkolkovo items from DB and JSON.")

# Check matching
print("\n--- Summary of Prototype Mapping ---")
matched_nf = 0
matched_shk = 0
others = []

for q in app_t11:
    qid = q["id"]
    if "neofamily" in qid:
        num = qid.split("-")[-1]
        if num in nf_raw:
            matched_nf += 1
        else:
            print("Unmatched NF:", qid)
    elif "shkolkovo" in qid:
        num = qid.split("-")[-1]
        if num in shk_raw:
            matched_shk += 1
        else:
            print("Unmatched Shkolkovo:", qid)
    else:
        others.append(qid)

print(f"Matched NeoFamily: {matched_nf}")
print(f"Matched Shkolkovo: {matched_shk}")
print(f"Other prototypes ({len(others)}): {others}")

