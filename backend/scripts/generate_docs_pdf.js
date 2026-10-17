// Generates the School Management System user manual PDF.
// Usage: node scripts/generate_docs_pdf.js
// Output: docs/SMS_User_Manual.pdf
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const OUT = path.join(__dirname, '..', '..', 'docs', 'SMS_User_Manual.pdf');

// ── palette ──
const INK = '#1A1A1A';
const BODY = '#3C3C43';
const MUTED = '#8A8F98';
const ACCENT = '#5E6AD2';
const BORDER = '#E3E4E8';
const SOFT = '#F7F8F9';
const CODE_BG = '#F2F3F5';
const DOC_DATE = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ══════════════════════════════════════════════════════════════════════
//  DOCUMENT CONTENT
// ══════════════════════════════════════════════════════════════════════
const { DOC } = require('../src/content/manual.content');

// ══════════════════════════════════════════════════════════════════════
//  RENDERER — single-column, no sidebar, clickable contents + bookmarks
// ══════════════════════════════════════════════════════════════════════

// geometry
const PW = 595.28;
const PH = 841.89;
const M = 44;
const COL = 462;                 // content column width
const C_X = Math.round((PW - COL) / 2);
const C_W = COL;
const TOP = 84;

// flat chapter list
const FLAT = [];
DOC.forEach((part) => part.chapters.forEach((ch) => FLAT.push({ partName: part.part, short: part.short, title: ch.title, blocks: ch.blocks })));

function render(tocCount, chapterPages, final) {
  const doc = new PDFDocument({
    margin: 0, size: 'A4', bufferPages: true,
    info: { Title: 'School Management System — User Manual', Author: 'EnglesTech Plc', Subject: 'Mount Olive School SMS', Keywords: 'school management system, user manual' },
  });

  let y = 0;
  const pendingLinks = [];
  const setY = (v) => { y = v; };
  const need = (h) => { if (y + h > PH - 58) { doc.addPage(); setY(TOP); } };
  const rule = (yy, color = BORDER, w = 0.7) => doc.moveTo(C_X, yy).lineTo(C_X + C_W, yy).lineWidth(w).stroke(color);

  // running header
  const header = () => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(ACCENT).text('Mount Olive School', M, 34, { width: 240, lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('School Management System', M, 45, { width: 240, lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(DOC_DATE, PW - M - 130, 39, { width: 130, align: 'right', lineBreak: false });
    doc.moveTo(M, 62).lineTo(PW - M, 62).lineWidth(0.7).stroke(BORDER);
  };

  // ── block renderers ──
  const para = (t) => {
    doc.font('Helvetica').fontSize(10.2);
    const h = doc.heightOfString(t, { width: C_W, lineGap: 4.5 });
    need(h + 11);
    doc.font('Helvetica').fontSize(10.2).fillColor(BODY).text(t, C_X, y, { width: C_W, lineGap: 4.5 });
    setY(y + h + 11);
  };
  const h2 = (t) => {
    const h = doc.font('Helvetica-Bold').fontSize(13).heightOfString(t, { width: C_W, lineGap: 2 });
    need(h + 22);
    setY(y + 12);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(INK).text(t, C_X, y, { width: C_W, lineGap: 2 });
    setY(y + h + 8);
  };
  const ul = (items) => {
    for (const it of items) {
      const w = C_W - 16;
      const h = doc.font('Helvetica').fontSize(10.2).heightOfString(it, { width: w, lineGap: 4.5 });
      need(h + 5);
      doc.circle(C_X + 3.2, y + 5.6, 1.7).fill(ACCENT);
      doc.font('Helvetica').fontSize(10.2).fillColor(BODY).text(it, C_X + 16, y, { width: w, lineGap: 4.5 });
      setY(y + h + 5);
    }
    setY(y + 6);
  };
  // numbered steps: number in a fixed gutter, text hanging-indented (no overlap)
  const steps = (items) => {
    const digits = String(items.length).length;
    const gut = 14 + digits * 7;
    items.forEach((it, i) => {
      const w = C_W - gut;
      const h = doc.font('Helvetica').fontSize(10.2).heightOfString(it, { width: w, lineGap: 4.5 });
      need(h + 7);
      doc.font('Helvetica-Bold').fontSize(10.2).fillColor(ACCENT).text(`${i + 1}.`, C_X + 2, y, { width: gut - 6, lineBreak: false });
      doc.font('Helvetica').fontSize(10.2).fillColor(BODY).text(it, C_X + gut, y, { width: w, lineGap: 4.5 });
      setY(y + h + 7);
    });
    setY(y + 7);
  };
  const note = (t) => {
    const pad = 10;
    const w = C_W - pad * 2 - 16;
    const h = doc.font('Helvetica').fontSize(9.8).heightOfString(t, { width: w, lineGap: 4.5 });
    need(h + pad * 2 + 14);
    doc.rect(C_X, y, C_W, h + pad * 2).fill('#FAFAFC');
    doc.rect(C_X, y, 2.5, h + pad * 2).fill(ACCENT);
    doc.font('Helvetica').fontSize(9.8).fillColor(BODY).text(t, C_X + pad + 6, y + pad, { width: w, lineGap: 4.5 });
    setY(y + h + pad * 2 + 14);
  };
  const cellH = (cells, colW) => Math.max(...cells.map((c, i) => doc.font('Helvetica').fontSize(9.2).heightOfString(String(c ?? ''), { width: colW[i] - 12, lineGap: 3.2 }))) + 11;
  const distribute = (head, rows, width) => {
    const n = head.length;
    const w = head.map((_, i) => {
      let m = String(head[i]).length;
      for (const r of rows) m = Math.max(m, String(r[i] ?? '').length);
      return Math.min(Math.max(m, 10), 44);
    });
    const tot = w.reduce((a, b) => a + b, 0);
    const out = w.map((x) => Math.max(54, (x / tot) * width));
    const diff = width - out.reduce((a, b) => a + b, 0);
    out[out.length - 1] += diff;
    return out;
  };
  const table = (head, rows) => {
    const colW = distribute(head, rows, C_W);
    let hh = cellH(head, colW);
    need(hh + 10);
    doc.rect(C_X, y, C_W, hh).fill(SOFT);
    let cx = C_X;
    head.forEach((c, i) => {
      doc.font('Helvetica-Bold').fontSize(9.2).fillColor(INK).text(String(c), cx + 7, y + 6, { width: colW[i] - 12, lineGap: 3.2 });
      cx += colW[i];
    });
    doc.moveTo(C_X, y + hh).lineTo(C_X + C_W, y + hh).lineWidth(0.7).stroke(BORDER);
    setY(y + hh);
    rows.forEach((row) => {
      const rh = cellH(row, colW);
      if (y + rh > PH - 58) { doc.addPage(); setY(TOP); }
      cx = C_X;
      row.forEach((c, i) => {
        doc.font('Helvetica').fontSize(9.2).fillColor(BODY).text(String(c ?? ''), cx + 7, y + 6, { width: colW[i] - 12, lineGap: 3.2 });
        cx += colW[i];
      });
      setY(y + rh);
      doc.moveTo(C_X, y).lineTo(C_X + C_W, y).lineWidth(0.5).stroke(BORDER);
    });
    doc.moveTo(C_X, y).lineTo(C_X + C_W, y).lineWidth(0.7).stroke(BORDER);
    setY(y + 14);
  };
  const drawBlocks = (blocks) => {
    for (const b of blocks) {
      if (b.t === 'p') para(b.text);
      else if (b.t === 'h' || b.t === 'h2') h2(b.text);
      else if (b.t === 'ul') ul(b.items);
      else if (b.t === 'steps') steps(b.items);
      else if (b.t === 'note') note(b.text);
      else if (b.t === 'table') table(b.head, b.rows);
    }
  };

  // ═══ COVER ═══
  doc.rect(0, 0, PW, PH).fill('#FFFFFF');
  doc.rect(0, 0, PW, 5).fill(ACCENT);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(ACCENT).text('MOUNT OLIVE SCHOOL', M, 100, { width: 400, characterSpacing: 1.4 });
  doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('ENGLISH MEDIUM', M, 114, { width: 400, characterSpacing: 1.4 });
  doc.moveTo(M, 136).lineTo(PW - M, 136).lineWidth(0.7).stroke(BORDER);

  doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('USER MANUAL', M, 174, { width: 400, characterSpacing: 1.2 });
  doc.font('Helvetica-Bold').fontSize(34).fillColor(INK).text('School Management\nSystem', M, 196, { width: 440, lineGap: 4 });
  doc.font('Helvetica').fontSize(13).fillColor(BODY).text('Everything each role can do, and how to do it.', M, 296, { width: 420, lineGap: 3 });
  doc.moveTo(M, 334).lineTo(M + 46, 334).lineWidth(2).stroke(ACCENT);

  const meta = [['Document', 'User Manual'], ['Audience', 'All roles'], ['Chapters', String(FLAT.length)], ['Version', '1.0'], ['Date', DOC_DATE], ['Prepared by', 'EnglesTech Plc']];
  let my = 366;
  for (const [k, v] of meta) {
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(k, M, my, { width: 130, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INK).text(v, M + 130, my, { width: 260, lineBreak: false });
    my += 19;
  }
  doc.font('Helvetica').fontSize(8.8).fillColor(MUTED).text(
    'This manual is organised the way the system is: the foundations, then a chapter for each role\n' +
    'covering every screen that role can open, then the day-to-day workflows, then reporting\n' +
    'and administration. Use the contents page to jump to a chapter.',
    M, PH - 150, { width: 420, lineGap: 4.5 }
  );
  doc.moveTo(M, PH - 82).lineTo(PW - M, PH - 82).lineWidth(0.7).stroke(BORDER);
  doc.font('Helvetica').fontSize(8.2).fillColor(MUTED).text(`${DOC.length} parts  ·  ${FLAT.length} chapters  ·  EnglesTech Plc`, M, PH - 64, { width: 420, lineBreak: false });

  // ═══ CONTENTS (clickable) ═══
  const rows = [];
  let lastPart = null;
  FLAT.forEach((c, i) => {
    if (c.partName !== lastPart) { rows.push({ part: c.partName, i }); lastPart = c.partName; }
    rows.push({ title: c.title, i });
  });
  const perPage = 30;
  const needed = Math.max(1, Math.ceil(rows.length / perPage));
  const tocPages = tocCount || 0;

  if (tocPages > 0) {
    for (let pg = 0; pg < tocPages; pg++) {
      doc.addPage();
      setY(TOP);
      if (pg === 0) {
        header();
        doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text('CONTENTS', C_X, y, { width: C_W, characterSpacing: 0.8 });
        setY(y + 26);
        doc.font('Helvetica-Bold').fontSize(22).fillColor(INK).text('Contents', C_X, y, { width: C_W });
        setY(y + 34);
        rule(y, ACCENT, 1.4);
        setY(y + 18);
        doc.font('Helvetica').fontSize(9).fillColor(MUTED)
          .text('Every chapter title below is a link — click it to jump straight to that chapter.', C_X, y, { width: C_W });
        setY(y + 20);
      } else {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(INK).text('Contents (continued)', C_X, y, { width: C_W });
        setY(y + 18);
        rule(y, BORDER, 0.7);
        setY(y + 14);
      }
      const slice = rows.slice(pg * perPage, (pg + 1) * perPage);
      for (const r of slice) {
        if (r.part) {
          doc.font('Helvetica-Bold').fontSize(8.2).fillColor(INK).text(r.part.toUpperCase(), C_X, y, { width: C_W - 40, characterSpacing: 0.7, lineBreak: false });
          setY(y + 16);
        } else {
          const label = r.title;
          const pgNo = chapterPages[r.i];
          const labelW = doc.font('Helvetica').fontSize(10).widthOfString(label);
          const numW = doc.font('Helvetica').fontSize(10).widthOfString(String(pgNo || ''));
          doc.font('Helvetica').fontSize(10).fillColor(ACCENT).text(label, C_X + 8, y, { width: C_W - 40, lineBreak: false });
          doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(String(pgNo || ''), C_X + C_W - numW, y, { width: numW + 2, align: 'right', lineBreak: false });
          // dotted leader
          const startX = C_X + 12 + labelW + 6;
          const endX = C_X + C_W - numW - 6;
          if (endX > startX) {
            doc.save().strokeColor('#D5D7DC').lineWidth(0.6).dash(0.6, { space: 2.2 })
              .moveTo(startX, y + 6.5).lineTo(endX, y + 6.5).stroke().undash().restore();
          }
          // internal link covering the whole row
          if (pgNo) pendingLinks.push({ onPage: doc.bufferedPageRange().count - 1, target: pgNo - 1, x: C_X, y: y - 3.5, w: C_W, h: 18 });
          setY(y + 16.5);
        }
      }
    }
  }

  // ═══ CHAPTERS ═══
  LAST_CHAPTER_PAGES.length = 0;
  FLAT.forEach((c) => {
    doc.addPage();
    setY(TOP);
    header();
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(c.partName.toUpperCase(), C_X, y, { width: C_W, characterSpacing: 0.8 });
    setY(y + 22);
    doc.font('Helvetica-Bold').fontSize(24).fillColor(INK).text(c.title, C_X, y, { width: C_W, lineGap: 2 });
    const th = doc.heightOfString(c.title, { width: C_W, lineGap: 2 });
    setY(y + th + 13);
    rule(y, ACCENT, 1.4);
    setY(y + 18);
    LAST_CHAPTER_PAGES.push(doc.bufferedPageRange().count);
    drawBlocks(c.blocks);
  });

  // ═══ BOOKMARKS ═══
  if (final) {
    try {
      DOC.forEach((part) => {
        const firstIdx = FLAT.findIndex((c) => c.partName === part.part);
        if (firstIdx < 0) return;
        const partItem = doc.outline.addItem(part.part, { pageNumber: CHAPTER_PAGES[firstIdx] - 1, expanded: true });
        part.chapters.forEach((ch) => {
          const i = FLAT.findIndex((c) => c.title === ch.title && c.partName === part.part);
          if (i < 0) return;
          if (partItem && typeof partItem.addItem === 'function') partItem.addItem(ch.title, { pageNumber: CHAPTER_PAGES[i] - 1 });
          else doc.outline.addItem(ch.title, { pageNumber: CHAPTER_PAGES[i] - 1 });
        });
      });
    } catch (e) { /* bookmarks are optional */ }
  }

  // ═══ FOOTERS ═══
  const range = doc.bufferedPageRange();
  for (let i = 1; i < range.count; i++) {
    doc.switchToPage(i);
    for (const l of pendingLinks) {
      if (l.onPage === i) {
        try { doc.link(l.x, l.y, l.w, l.h, l.target); } catch (e) { /* ignore */ }
      }
    }
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
      .text('School Management System  ·  User Manual  ·  EnglesTech Plc', M, PH - 34, { width: 320, lineBreak: false });
    const s = String(i + 1);
    const w = doc.font('Helvetica').fontSize(7.5).widthOfString(s);
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(s, PW - M - w - 2, PH - 34, { width: w + 4, align: 'right', lineBreak: false });
  }
  return doc;
}

// ── pass 1: measure chapters without contents ──
const LAST_CHAPTER_PAGES = [];
render(0, {}, false);
const relPages = LAST_CHAPTER_PAGES.slice();

// contents row count: one row per chapter + one row per part heading
const perPage = 30;
let rowsCount = 0;
let lastPartProbe = null;
FLAT.forEach((c) => { if (c.partName !== lastPartProbe) { rowsCount++; lastPartProbe = c.partName; } rowsCount++; });
const TOC_PAGES = Math.max(1, Math.ceil(rowsCount / perPage));

// absolute page of each chapter once the contents pages are inserted
const CHAPTER_PAGES = relPages.map((p) => p + TOC_PAGES);

// ── pass 2: final render with contents page numbers + bookmarks ──
const finalDoc = render(TOC_PAGES, CHAPTER_PAGES, true);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
finalDoc.pipe(fs.createWriteStream(OUT));
finalDoc.end();
console.log('PDF written to', OUT);
console.log('contents pages:', TOC_PAGES, '| chapters:', FLAT.length);