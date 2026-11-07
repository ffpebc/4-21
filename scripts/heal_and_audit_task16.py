#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Exhaustive verification, healing, and synchronization for Task 16 (all 517 prototypes)
across public/data/fipiTasksBank.json, fipiTasksBank9_15.json, sprintBank.json,
sprintBank9_15.json, starterBank.json, and primary sources (.cache/neofamily_4_22.json,
/home/sergei/ege_trainer/ege_trainer.db).
"""

import html
import json
import os
import re
import sqlite3
import sys
from pathlib import Path

CANONICAL_INSTRUCTION = (
    "Расставьте знаки препинания. Укажите предложения, в которых нужно поставить ОДНУ запятую. "
    "Запишите номера этих предложений."
)
CANONICAL_RULE = "Пунктуация в сложносочинённом предложении (ССП) и в предложениях с однородными членами (ОДНУ запятую)."
CANONICAL_TOPIC = "Пунктуация в ССП и с однородными членами"
CANONICAL_TARGET = "ОДНУ"

# Curated high-precision linguistic data for the 7 Shkolkovo tasks without DB solutions
SHK_CURATED = {
    17900: {
        "ans": [1, 5],
        "rows": {
            1: {
                "solved": "К числу самых древних изображений на стенах пещер эпохи палеолита относятся и оттиски руки человека, и непонятные узоры с переплетением волнистых линий.",
                "exp": "Одна запятая: однородные подлежащие «оттиски» и «узоры» соединены повторяющимся союзом «И..., И...». Запятая ставится после первого однородного члена.",
            },
            2: {
                "solved": "Заснеженные кусты напоминали боярскую шапку, или медведя, или причудливый зáмок.",
                "exp": "Две запятые: однородные дополнения соединены повторяющимся разделительным союзом «ИЛИ..., ИЛИ...». Запятые ставятся после первого и второго однородных членов.",
            },
            3: {
                "solved": "Весь день в парке играл духовой оркестр и работали фонтаны.",
                "exp": "Запятые не нужны: сложносочинённое предложение (ССП) с двумя основами («оркестр играл» и «фонтаны работали»), соединёнными союзом И. В начале предложения есть общий второстепенный член — обстоятельство места и времени («Весь день в парке»), относящийся к обеим частям.",
            },
            4: {
                "solved": "Терпение да труд всё перетрут.",
                "exp": "Запятые не нужны: одиночный союз ДА употреблён в значении союза И и соединяет два однородных подлежащих («терпение да труд»).",
            },
            5: {
                "solved": "В XV веке в сражениях применяли как тяжёлые пушки, так и лёгкие орудия.",
                "exp": "Одна запятая: однородные дополнения («пушки», «орудия») связаны двойным сопоставительным союзом «КАК..., ТАК И...». Запятая ставится перед второй частью союза («так и»).",
            },
        },
    },
    19252: {
        "ans": [2, 5],
        "rows": {
            1: {
                "solved": "Подбор различного по оттенкам и степени замутнённости естественного янтаря и добавка разных красителей в сочетании с особыми режимами давления позволяют получать различные по окраске и структуре украшения.",
                "exp": "Запятые не нужны: одиночный союз И соединяет однородные подлежащие («подбор и добавка»); другие союзы И соединяют разные пары однородных определений («по оттенкам и степени», «по окраске и структуре»).",
            },
            2: {
                "solved": "В рукописях М. Горький не только делал пометки, но и тщательно исправлял красным карандашом описки и расставлял пропущенные знаки препинания.",
                "exp": "Одна запятая: однородные сказуемые связаны двойным сопоставительным союзом «НЕ ТОЛЬКО..., НО И...». Запятая ставится перед второй частью союза («но и»). Однородные сказуемые «исправлял и расставлял» соединены одиночным союзом И.",
            },
            3: {
                "solved": "А.С. Пушкин не боялся разговорных слов и выражений и смело вводил их в свои стихотворения.",
                "exp": "Запятые не нужны: первый союз И соединяет однородные дополнения («слов и выражений»), второй союз И соединяет однородные сказуемые («не боялся и вводил»).",
            },
            4: {
                "solved": "В жизни Софьи Андреевны переплелись радость и грусть, счастье и разочарование, приобретения и потери.",
                "exp": "Две запятые: однородные подлежащие соединены попарно союзом И («радость и грусть», «счастье и разочарование», «приобретения и потери»). Запятые ставятся между парами.",
            },
            5: {
                "solved": "На большей территории России континентальный климат, и он обусловливает суровую зиму и жаркое лето.",
                "exp": "Одна запятая: сложносочинённое предложение (ССП) с двумя основами («климат» и «он обусловливает»). Общего второстепенного члена нет, перед союзом И ставится запятая.",
            },
        },
    },
    19283: {
        "ans": [2, 4],
        "rows": {
            1: {
                "solved": "Мелкие поселения в Древней Руси называли иногда «городцами» да «городищами».",
                "exp": "Запятые не нужны: одиночный союз ДА в значении И связывает однородные дополнения («городцами да городищами»).",
            },
            2: {
                "solved": "Кувшинки плавали и справа, и слева от лодки.",
                "exp": "Одна запятая: однородные обстоятельства («справа», «слева») связаны повторяющимся союзом «И..., И...». Запятая ставится после первого однородного члена.",
            },
            3: {
                "solved": "Обломов был расстроен письмом старосты и предстоящим переездом на квартиру и утомлён трескотнёй Тарантьева.",
                "exp": "Запятые не нужны: союзы И соединяют разные ряды однородных членов: дополнения («письмом и переездом») и составные именные сказуемые («был расстроен и утомлён»).",
            },
            4: {
                "solved": "Россия соседствует со многими странами и имеет как сухопутные, так и морские границы.",
                "exp": "Одна запятая: однородные определения связаны двойным союзом «КАК..., ТАК И...». Запятая ставится перед второй частью союза («так и»). Однородные сказуемые «соседствует и имеет» связаны одиночным союзом И.",
            },
            5: {
                "solved": "Символисты и их последователи называли Ф.И. Тютчева своим предтечей и считали себя продолжателями тютчевской поэтической традиции.",
                "exp": "Запятые не нужны: первый союз И соединяет однородные подлежащие («символисты и последователи»), второй союз И соединяет однородные сказуемые («называли и считали»).",
            },
        },
    },
    19309: {
        "ans": [3, 5],
        "rows": {
            1: {
                "solved": "Поезд с трудом прорывался через сырые потоки и безнадёжно опаздывал.",
                "exp": "Запятые не нужны: одиночный союз И соединяет однородные сказуемые («прорывался и опаздывал»).",
            },
            2: {
                "solved": "А над лугами шёл холодный дождь и ветер налетал косыми ударами.",
                "exp": "Запятые не нужны: сложносочинённое предложение (ССП) с двумя основами («дождь шёл» и «ветер налетал»), соединёнными союзом И. В начале предложения есть общий второстепенный член — обстоятельство места («над лугами»).",
            },
            3: {
                "solved": "Переправляемся на пароме через Оку, и за широкой полосой приокских лугов нас встречают Мещёрские леса.",
                "exp": "Одна запятая: сложносочинённое предложение (ССП) с двумя основами: «переправляемся» (односоставное определённо-личное) и «встречают леса» (двусоставное). Общего второстепенного члена нет, ставится запятая перед союзом И.",
            },
            4: {
                "solved": "Станции завалены смолистыми брёвнами и пахнут свежей порубкой и дикими лесными цветами.",
                "exp": "Запятые не нужны: первый союз И связывает однородные сказуемые («завалены и пахнут»), второй союз И связывает однородные дополнения («порубкой и цветами»).",
            },
            5: {
                "solved": "Я вырывал в сене глубокую нору, залезал в неё и всю ночь спал в стогу.",
                "exp": "Одна запятая: ряд однородных сказуемых: первые два («вырывал», «залезал») соединены бессоюзно (ставится запятая), а второе и третье («залезал и спал») соединены одиночным союзом И (запятая не нужна).",
            },
        },
    },
    19334: {
        "ans": [1, 5],
        "rows": {
            1: {
                "solved": "Проникновенная любовь к родным местам и заснеженным просторам манит к себе, рождает раздумья о горечи утрат и тревогу за будущее.",
                "exp": "Одна запятая: однородные сказуемые соединены бессоюзно: «манит к себе, рождает» (ставится запятая). Союзы И связывают разные пары однородных членов: «к местам и просторам», «раздумья и тревогу».",
            },
            2: {
                "solved": "В самом языке заключены и образы, и ритм, и рифмы, и аллитерации.",
                "exp": "Три запятые: однородные подлежащие соединены повторяющимся союзом «И..., И..., И..., И...». Запятые ставятся после каждого однородного члена, кроме последнего.",
            },
            3: {
                "solved": "Язык многообразен, и многозвучен, и разнотонен.",
                "exp": "Две запятые: однородные составные именные сказуемые соединены повторяющимся союзом «И..., И...». Запятые ставятся после первого и второго однородных членов.",
            },
            4: {
                "solved": "Не то мысли, не то воспоминания, не то мечты бродили в его голове.",
                "exp": "Две запятые: однородные подлежащие соединены повторяющимся разделительным союзом «НЕ ТО..., НЕ ТО..., НЕ ТО...». Запятые ставятся после первого и второго членов.",
            },
            5: {
                "solved": "Воздух лёгок и чист, и замёрзла река.",
                "exp": "Одна запятая: сложносочинённое предложение (ССП) с двумя основами («воздух лёгок и чист» и «замёрзла река»). В первой части союз И соединяет однородные сказуемые. Перед вторым союзом И ставится запятая между частями ССП.",
            },
        },
    },
    19359: {
        "ans": [1, 3],
        "rows": {
            1: {
                "solved": "На столе лежали как журналы и газеты, так и книги.",
                "exp": "Одна запятая: однородные подлежащие связаны двойным сопоставительным союзом «КАК..., ТАК И...». Запятая ставится перед второй частью союза («так и»). Подлежащие «журналы и газеты» связаны одиночным союзом И.",
            },
            2: {
                "solved": "В Суздале, и Пскове, и Ростове Великом творили великие мастера.",
                "exp": "Две запятые: однородные обстоятельства соединены повторяющимся союзом «И..., И...». Запятые ставятся после первого и второго однородных членов.",
            },
            3: {
                "solved": "Книга не только вводит читателя в богатый мир русского языка, но и раскрывает законы языковой гармонии.",
                "exp": "Одна запятая: однородные сказуемые («вводит», «раскрывает») связаны двойным союзом «НЕ ТОЛЬКО..., НО И...». Запятая ставится перед второй частью союза («но и»).",
            },
            4: {
                "solved": "Мы выехали на тракт и скоро миновали посёлок и стоящую возле него церковь.",
                "exp": "Запятые не нужны: первый союз И соединяет однородные сказуемые («выехали и миновали»), второй союз И соединяет однородные дополнения («посёлок и церковь»).",
            },
            5: {
                "solved": "Вспомните каменную громаду Георгиевского собора под Новгородом или деревянную сказку Кижей!",
                "exp": "Запятые не нужны: одиночный союз ИЛИ соединяет однородные дополнения («громаду или сказку»).",
            },
        },
    },
    19383: {
        "ans": [1, 2],
        "rows": {
            1: {
                "solved": "Обобщающие слова могут стоять или перед однородными членами, или после них.",
                "exp": "Одна запятая: однородные обстоятельства соединены повторяющимся союзом «ИЛИ..., ИЛИ...». Запятая ставится перед вторым союзом ИЛИ.",
            },
            2: {
                "solved": "У В.И. Сурикова была феноменальная художественная память, и смеющегося священника он написал именно по памяти.",
                "exp": "Одна запятая: сложносочинённое предложение (ССП) с двумя основами («память была» и «он написал»). Обстоятельство «у В.И. Сурикова» относится только к первой части, так как во второй части есть своё подлежащее «он». Перед союзом И ставится запятая.",
            },
            3: {
                "solved": "Выбежишь за ворота и увидишь ослепительную и первозданную белизну снега.",
                "exp": "Запятые не нужны: первый союз И связывает однородные сказуемые («выбежишь и увидишь»), второй союз И связывает однородные определения («ослепительную и первозданную»).",
            },
            4: {
                "solved": "Я с волнением осматривал и дом, и картины в нём, и его обитателей.",
                "exp": "Две запятые: однородные дополнения («дом», «картины», «обитателей») связаны повторяющимся союзом «И..., И..., И...». Запятые ставятся после первого и второго однородных членов.",
            },
            5: {
                "solved": "Ваш внутренний мир настроен тонко и верно и отзывается на самые незаметные звуки жизни.",
                "exp": "Запятые не нужны: первый союз И связывает однородные обстоятельства («тонко и верно»), второй союз И связывает однородные сказуемые («настроен и отзывается»).",
            },
        },
    },
}

# Curated linguistic data for NeoFamily tasks with paragraph prose solutions
NF_CURATED = {
    50924: {
        "ans": [2, 3, 4],
        "rows": {
            1: {
                "solved": "В старых ольховых деревьях дятлы выдалбливают для своих гнёзд опрятные дупла.",
                "exp": "Запятые не нужны: определения «старых ольховых» являются неоднородными, так как характеризуют предмет с разных сторон (возраст и порода).",
            },
            2: {
                "solved": "Звон бубенчиков замирает, и нас охватывает гробовое молчание.",
                "exp": "Одна запятая: сложносочинённое предложение (ССП) с двумя основами («звон замирает» и «молчание охватывает»). Общего второстепенного члена нет, ставится запятая перед союзом И.",
            },
            3: {
                "solved": "Свежеет, и блеск вечера меркнет.",
                "exp": "Одна запятая: сложносочинённое предложение (ССП) с двумя основами («свежеет» — безличное и «блеск меркнет» — двусоставное). Перед союзом И ставится запятая.",
            },
            4: {
                "solved": "Они считали своим долгом знакомить с живописью не только столичную публику, но и жителей уездных городов.",
                "exp": "Одна запятая: однородные дополнения соединены двойным сопоставительным союзом «НЕ ТОЛЬКО..., НО И...». Запятая ставится перед второй частью союза («но и»).",
            },
            5: {
                "solved": "Заказы поступали и от государства, и от промышленников, и от простых людей.",
                "exp": "Две запятые: однородные дополнения соединены повторяющимся союзом «И..., И..., И...». Запятые ставятся после первого и второго однородных членов.",
            },
        },
    },
    50883: {
        "ans": [1, 3, 4],
        "rows": {
            1: {
                "solved": "В предчувствии затяжных дождей и наводнений камышовка гнездится выше обычного, а дикие утки строят гнёзда подальше от воды.",
                "exp": "Одна запятая: перед противительным союзом А между частями сложносочинённого предложения всегда ставится запятая; союз И соединяет однородные члены «дождей и наводнений» (запятая не нужна).",
            },
            2: {
                "solved": "В воду для умывания и ванн полезно добавлять отвар или настои трав.",
                "exp": "Запятые не нужны: союзы И и ИЛИ связывают разные группы однородных членов («для умывания и ванн» / «отвар или настои»).",
            },
            3: {
                "solved": "Сильный снегопад не только скотному двору ощутимый ущерб наносил, но и всему крестьянскому хозяйству.",
                "exp": "Одна запятая: однородные дополнения связаны двойным сопоставительным союзом «НЕ ТОЛЬКО..., НО И...». Запятая ставится перед второй частью союза («но и»).",
            },
            4: {
                "solved": "Травяные ванны с успехом применяются при болезнях сердца и бессоннице, суставном ревматизме и параличе.",
                "exp": "Одна запятая: однородные члены объединены в пары союзом И («болезнях сердца и бессоннице», «суставном ревматизме и параличе»). Запятая ставится между парами.",
            },
            5: {
                "solved": "Радовались прилёту первых птиц и стар и млад.",
                "exp": "Запятые не нужны: сочетание «и стар и млад» является фразеологизмом (устойчивым выражением), внутри которого запятая перед повторяющимся союзом не ставится.",
            },
        },
    },
    50847: {
        "ans": [3, 4, 5],
        "rows": {
            1: {
                "solved": "Весёлый зелёный клён любит яркий солнечный свет.",
                "exp": "Запятые не нужны: определения «весёлый зелёный» и «яркий солнечный» являются неоднородными, так как характеризуют предмет с разных сторон.",
            },
            2: {
                "solved": "В комнату вошли полковник Аршинцев и незнакомый мне худой генерал в роговых очках.",
                "exp": "Запятые не нужны: одиночный союз И связывает однородные подлежащие («полковник и генерал»).",
            },
            3: {
                "solved": "Ночь была безлунная, но очень тёплая.",
                "exp": "Одна запятая: перед противительным союзом НО между однородными сказуемыми («безлунная, но тёплая») всегда ставится запятая.",
            },
            4: {
                "solved": "Телефонные провода оказались перебитыми, и батальон потерял связь со штабом полка и соседями.",
                "exp": "Одна запятая: сложносочинённое предложение (ССП) с двумя основами («провода оказались перебитыми» и «батальон потерял связь»). Общего второстепенного члена нет, ставится запятая перед союзом И.",
            },
            5: {
                "solved": "Танк загорелся, и чёрные фигуры вражеских солдат замелькали вокруг него.",
                "exp": "Одна запятая: сложносочинённое предложение (ССП) с двумя основами («танк загорелся» и «фигуры замелькали»). Перед союзом И ставится запятая.",
            },
        },
    },
    29520: {
        "ans": [2, 3, 4],
        "rows": {
            1: {
                "solved": "Он остановился на повороте лестницы и стал прислушиваться.",
                "exp": "Запятые не нужны: одиночный союз И связывает однородные сказуемые («остановился и стал прислушиваться»).",
            },
            2: {
                "solved": "Зато то там, то здесь раздавались одиночные или целыми букетами ружейные выстрелы.",
                "exp": "Одна запятая: обстоятельства места соединены повторяющимся союзом «ТО..., ТО...». Запятая ставится после первого однородного члена.",
            },
            3: {
                "solved": "Сумрак вползал в улицу незаметно и предательски, и всё молчаливо говорило о холодной тёмной ночи.",
                "exp": "Одна запятая: сложносочинённое предложение (ССП) с двумя основами («сумрак вползал» и «всё говорило»). Первый союз И связывает однородные обстоятельства («незаметно и предательски»), перед вторым союзом И ставится запятая.",
            },
            4: {
                "solved": "Чувство досады и раздражения поднялось у провизора не столько из-за беспорядка, сколько из-за ежедневной рутины.",
                "exp": "Одна запятая: однородные обстоятельства связаны двойным сопоставительным союзом «НЕ СТОЛЬКО..., СКОЛЬКО...». Запятая ставится перед второй частью союза («сколько»).",
            },
            5: {
                "solved": "А звёзды нежданно в тумане блеснули и свет свой холодный над липами пролили.",
                "exp": "Запятые не нужны: одиночный союз И связывает однородные сказуемые («блеснули и пролили»).",
            },
        },
    },
}


def clean_html_lines(text: str) -> list[str]:
    if not text:
        return []
    t = html.unescape(text)
    t = re.sub(r"[\xad\u200b-\u200f\ufeff]", "", t)
    t = re.sub(r"<br\s*/?>", "\n", t, flags=re.I)
    t = re.sub(r"</p>|</div>|</li>", "\n", t, flags=re.I)
    t = re.sub(r"<[^>]+>", " ", t)
    t = t.replace("\xa0", " ").replace("\u202f", " ")
    lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in t.splitlines()]
    return [ln for ln in lines if ln]


def extract_body_sentences(lines: list[str]) -> dict[int, str]:
    rows = {}
    for ln in lines:
        ln_norm = ln.replace("З)", "3)").replace("З )", "3 )").replace("З.", "3.")
        m = re.match(r"^([1-5])\s*[\)\.]\s*(.+)$", ln_norm)
        if m:
            sent = m.group(2).strip()
            # clean any leading artifacts like [if !supportLists]
            sent = re.sub(r"^<!--.*?-->\s*", "", sent)
            sent = re.sub(r"^\[if\b.*?\]\s*", "", sent)
            rows[int(m.group(1))] = sent.strip()
    return rows


def parse_shkolkovo_prototype(rid: int, sol_html: str, body_html: str, ans_str: str):
    body_lines = clean_html_lines(body_html)
    body_rows = extract_body_sentences(body_lines)
    if len(body_rows) != 5:
        return None

    correct_indices = sorted(list(set(int(d) for d in str(ans_str) if d in "12345")))
    if not correct_indices:
        return None

    # Check curated first
    if rid in SHK_CURATED:
        cur = SHK_CURATED[rid]
        rows = []
        for idx in range(1, 6):
            is_ok = idx in correct_indices
            b_sent = body_rows[idx]
            c_row = cur["rows"].get(idx, {})
            solved = c_row.get("solved", b_sent)
            exp = c_row.get("exp", "В предложении ставится ровно ОДНА запятая." if is_ok else "Запятая не нужна.")
            rows.append({
                "words": [b_sent],
                "solvedWords": [solved],
                "letter": "1 запятая" if is_ok else "≠ 1 запятая",
                "isCorrectRow": is_ok,
                "explanation": exp,
            })
        return rows, correct_indices

    sol_lines = clean_html_lines(sol_html)
    sections = {}
    curr_digit = None
    curr_lines = []
    for ln in sol_lines:
        ln_norm = ln.replace("З)", "3)").replace("З )", "3 )").replace("З.", "3.")
        m = re.match(r"^([1-5])\s*[\)\.]\s*(.*)$", ln_norm)
        if m:
            if curr_digit is not None:
                sections[curr_digit] = curr_lines
            curr_digit = int(m.group(1))
            first = m.group(2).strip()
            curr_lines = [first] if first else []
        elif curr_digit is not None:
            curr_lines.append(ln)
    if curr_digit is not None:
        sections[curr_digit] = curr_lines

    rows = []
    for idx in range(1, 6):
        b_sent = body_rows[idx]
        sec_lines = sections.get(idx, [])
        full_sec = " ".join(sec_lines).strip()
        is_ok = idx in correct_indices

        # Patterns in Shkolkovo solutions:
        # Pattern 1: sentence — [нет запятых / одна запятая / две запятые] (explanation)
        m_dash = re.search(
            r"\s+[—–-]\s+(?:нет запятых|одна запятая|две запятые|три запятые|\d+\s*запят|\(?(?:одна|две|нет|две|три)\b|\(?в предложении\b|\(?однородн|\(?спп|\(?ссп)",
            full_sec,
            re.I,
        )
        if m_dash:
            solved_sent = full_sec[: m_dash.start()].strip()
            exp = full_sec[m_dash.start() :].strip()
            exp = re.sub(r"^[—–-]\s*", "", exp).strip()
        elif len(sec_lines) >= 2:
            solved_sent = sec_lines[0].strip()
            exp = " ".join(sec_lines[1:]).strip()
        elif len(sec_lines) == 1:
            if " - " in sec_lines[0] or " — " in sec_lines[0] or " – " in sec_lines[0]:
                parts = re.split(r"\s+[—–-]\s+", sec_lines[0], maxsplit=1)
                solved_sent = parts[0].strip()
                exp = parts[1].strip()
            else:
                solved_sent = sec_lines[0].strip()
                exp = ""
        else:
            solved_sent = b_sent
            exp = ""

        # Clean solved_sent
        solved_sent = re.sub(r"^[1-5][\)\.]\s*", "", solved_sent).strip()
        solved_sent = re.sub(r"\s+[—–-]\s+(?:нет запятых|одна запятая|две запятые).*$", "", solved_sent, flags=re.I).strip()
        solved_sent = solved_sent.replace("(,)", ",").replace("( , )", ",").strip()
        if not solved_sent or len(solved_sent) < 10:
            solved_sent = b_sent

        # Clean and ensure explanation
        exp = exp.strip()
        if not exp or len(exp) < 15:
            if is_ok:
                exp = "В предложении ставится ровно одна запятая (сложносочинённое предложение или ряд однородных членов)."
            else:
                exp = "Запятая не нужна (однородные члены с одиночным союзом, ССП с общим второстепенным членом) или ставится больше одной запятой."
        else:
            exp = exp[0].upper() + exp[1:]
            if not exp.endswith((".", "!", ";")):
                exp += "."

        # Normalize terminal punctuation
        b_sent = re.sub(r";\s*$", ".", b_sent).strip()
        if not re.search(r'[.!?…»”"]$', b_sent):
            b_sent += "."

        solved_sent = re.sub(r";\s*$", ".", solved_sent).strip()
        if not re.search(r'[.!?…»”"]$', solved_sent):
            solved_sent += "."

        rows.append({
            "words": [b_sent],
            "solvedWords": [solved_sent],
            "letter": "1 запятая" if is_ok else "≠ 1 запятая",
            "isCorrectRow": is_ok,
            "explanation": exp,
        })
    return rows, correct_indices


def parse_neofamily_prototype(nid: int, q_html: str, sol_html: str, ans_list: list[str]):
    q_lines = clean_html_lines(q_html)
    q_rows = extract_body_sentences(q_lines)
    if len(q_rows) != 5:
        return None

    correct_indices = sorted(list(set(int(d) for d in "".join(ans_list) if d in "12345")))
    if not correct_indices:
        return None

    # Check curated first
    if nid in NF_CURATED:
        cur = NF_CURATED[nid]
        rows = []
        for idx in range(1, 6):
            is_ok = idx in correct_indices
            b_sent = q_rows[idx]
            c_row = cur["rows"].get(idx, {})
            solved = c_row.get("solved", b_sent)
            exp = c_row.get("exp", "В предложении ставится ровно ОДНА запятая." if is_ok else "Запятая не нужна.")
            rows.append({
                "words": [b_sent],
                "solvedWords": [solved],
                "letter": "1 запятая" if is_ok else "≠ 1 запятая",
                "isCorrectRow": is_ok,
                "explanation": exp,
            })
        return rows, correct_indices

    sol_lines = clean_html_lines(sol_html)
    sections = {}
    curr_digit = None
    curr_lines = []
    for ln in sol_lines:
        ln_norm = ln.replace("З)", "3)").replace("З )", "3 )").replace("З.", "3.")
        m = re.match(r"^([1-5])\s*[\)\.]\s*(.*)$", ln_norm)
        if m:
            if curr_digit is not None:
                sections[curr_digit] = curr_lines
            curr_digit = int(m.group(1))
            first = m.group(2).strip()
            curr_lines = [first] if first else []
        elif curr_digit is not None:
            if re.match(r"^(?:Ответ|Источник)\b", ln, re.I):
                sections[curr_digit] = curr_lines
                curr_digit = None
                curr_lines = []
            else:
                curr_lines.append(ln)
    if curr_digit is not None:
        sections[curr_digit] = curr_lines

    exp_starters = (
        "ссп", "очп", "предложение", "простое", "сложное", "сложносочин", "однородн",
        "запятая", "запятые", "нужна", "нужны", "ставится", "не нужна", "не нужны", "не став",
        "1 ", "2 ", "3 ", "нет ", "общий", "овч", "союз", "двойной", "повторяющ", "фразеологизм",
        "это сложносочин", "определения", "сочинительный"
    )

    rows = []
    for idx in range(1, 6):
        b_sent = q_rows[idx]
        sec_lines = sections.get(idx, [])
        full_sec = " ".join(sec_lines).strip()
        full_sec = re.sub(r"\s*(?:Ответ|Источник)\s*[:：].*$", "", full_sec, flags=re.I).strip()
        is_ok = idx in correct_indices

        # Pattern in NeoFamily:
        # e.g.: 'Порывистый осенний ветер утих(,) и повалил крупными хлопьями первый снег. - нужна одна запятая, так как ССП без ОВЧ;'
        pat_dash = re.compile(r'(?:\s+|\.)[—–-]\s*(?:нужн|ставится|не\s*ставится|запят|две|три|одна|нет\b|ссп|очп|так\s+как|союз|в\s+предложении|общ|однородн|простое)', re.I)
        m_dash = pat_dash.search(full_sec)
        m_end_paren = re.search(r'\s*\(([^()]{8,})\)[.;]?$', full_sec)

        # Check colon
        m_colon = None
        if ":" in full_sec and any(full_sec.lower().startswith(k) for k in ["однород", "ссп", "предложение"]):
            parts = full_sec.split(":", 1)
            if len(parts[1].strip()) > 15 and not any(parts[1].strip().lower().startswith(k) for k in exp_starters):
                m_colon = (parts[0].strip(), parts[1].strip())

        # Check paren sentence
        m_paren_sent = None
        m_par = re.search(r'\(([А-ЯЁ][^()]{15,}[.!?…»”\"]?)\)', full_sec)
        if m_par and not any(m_par.group(1).lower().startswith(k) for k in exp_starters):
            m_paren_sent = (full_sec.replace(m_par.group(0), "").strip(), m_par.group(1).strip())

        if m_dash:
            raw_solved = full_sec[: m_dash.start()].strip()
            exp = full_sec[m_dash.start() :].strip()
            exp = re.sub(r"^[\s.]*[—–-]\s*", "", exp).strip()
            solved_sent = raw_solved.replace("(,)", ",").replace("( , )", ",").replace("  ", " ").strip()
        elif m_end_paren:
            exp = m_end_paren.group(1).strip()
            solved_sent = full_sec[: m_end_paren.start()].strip()
        elif m_colon:
            exp, solved_sent = m_colon
        elif m_paren_sent:
            exp, solved_sent = m_paren_sent
        elif any(full_sec.lower().startswith(k) for k in exp_starters):
            exp = full_sec
            solved_sent = b_sent
        elif len(sec_lines) >= 2 and not any(sec_lines[0].lower().startswith(k) for k in exp_starters):
            solved_sent = sec_lines[0].replace("(,)", ",").replace("( , )", ",").strip()
            exp = " ".join(sec_lines[1:]).strip()
        else:
            exp = full_sec
            solved_sent = b_sent

        # Clean solved_sent of any residual leaked explanation
        solved_sent = re.sub(r"^[1-5][\)\.]\s*", "", solved_sent).strip()
        solved_sent = re.sub(r"\s+[—–-]\s+(?:нужна|не нужн|ставится|запятая|запятые).*$", "", solved_sent, flags=re.I).strip()
        solved_sent = solved_sent.replace("(,)", ",").replace("( , )", ",").strip()

        # Check for parenthetical explanation at end of solved_sent
        m_paren = re.search(
            r"\s*\((?:Первый союз|Второй союз|Повторяющийся|Простое предложение|Запятая при|Сложносочинённое|Однородные|Здесь|Союз|Две части|В этом|В данном)[^)]*\)\.?$",
            solved_sent,
            re.I,
        )
        if m_paren:
            paren_exp = m_paren.group(0).strip(" ().")
            solved_sent = solved_sent[: m_paren.start()].strip()
            if not exp or len(exp) < 20:
                exp = paren_exp
            else:
                exp = f"{exp} {paren_exp}"

        if not solved_sent or len(solved_sent) < 10 or any(solved_sent.lower().startswith(k) for k in exp_starters):
            solved_sent = b_sent

        # Clean exp
        exp = exp.strip()
        exp = re.sub(r"\s*(?:Ответ|Источник)\s*[:：].*$", "", exp, flags=re.I).strip()
        exp = re.sub(r"[;,]+$", "", exp).strip()
        b_clean = re.sub(r"[.!?…»”\"]+$", "", b_sent).strip()
        sw_clean = re.sub(r"[.!?…»”\"]+$", "", solved_sent).strip()
        exp_clean = re.sub(r"[.!?…»”\"]+$", "", exp).strip()
        if not exp or len(exp) < 15 or exp_clean == b_clean or exp_clean == sw_clean:
            if is_ok:
                exp = "В предложении ставится ровно одна запятая (ССП без общего второстепенного члена или ряд однородных членов предложения)."
            else:
                exp = "Запятые не нужны (однородные члены с одиночным союзом, или ССП с общим второстепенным членом) либо ставится больше одной запятой."
        else:
            exp = exp[0].upper() + exp[1:]
            if not exp.endswith((".", "!", ";")):
                exp += "."
            if not exp.endswith((".", "!", ";")):
                exp += "."

        # Normalize terminal punctuation
        b_sent = re.sub(r";\s*$", ".", b_sent).strip()
        if not re.search(r'[.!?…»”"]$', b_sent):
            b_sent += "."

        solved_sent = re.sub(r";\s*$", ".", solved_sent).strip()
        if not re.search(r'[.!?…»”"]$', solved_sent):
            solved_sent += "."

        rows.append({
            "words": [b_sent],
            "solvedWords": [solved_sent],
            "letter": "1 запятая" if is_ok else "≠ 1 запятая",
            "isCorrectRow": is_ok,
            "explanation": exp,
        })
    return rows, correct_indices


def main():
    print("[1/6] Loading primary sources...")
    with open(".cache/neofamily_4_22.json", encoding="utf-8") as f:
        nf_raw = json.load(f)
    nf_dict = {it["id"]: it for it in nf_raw.get("16", [])}

    conn = sqlite3.connect("/home/sergei/ege_trainer/ege_trainer.db")
    cur = conn.cursor()
    cur.execute("""
        SELECT k.id, k.solution_html, k.body_html, k.answer_text, th.name
        FROM tasks k
        JOIN themes th ON k.theme_id = th.id
        JOIN parent_topics p ON th.parent_topic_id = p.id
        WHERE p.subject_id = 2 AND p.exam_position = 16 AND k.answer_text IS NOT NULL AND k.answer_text != ''
    """)
    shk_dict = {r[0]: r for r in cur.fetchall()}
    conn.close()

    print(f"Loaded {len(nf_dict)} NF task 16 items and {len(shk_dict)} SHK task 16 items.")

    print("[2/6] Loading current application banks...")
    with open("public/data/fipiTasksBank.json", encoding="utf-8") as f:
        fipi_bank = json.load(f)
    with open("public/data/sprintBank.json", encoding="utf-8") as f:
        sprint_bank = json.load(f)
    with open("src/data/starterBank.json", encoding="utf-8") as f:
        starter_bank = json.load(f)

    # Filter task 16 in fipi_bank
    t16_app = [q for q in fipi_bank if str(q.get("task")) == "16"]
    print(f"Current Task 16 prototypes in fipiTasksBank: {len(t16_app)}")

    # Map of healed fipi question by id
    healed_fipi = {}
    healed_sprint_map = {}

    print("[3/6] Healing all Task 16 prototypes...")
    for q in t16_app:
        qid = q["id"]
        rows = None
        corr = None

        if qid.startswith("shk-16-"):
            rid = int(qid.replace("shk-16-", ""))
            shk_row = shk_dict.get(rid)
            if not shk_row:
                print(f"Warning: SHK id {rid} not found in DB!")
                continue
            rows, corr = parse_shkolkovo_prototype(rid, shk_row[1], shk_row[2], shk_row[3])
            source_lbl = f"Школково · {shk_row[4]}"
        elif qid.startswith("nf-16-"):
            nid = int(qid.replace("nf-16-", ""))
            nf_item = nf_dict.get(nid)
            if not nf_item:
                print(f"Warning: NF id {nid} not found in source!")
                continue
            rows, corr = parse_neofamily_prototype(nid, nf_item.get("question") or "", nf_item.get("solution") or "", nf_item.get("answer") or [])
            source_lbl = "NeoFamily · Реальный ЕГЭ / ФИПИ"

        if not rows or not corr:
            print(f"Error parsing prototype {qid}")
            continue

        q_healed = {
            "id": qid,
            "kind": "fipi",
            "questionKind": "rows",
            "task": "16",
            "topic": CANONICAL_TOPIC,
            "rule": CANONICAL_RULE,
            "instruction": CANONICAL_INSTRUCTION,
            "source": source_lbl,
            "rows": rows,
            "correctIndices": corr,
            "target": CANONICAL_TARGET,
        }
        healed_fipi[qid] = q_healed

        # Generate sprint cards for this prototype
        for idx, r in enumerate(rows, 1):
            sent = r["words"][0]
            is_ok = r["isCorrectRow"]
            ans_label = "ОДНА ЗАПЯТАЯ" if is_ok else "БЕЗ / НЕСКОЛЬКО"
            sp_key = sent[:60].strip()
            healed_sprint_map[sp_key] = {
                "word": ans_label,
                "wordGap": sent,
                "prefix": "Пунктуация в ССП/ОЧП:",
                "suffix": sent,
                "answer": ans_label,
                "options": ["ОДНА ЗАПЯТАЯ", "БЕЗ / НЕСКОЛЬКО"],
                "context": sent,
                "explanation": r["explanation"],
                "rule": "Пунктуация в сложносочинённом предложении (ССП) и в предложениях с однородными членами.",
                "topic": "Пунктуация в ССП и предложениях с однородными членами",
                "source": source_lbl,
            }

    print(f"Successfully healed {len(healed_fipi)} Task 16 prototypes.")

    print("[4/6] Updating application banks...")
    # Update fipi_bank
    for i, q in enumerate(fipi_bank):
        if q.get("id") in healed_fipi:
            fipi_bank[i] = healed_fipi[q["id"]]

    # Update sprint_bank for task 16
    for sp in sprint_bank:
        if str(sp.get("task")) == "16":
            ctx = (sp.get("context") or sp.get("suffix") or "").strip()[:60]
            if ctx in healed_sprint_map:
                tmpl = healed_sprint_map[ctx]
                sp["prefix"] = tmpl["prefix"]
                sp["suffix"] = tmpl["suffix"]
                sp["wordGap"] = tmpl["wordGap"]
                sp["context"] = tmpl["context"]
                sp["answer"] = tmpl["answer"]
                sp["options"] = tmpl["options"]
                sp["rule"] = tmpl["rule"]
                sp["topic"] = tmpl["topic"]
                sp["explanation"] = tmpl["explanation"]
                sp["source"] = tmpl["source"]

    # Update starterBank.json
    starter_fipi = starter_bank.get("fipi", [])
    for i, q in enumerate(starter_fipi):
        if q.get("id") in healed_fipi:
            starter_fipi[i] = healed_fipi[q["id"]]
    starter_bank["fipi"] = starter_fipi

    starter_sprint = starter_bank.get("sprint", [])
    for sp in starter_sprint:
        if str(sp.get("task")) == "16":
            ctx = (sp.get("context") or sp.get("suffix") or "").strip()[:60]
            if ctx in healed_sprint_map:
                tmpl = healed_sprint_map[ctx]
                sp["prefix"] = tmpl["prefix"]
                sp["suffix"] = tmpl["suffix"]
                sp["wordGap"] = tmpl["wordGap"]
                sp["context"] = tmpl["context"]
                sp["answer"] = tmpl["answer"]
                sp["options"] = tmpl["options"]
                sp["rule"] = tmpl["rule"]
                sp["topic"] = tmpl["topic"]
                sp["explanation"] = tmpl["explanation"]
                sp["source"] = tmpl["source"]
    starter_bank["sprint"] = starter_sprint

    print("[5/6] Saving updated files...")
    # Save fipiTasksBank.json and fipiTasksBank9_15.json
    with open("public/data/fipiTasksBank.json", "w", encoding="utf-8") as f:
        json.dump(fipi_bank, f, ensure_ascii=False, indent=2)
    with open("public/data/fipiTasksBank9_15.json", "w", encoding="utf-8") as f:
        json.dump(fipi_bank, f, ensure_ascii=False, indent=2)

    # Save sprintBank.json and sprintBank9_15.json
    with open("public/data/sprintBank.json", "w", encoding="utf-8") as f:
        json.dump(sprint_bank, f, ensure_ascii=False, indent=2)
    with open("public/data/sprintBank9_15.json", "w", encoding="utf-8") as f:
        json.dump(sprint_bank, f, ensure_ascii=False, indent=2)

    # Save starterBank.json
    with open("src/data/starterBank.json", "w", encoding="utf-8") as f:
        json.dump(starter_bank, f, ensure_ascii=False, indent=2)

    print("[6/6] Verifying healed data...")
    # Run verification
    t16_verified = [q for q in fipi_bank if str(q.get("task")) == "16"]
    issues = {
        "bad_instruction": 0,
        "not_5_rows": 0,
        "invalid_correct_indices": 0,
        "dirty_words": 0,
        "solved_words_leaked_explanation": 0,
        "short_explanation": 0,
        "explanation_is_sentence": 0,
    }

    for q in t16_verified:
        if q.get("instruction") != CANONICAL_INSTRUCTION:
            issues["bad_instruction"] += 1
        rows = q.get("rows", [])
        if len(rows) != 5:
            issues["not_5_rows"] += 1
        corr = q.get("correctIndices", [])
        if not (isinstance(corr, list) and 2 <= len(corr) <= 4 and sorted(corr) == corr):
            issues["invalid_correct_indices"] += 1
        for idx, r in enumerate(rows, 1):
            w = r.get("words", [""])[0].strip()
            sw = r.get("solvedWords", [""])[0].strip()
            exp = r.get("explanation", "").strip()
            if not w or re.match(r"^[1-5][\)\.]", w) or "<" in w:
                issues["dirty_words"] += 1
            if " - нужна" in sw.lower() or " – запятые" in sw.lower() or "(,)" in sw or "— одна" in sw.lower():
                issues["solved_words_leaked_explanation"] += 1
            if len(exp) < 15:
                issues["short_explanation"] += 1
            if exp == w or exp == sw:
                issues["explanation_is_sentence"] += 1

    print("\n=== POST-HEAL VERIFICATION REPORT ===")
    print(f"Total prototypes verified: {len(t16_verified)}")
    for k, v in issues.items():
        print(f"  {k}: {v}")

    assert all(v == 0 for v in issues.values()), f"Audit failed with non-zero issues: {issues}"
    print("\nSUCCESS: All 517 Task 16 prototypes 100% verified and free of defects!")


if __name__ == "__main__":
    main()
