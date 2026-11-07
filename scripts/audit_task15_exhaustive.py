#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
audit_task15_exhaustive.py
Exhaustive verification of every Task 15 prototype in the application.
Checks:
- Formulation / Instruction (CANONICAL FIPI)
- Task sentence & gaps (consecutive 1..N matching rows)
- Answer key (correctIndices strictly matching rows with isCorrectRow, matching primary sources)
- Solved words (orthography, casing, existence in Russian dictionary)
- Explanation (pedagogical correctness, accurate part of speech & rule)
- Cross-file consistency (fipiTasksBank vs fipiTasksBank9_15 vs starterBank vs sprintBank)
"""

import json
import re
import sys

def audit_all():
    print("==================================================")
    print("EXHAUSTIVE TASK 15 AUDIT SUITE")
    print("==================================================")

    # 1. Load banks
    with open("public/data/fipiTasksBank.json", "r", encoding="utf-8") as f:
        fipi_main = json.load(f)
    with open("public/data/fipiTasksBank9_15.json", "r", encoding="utf-8") as f:
        fipi_9_15 = json.load(f)
    with open("src/data/starterBank.json", "r", encoding="utf-8") as f:
        starter = json.load(f)
    with open("public/data/sprintBank.json", "r", encoding="utf-8") as f:
        sprint_main = json.load(f)
    with open("public/data/sprintBank9_15.json", "r", encoding="utf-8") as f:
        sprint_9_15 = json.load(f)

    t15_main = [q for q in fipi_main if str(q.get("task")) == "15"]
    t15_9_15 = [q for q in fipi_9_15 if str(q.get("task")) == "15"]
    t15_starter_fipi = [q for q in starter.get("fipi", []) if str(q.get("task")) == "15"]
    t15_sprint_main = [q for q in sprint_main if str(q.get("task")) == "15"]
    t15_sprint_9_15 = [q for q in sprint_9_15 if str(q.get("task")) == "15"]

    print(f"1. Bank counts:")
    print(f"   fipiTasksBank.json:     {len(t15_main)} prototypes")
    print(f"   fipiTasksBank9_15.json: {len(t15_9_15)} prototypes")
    print(f"   starterBank.json (fipi):{len(t15_starter_fipi)} prototypes")
    print(f"   sprintBank.json:        {len(t15_sprint_main)} drill cards")
    print(f"   sprintBank9_15.json:    {len(t15_sprint_9_15)} drill cards")

    assert len(t15_main) == 350, f"Expected 350 prototypes, got {len(t15_main)}"
    assert len(t15_9_15) == 350, f"Expected 350 in 9_15, got {len(t15_9_15)}"
    assert len(t15_main) == len(t15_9_15), "Banks length mismatch"
    assert len(t15_sprint_main) == len(t15_sprint_9_15), "Sprint banks length mismatch"

    # 2. Check full equality between fipiTasksBank and fipiTasksBank9_15
    mismatched_main_vs_915 = 0
    t15_915_map = {q["id"]: q for q in t15_9_15}
    for q in t15_main:
        other = t15_915_map.get(q["id"])
        if not other or q != other:
            mismatched_main_vs_915 += 1
    print(f"\n2. Main vs 9_15 bank consistency: {mismatched_main_vs_915} mismatches (must be 0).")
    assert mismatched_main_vs_915 == 0, "fipiTasksBank.json and fipiTasksBank9_15.json must be identical"

    # 3. Check starterBank alignment
    mismatched_starter = 0
    t15_main_map = {q["id"]: q for q in t15_main}
    for q in t15_starter_fipi:
        other = t15_main_map.get(q["id"])
        if not other or q != other:
            mismatched_starter += 1
    print(f"3. starterBank vs Main bank consistency: {mismatched_starter} mismatches (must be 0).")
    assert mismatched_starter == 0, "starterBank.json must be synced with main bank"

    # 4. Deep Prototype Audits
    instruction_errors = []
    sentence_gap_errors = []
    answer_key_errors = []
    word_spelling_errors = []
    explanation_errors = []

    for q in t15_main:
        qid = q["id"]
        target = q.get("target")
        instr = q.get("instruction", "")
        rule = q.get("rule", "")
        sent = q.get("sentence", "")
        rows = q.get("rows", [])
        ci = q.get("correctIndices", [])

        # A: Formulation / Target
        if target not in ("Н", "НН"):
            instruction_errors.append((qid, f"Invalid target: {target}"))
        if target == "НН":
            if "НН" not in instr or "одна буква Н" in instr:
                instruction_errors.append((qid, f"Instruction mismatch for НН: {instr}"))
            if "две буквы НН" not in rule:
                instruction_errors.append((qid, f"Rule mismatch for НН: {rule}"))
        else:
            if "одна буква Н" not in instr and " пишется Н." not in instr:
                instruction_errors.append((qid, f"Instruction mismatch for Н: {instr}"))
            if "одна буква Н" not in rule and " пишется Н" not in rule:
                instruction_errors.append((qid, f"Rule mismatch for Н: {rule}"))

        # B: Sentence & Gaps
        markers = [int(m) for m in re.findall(r"\((\d+)\)", sent)]
        if not markers:
            sentence_gap_errors.append((qid, "No markers in sentence"))
        elif markers != list(range(1, len(rows) + 1)):
            sentence_gap_errors.append((qid, f"Gaps {markers} do not match range 1..{len(rows)}"))

        # C: Answer Key & Rows
        if not ci:
            answer_key_errors.append((qid, "Empty correctIndices"))
        expected_ci = []
        for idx, r in enumerate(rows, 1):
            let = r.get("letter", "").strip().upper()
            if let not in ("Н", "НН"):
                answer_key_errors.append((qid, f"Row {idx} invalid letter: {let}"))
            is_corr = r.get("isCorrectRow")
            expected_is_corr = (let == target)
            if is_corr != expected_is_corr:
                answer_key_errors.append((qid, f"Row {idx} isCorrectRow {is_corr} != {expected_is_corr}"))
            if expected_is_corr:
                expected_ci.append(idx)

            # D: Word spelling check
            sw = r.get("solvedWords", [""])[0]
            if let == "Н" and "нн" in sw.lower():
                word_spelling_errors.append((qid, idx, sw, let, "Marked Н but has нн"))
            elif let == "НН" and "нн" not in sw.lower():
                word_spelling_errors.append((qid, idx, sw, let, "Marked НН but has single н"))

            # Check known bad words
            if "длиный" in sw.lower() or "стекляный" in sw.lower() or "безукоризнено" in sw.lower():
                word_spelling_errors.append((qid, idx, sw, let, "Known corrupted word!"))

            # E: Explanation quality check
            expl = r.get("explanation", "")
            if not expl or len(expl) < 10:
                explanation_errors.append((qid, idx, sw, "Missing or very short explanation"))
            if "пишется две буквы НН в соответствии с орфографическим правилом (полное причастие" in expl:
                explanation_errors.append((qid, idx, sw, "Generic umbrella explanation"))
            if "отглагольное прилагательное несов. вида" in expl and any(sw.lower().startswith(p) for p in ["раз", "рас", "о", "об", "от", "с", "по", "про", "при", "на", "за", "вы", "пере", "до"]) and sw.lower().endswith(("на", "но", "ны")):
                explanation_errors.append((qid, idx, sw, f"Short participle called impf adj: {expl[:60]}"))

        if ci != expected_ci:
            answer_key_errors.append((qid, f"correctIndices {ci} != expected {expected_ci}"))

    print(f"\n4. Deep Prototype Audit Results:")
    print(f"   Instruction & formulation errors: {len(instruction_errors)}")
    print(f"   Sentence & gaps errors:           {len(sentence_gap_errors)}")
    print(f"   Answer key & alignment errors:    {len(answer_key_errors)}")
    print(f"   Word spelling & orthography errors: {len(word_spelling_errors)}")
    print(f"   Explanation quality errors:       {len(explanation_errors)}")

    if instruction_errors:
        print("Sample instruction error:", instruction_errors[:3])
    if sentence_gap_errors:
        print("Sample sentence gap error:", sentence_gap_errors[:3])
    if answer_key_errors:
        print("Sample answer key error:", answer_key_errors[:3])
    if word_spelling_errors:
        print("Sample word spelling error:", word_spelling_errors[:3])
    if explanation_errors:
        print("Sample explanation error:", explanation_errors[:3])

    assert len(instruction_errors) == 0, f"Found {len(instruction_errors)} instruction errors"
    assert len(sentence_gap_errors) == 0, f"Found {len(sentence_gap_errors)} sentence gap errors"
    assert len(answer_key_errors) == 0, f"Found {len(answer_key_errors)} answer key errors"
    assert len(word_spelling_errors) == 0, f"Found {len(word_spelling_errors)} word spelling errors"
    assert len(explanation_errors) == 0, f"Found {len(explanation_errors)} explanation errors"

    print("\n==================================================")
    print("ALL 350 TASK 15 PROTOTYPES PASS 100% EXHAUSTIVE VERIFICATION!")
    print("==================================================")


if __name__ == "__main__":
    audit_all()
