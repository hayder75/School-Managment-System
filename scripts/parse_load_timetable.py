import zipfile, re, json, os
import xml.etree.ElementTree as ET

BASE = "/home/hayder/sms/new real datat"
OUT = os.path.join(BASE, "seed")
os.makedirs(OUT, exist_ok=True)
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

def tables(path):
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read('word/document.xml'))
    out = []
    for tbl in root.iter(W + 'tbl'):
        rows = []
        for tr in tbl.findall(W + 'tr'):
            cells = []
            for tc in tr.findall(W + 'tc'):
                cells.append(' '.join(''.join(t.text or '' for t in tc.iter(W + 't')).split()))
            rows.append(cells)
        out.append(rows)
    return out

# ---- Teacher load ----
load_rows = tables(os.path.join(BASE, "Teachers Load and Codes 2019 E.C.docx"))[0]
load = []
for r in load_rows:
    if len(r) < 5 or r[1] == 'Teachers Name' or not r[1]:
        continue
    load.append({
        "teacher": r[1], "code": r[2].strip(), "subject": r[3].strip(),
        "sections_raw": r[4], "load": r[5] if len(r) > 5 else "",
    })
print("load rows:", len(load))

# ---- Timetable ----
tt = tables(os.path.join(BASE, "2019 E.C Time Table Grade 1-4.docx"))
DAYS = {"monday": "monday", "tuesday": "tuesday", "wednesday": "wednesday", "thursday": "thursday", "friday": "friday"}

def parse_grid(table, grades):
    # table[1] is the section row (A,B,C...). Build column -> (grade, section).
    section_row = table[1]
    letters = [c for c in section_row[2:] if c]
    colmap = {}
    idx = 0
    for g, count in grades:
        for _ in range(count):
            if idx < len(letters):
                colmap[2 + idx] = (g, letters[idx])
            idx += 1
    entries = []
    day = None
    for row in table[2:]:
        if len(row) < 2:
            continue
        if row[0]:
            day = DAYS.get(row[0].strip().lower())
        period = row[1].strip()
        if not day or not period.isdigit():
            continue
        for ci in range(2, len(row)):
            code = row[ci].strip()
            if not code or ci not in colmap:
                continue
            g, sec = colmap[ci]
            entries.append({"day": day, "period": int(period), "grade": g, "section": sec, "code": code})
    return entries

grid0 = parse_grid(tt[0], [(1, 6), (2, 7), (3, 7), (4, 5)])
print("timetable table0 entries:", len(grid0))

# table 1 layout: header row0 = Grade 5..8, row1 sections
section_row1 = tt[1][1]
letters1 = [c for c in section_row1[2:] if c]
colmap1 = {}
idx = 0
for g in (5, 6, 7, 8):
    for _ in range(5):
        if idx < len(letters1):
            colmap1[2 + idx] = (g, letters1[idx])
        idx += 1
grid1 = []
day = None
for row in tt[1][2:]:
    if len(row) < 2:
        continue
    if row[0]:
        day = DAYS.get(row[0].strip().lower())
    period = row[1].strip()
    if not day or not period.isdigit():
        continue
    for ci in range(2, len(row)):
        code = row[ci].strip()
        if not code or ci not in colmap1:
            continue
        g, sec = colmap1[ci]
        grid1.append({"day": day, "period": int(period), "grade": g, "section": sec, "code": code})
print("timetable table1 entries:", len(grid1))

with open(os.path.join(OUT, "teacher_load.json"), "w") as f:
    json.dump(load, f, ensure_ascii=False, indent=1)
with open(os.path.join(OUT, "timetable.json"), "w") as f:
    json.dump(grid0 + grid1, f, ensure_ascii=False, indent=1)
print("done")
