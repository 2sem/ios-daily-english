'use strict';

const LETTERS = ['a', 'b', 'c', 'd', 'e'];
const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];

const state = {
  day: '291', title: 'UIKit Sheets & Sharing', handle: '@gamehelper',
  terms: [
    { term: 'UISheetPresentationController', def: 'An object that manages the appearance and behavior of a sheet (the card-like view that slides up from the bottom) in UIKit.', example: 'I used the UISheetPresentationController to configure the half-height detent so users can still see the map behind the settings.' },
    { term: 'UIActivityItemSource', def: 'A protocol used to provide specific data (like text or images) to a share sheet depending on which app the user chooses to share to.', example: 'By implementing UIActivityItemSource, we can share a high-quality image to Instagram but a simple link to Twitter.' },
    { term: 'LPLinkMetadata', def: 'An object from the LinkPresentation framework that holds the title, icon, and preview image for a URL to create rich link previews.', example: 'We fetched the LPLinkMetadata for the website URL to display a beautiful preview card in the system share sheet.' },
  ],
  quizzes: [
    { q: 'Which object is responsible for storing the title and thumbnail image used to show a "Rich Link" preview in a share sheet?', opts: ['UISheetPresentationController', 'UIActivityItemSource', 'LPLinkMetadata'] },
    { q: 'Which controller should you use in UIKit to create a modal window that only covers the bottom half of the screen and is draggable?', opts: ['UISheetPresentationController', 'LPLinkMetadata', 'UIActivityItemSource'] },
    { q: 'Which protocol lets your app provide different versions of content (a short summary for SMS, a long one for Email) during a share action?', opts: ['LPLinkMetadata', 'UIActivityItemSource', 'UISheetPresentationController'] },
  ],
  prevDay: '290',
  answers: [
    { label: 'b', text: 'AVCaptureSession' },
    { label: 'a', text: 'AVCaptureDevice' },
    { label: 'c', text: 'AVCaptureVideoPreviewLayer' },
  ],
  reviews: [
    { term: 'AVCaptureSession', desc: 'The central controller that manages the flow of data during capture.' },
    { term: 'AVCaptureDevice', desc: 'The object representing the physical camera or microphone hardware.' },
    { term: 'AVCaptureVideoPreviewLayer', desc: 'The visual layer used to display the live camera feed on the screen.' },
  ],
  pasteText: '',
  parseMsg: '',
};

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* escapes an API name and adds <wbr> break points at camelCase / dot / underscore
   boundaries, so long terms wrap as "UICollectionView|CompositionalLayout" instead of mid-word */
function termHTML(term) {
  return String(term ?? '')
    .split(/(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])|(?<=[._])/)
    .map(esc)
    .join('<wbr>');
}

/* wraps every occurrence of `term` inside `text` in a highlighted span (case-insensitive) */
function highlightTerm(text, term) {
  const t = String(text ?? '');
  const needle = String(term ?? '').trim();
  if (!needle) return esc(t);
  const re = new RegExp(escapeRegExp(needle), 'gi');
  let out = '', lastIndex = 0, m;
  while ((m = re.exec(t))) {
    out += esc(t.slice(lastIndex, m.index));
    out += `<span style="color:#0071E3;font-weight:700">${termHTML(m[0])}</span>`;
    lastIndex = m.index + m[0].length;
  }
  out += esc(t.slice(lastIndex));
  return out;
}

/* ---------------------------------------------------------------- */
/* paste-and-parse                                                   */
/* ---------------------------------------------------------------- */

/* a term line is a bare identifier (`URLSession`, `os.Logger`) or a short
   phrase of 2–5 capitalized words (`Required Reason API`) — definitions are
   sentences, so they fail on lowercase words or trailing punctuation */
function isTermLine(line) {
  if (/^[A-Za-z][\w.]+$/.test(line)) return true;
  const words = line.split(' ');
  return words.length >= 2 && words.length <= 5 && words.every(w => /^[A-Z0-9][\w.]*$/.test(w));
}

function parsePaste(rawInput) {
  const raw = (rawInput || '').replace(/\r/g, '');
  if (!raw.trim()) return { parseMsg: 'Paste some text first.' };

  const next = {};
  const optLine = /^\s*([a-eA-E])[).:]\s*(.+)$/;

  // --- header ---
  const firstLine = raw.split('\n').find(l => l.trim()) || '';
  const dTitle = firstLine.match(/^[^A-Za-z]*([A-Za-z][A-Za-z .'&]+?)\s*[-–]\s*Day/);
  if (dTitle) next.title = dTitle[1].trim();
  const dDay = firstLine.match(/Day\s+(\d+)/i);
  if (dDay) next.day = dDay[1];

  // --- split into major sections ---
  const quizIdx = raw.search(/\n\s*Quiz\b/i);
  const ansIdx = raw.search(/Day\s+\d+\s+Answers/i);
  const noteIdx = raw.search(/\niOS note\s*:/i);
  let vocabEnd = raw.length;
  [quizIdx, noteIdx, ansIdx].forEach(x => { if (x > -1 && x < vocabEnd) vocabEnd = x; });
  const headerEnd = raw.indexOf('\n', raw.indexOf(firstLine) + firstLine.length);
  const vocabText = raw.slice(headerEnd > -1 ? headerEnd : 0, vocabEnd);

  // --- vocabulary terms ---
  // Blank lines are not treated as block separators here: some paste
  // sources (social apps, notes) inject a redundant blank line after
  // every single line, which would otherwise split one term's
  // term/def/example across several broken blocks. Instead, a new term
  // starts whenever a line looks like a term (a bare identifier, or a
  // short Title Case phrase such as "Required Reason API"); every other
  // non-blank line is folded into the current term's def/example.
  const terms = [];
  let current = null;
  vocabText.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
    if (/^(iOS note|Quiz|Quick review|✅)/i.test(line)) return;
    const candidate = line.replace(/[:：]\s*$/, '').trim();
    if (isTermLine(candidate)) {
      if (current) terms.push(current);
      current = { term: candidate, def: '', example: '' };
      return;
    }
    if (!current) return;
    const c = line.replace(/^[-•‣·]\s*/, '');
    if (/^Example\s*[:：]/i.test(c)) current.example = c.replace(/^Example\s*[:：]\s*/i, '').replace(/^["“]|["”]$/g, '').trim();
    else if (!current.def) current.def = c;
    else current.def += ' ' + c;
  });
  if (current) terms.push(current);
  if (terms.length) next.terms = terms;

  // --- quizzes ---
  if (quizIdx > -1) {
    const quizRegion = raw.slice(quizIdx, ansIdx > quizIdx ? ansIdx : raw.length);
    const chunks = quizRegion.split(/\n\s*Quiz\b[^\n]*/i).map(c => c.trim()).filter(Boolean);
    const quizzes = [];
    chunks.forEach(chunk => {
      const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
      const opts = [];
      let q = '';
      lines.forEach(l => {
        const m = l.match(optLine);
        if (m) opts.push(m[2].trim());
        else if (!opts.length) q = q ? q + ' ' + l : l;
      });
      if (q && opts.length) quizzes.push({ q, opts });
    });
    if (quizzes.length) next.quizzes = quizzes;
  }

  // --- answers + quick review ---
  if (ansIdx > -1) {
    const ansRegion = raw.slice(ansIdx);
    const pd = ansRegion.match(/Day\s+(\d+)\s+Answers/i);
    if (pd) next.prevDay = pd[1];
    const revIdx = ansRegion.search(/Quick review\s*:/i);
    const ansPart = revIdx > -1 ? ansRegion.slice(0, revIdx) : ansRegion;
    const answers = [];
    ansPart.split('\n').forEach(l => {
      const m = l.trim().match(optLine);
      if (m) answers.push({ label: m[1].toLowerCase(), text: m[2].trim() });
    });
    if (answers.length) next.answers = answers;
    if (revIdx > -1) {
      const reviews = [];
      ansRegion.slice(revIdx).split('\n').slice(1).forEach(l => {
        const c = l.trim().replace(/^[-•‣·]\s*/, '');
        const m = c.match(/^(\w[\w. ]*?)\s*[-–:：]\s*(.+)$/);
        if (m) reviews.push({ term: m[1].trim(), desc: m[2].trim() });
      });
      if (reviews.length) next.reviews = reviews;
    }
  }

  next.parseMsg = `Filled ${(next.terms || []).length} terms · ${(next.quizzes || []).length} quizzes · ${(next.answers || []).length} answers.`;
  return next;
}

/* ---------------------------------------------------------------- */
/* form templates                                                    */
/* ---------------------------------------------------------------- */

function termItemHTML(t, i) {
  return `
  <div class="item-card">
    <div class="item-card-head">
      <button class="btn-remove" data-action="remove" data-list="terms" data-index="${i}">×</button>
    </div>
    <input class="fld mono mb7" data-list="terms" data-index="${i}" data-field="term" value="${esc(t.term)}" placeholder="ClassName">
    <textarea class="fld mb7" data-list="terms" data-index="${i}" data-field="def" placeholder="Definition">${esc(t.def)}</textarea>
    <textarea class="fld" data-list="terms" data-index="${i}" data-field="example" placeholder="Example sentence">${esc(t.example)}</textarea>
  </div>`;
}

function quizItemHTML(q, i) {
  const opts = q.opts.map((o, oi) => `
    <div class="quiz-opt-row">
      <span class="quiz-opt-letter">${esc(LETTERS[oi] || '')}</span>
      <input class="fld" data-list="quizzes" data-index="${i}" data-opt="${oi}" data-field="opt" value="${esc(o)}">
    </div>`).join('');
  return `
  <div class="item-card">
    <div class="item-card-head item-card-head--between">
      <span class="mono-11">QUIZ ${i + 1}</span>
      <button class="btn-remove" data-action="remove" data-list="quizzes" data-index="${i}">×</button>
    </div>
    <textarea class="fld mb7" data-list="quizzes" data-index="${i}" data-field="q" placeholder="Question">${esc(q.q)}</textarea>
    ${opts}
  </div>`;
}

function answerItemHTML(a, i) {
  return `
  <div class="answer-row">
    <input class="fld answer-label-input" data-list="answers" data-index="${i}" data-field="label" value="${esc(a.label)}">
    <input class="fld answer-text-input" data-list="answers" data-index="${i}" data-field="text" value="${esc(a.text)}">
    <button class="btn-remove" data-action="remove" data-list="answers" data-index="${i}">×</button>
  </div>`;
}

function reviewItemHTML(r, i) {
  return `
  <div class="review-card">
    <div class="item-card-head item-card-head--between">
      <input class="fld review-term-input" data-list="reviews" data-index="${i}" data-field="term" value="${esc(r.term)}" placeholder="Term">
      <button class="btn-remove review-remove" data-action="remove" data-list="reviews" data-index="${i}">×</button>
    </div>
    <textarea class="fld" data-list="reviews" data-index="${i}" data-field="desc" placeholder="Short description">${esc(r.desc)}</textarea>
  </div>`;
}

function renderForm() {
  document.getElementById('dayField').value = state.day;
  document.getElementById('titleField').value = state.title;
  document.getElementById('prevDayField').value = state.prevDay;
  document.getElementById('pasteText').value = state.pasteText || '';
  document.getElementById('parseMsg').textContent = state.parseMsg || '';
  document.getElementById('termList').innerHTML = state.terms.map(termItemHTML).join('');
  document.getElementById('quizList').innerHTML = state.quizzes.map(quizItemHTML).join('');
  document.getElementById('answerList').innerHTML = state.answers.map(answerItemHTML).join('');
  document.getElementById('reviewList').innerHTML = state.reviews.map(reviewItemHTML).join('');
}

/* ---------------------------------------------------------------- */
/* card templates (rendered at true 1080×1350)                       */
/* ---------------------------------------------------------------- */

function buildCards() {
  const cards = [];
  cards.push({ type: 'cover' });
  state.terms.forEach(t => cards.push({ type: 'vocab', term: t.term, def: t.def, example: t.example }));
  state.quizzes.forEach((q, i) => cards.push({
    type: 'quiz', num: CIRCLED[i] || String(i + 1), q: q.q,
    opts: q.opts.map((o, oi) => ({ letter: LETTERS[oi], text: o })),
  }));
  cards.push({ type: 'answers', prevDay: state.prevDay, answers: state.answers, reviews: state.reviews });

  const total = cards.length;
  const footLeft = `iOS Daily English · Day ${state.day}`;
  cards.forEach((c, i) => {
    c.index = i;
    c.page = `${i + 1} / ${total}`;
    c.footLeft = footLeft;
  });
  return cards;
}

function coverCardHTML() {
  const terms = state.terms.map(t => `
    <div style="display:flex;align-items:flex-start;gap:16px">
      <span style="width:12px;height:12px;margin-top:14.4px;border-radius:50%;background:#0A84FF;flex:none"></span>
      <span style="font:500 34px/1.2 ui-monospace,SF Mono,Menlo;color:#C7C7CE;overflow-wrap:anywhere">${termHTML(t.term)}</span>
    </div>`).join('');
  return `
  <div style="width:100%;height:100%;padding:96px;display:flex;flex-direction:column;justify-content:space-between;background:linear-gradient(158deg,#0A0A0C 0%,#1A1A24 100%);color:#fff;box-sizing:border-box">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <span style="font:600 28px/1 -apple-system,system-ui;color:#8E8E96">iOS Daily English</span>
      <svg width="46" height="56" viewBox="0 0 384 512" fill="#EDEDF0" xmlns="http://www.w3.org/2000/svg" style="display:block"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
    </div>
    <div>
      <div style="font:600 34px/1 ui-monospace,SF Mono,Menlo;letter-spacing:.2em;color:#0A84FF;margin:0 0 8px">DAY</div>
      <div style="font:800 224px/.9 -apple-system,system-ui;letter-spacing:-.04em;margin:0 0 22px">${esc(state.day)}</div>
      <div style="font:600 52px/1.1 -apple-system,system-ui;color:#EDEDF0">${esc(state.title)}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">${terms}</div>
    <div style="display:flex;justify-content:flex-end;align-items:center;border-top:1px solid rgba(255,255,255,.12);padding-top:30px">
      <span style="font:600 30px/1 ui-monospace,SF Mono,Menlo;color:#0A84FF">${esc(state.handle)}</span>
    </div>
  </div>`;
}

function vocabCardHTML(c) {
  return `
  <div style="width:100%;height:100%;padding:96px;display:flex;flex-direction:column;background:#fff;box-sizing:border-box">
    <div style="margin:0 0 44px">
      <span data-fit-lines="2" data-fit-lines-base="40" data-fit-lines-min="26" style="display:inline-block;font:600 40px/1.15 ui-monospace,SF Mono,Menlo;color:#0071E3;background:#EAF3FE;padding:16px 24px;border-radius:16px;max-width:888px;box-sizing:border-box;overflow-wrap:anywhere;text-wrap:balance">${termHTML(c.term)}</span>
    </div>
    <div data-fit-base="46" data-fit-min="30" style="font:400 46px/1.42 -apple-system,system-ui;color:#1D1D1F;text-wrap:pretty">${esc(c.def)}</div>
    <div style="margin-top:auto;background:#F5F5F7;border-radius:22px;padding:44px 48px">
      <div style="font:600 26px/1 ui-monospace,SF Mono,Menlo;letter-spacing:.16em;color:#0071E3;margin:0 0 20px">USAGE EXAMPLE</div>
      <div data-fit-base="40" data-fit-min="26" style="font:400 40px/1.4 -apple-system,system-ui;color:#3A3A3C;text-wrap:pretty">"${highlightTerm(c.example, c.term)}"</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:44px">
      <span style="font:500 28px/1 -apple-system,system-ui;color:#B0B0B8">${esc(c.footLeft)}</span>
      <span style="font:600 28px/1 ui-monospace,SF Mono,Menlo;color:#B0B0B8">${esc(state.handle)} · ${esc(c.page)}</span>
    </div>
  </div>`;
}

function quizCardHTML(c) {
  const opts = c.opts.map(o => `
      <div style="display:flex;align-items:center;gap:28px;border:2px solid #EAEAEF;border-radius:22px;padding:34px 40px">
        <span style="width:72px;height:72px;flex:none;border-radius:50%;background:#F0F0F7;color:#5E5CE6;font:700 40px/72px ui-monospace,SF Mono,Menlo;text-align:center">${esc(o.letter)}</span>
        <span data-fit-base="42" data-fit-min="26" style="font:500 42px/1.25 -apple-system,system-ui;color:#1D1D1F;overflow-wrap:anywhere">${esc(o.text)}</span>
      </div>`).join('');
  return `
  <div style="width:100%;height:100%;padding:96px;display:flex;flex-direction:column;background:#fff;box-sizing:border-box">
    <div style="display:flex;align-items:baseline;gap:22px;margin:0 0 20px">
      <span style="font:800 96px/1 -apple-system,system-ui;color:#5E5CE6;letter-spacing:-.02em">${esc(c.num)}</span>
      <span style="font:700 42px/1 -apple-system,system-ui;color:#1D1D1F">Quiz</span>
    </div>
    <div data-fit-base="48" data-fit-min="30" style="font:600 48px/1.34 -apple-system,system-ui;color:#1D1D1F;margin:0 0 56px;text-wrap:pretty">${esc(c.q)}</div>
    <div style="display:flex;flex-direction:column;gap:24px">${opts}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:44px">
      <span style="font:500 28px/1 -apple-system,system-ui;color:#B0B0B8">${esc(c.footLeft)}</span>
      <span style="font:600 28px/1 ui-monospace,SF Mono,Menlo;color:#B0B0B8">${esc(state.handle)} · ${esc(c.page)}</span>
    </div>
  </div>`;
}

function answersCardHTML(c) {
  const answers = c.answers.map(a => `
      <div style="display:flex;align-items:center;gap:24px;background:#fff;border-radius:18px;padding:26px 32px">
        <span style="width:60px;height:60px;flex:none;border-radius:50%;background:#E4F7EC;color:#28A745;font:700 34px/60px ui-monospace,SF Mono,Menlo;text-align:center">${esc(a.label)}</span>
        <span style="font:600 40px/1.2 ui-monospace,SF Mono,Menlo;color:#1D1D1F;overflow-wrap:anywhere">${esc(a.text)}</span>
      </div>`).join('');
  const reviews = c.reviews.map(r => `
      <div>
        <span style="font:600 34px/1.3 ui-monospace,SF Mono,Menlo;color:#0071E3;overflow-wrap:anywhere">${termHTML(r.term)}</span>
        <span data-fit-base="34" data-fit-min="24" style="font:400 34px/1.3 -apple-system,system-ui;color:#3A3A3C"> — ${esc(r.desc)}</span>
      </div>`).join('');
  return `
  <div style="width:100%;height:100%;padding:96px;display:flex;flex-direction:column;background:#F5F5F7;box-sizing:border-box">
    <div style="display:flex;align-items:center;gap:18px;margin:0 0 40px">
      <span style="font-size:52px">✅</span>
      <span style="font:700 50px/1.1 -apple-system,system-ui;color:#1D1D1F">Day ${esc(c.prevDay)} Answers</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:18px;margin:0 0 44px">${answers}</div>
    <div style="font:600 26px/1 ui-monospace,SF Mono,Menlo;letter-spacing:.16em;color:#86868B;margin:0 0 22px">QUICK REVIEW</div>
    <div style="display:flex;flex-direction:column;gap:20px">${reviews}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:36px">
      <span style="font:500 28px/1 -apple-system,system-ui;color:#B0B0B8">${esc(c.footLeft)}</span>
      <span style="font:600 28px/1 ui-monospace,SF Mono,Menlo;color:#B0B0B8">${esc(state.handle)} · ${esc(c.page)}</span>
    </div>
  </div>`;
}

function cardInnerHTML(c) {
  if (c.type === 'cover') return coverCardHTML();
  if (c.type === 'vocab') return vocabCardHTML(c);
  if (c.type === 'quiz') return quizCardHTML(c);
  if (c.type === 'answers') return answersCardHTML(c);
  return '';
}

function cardColHTML(c) {
  return `
  <div class="card-col">
    <div class="card-frame">
      <div class="exportcard" data-index="${c.index}">${cardInnerHTML(c)}</div>
    </div>
    <div class="card-footer">
      <span class="card-page">${esc(c.page)}</span>
      <button class="card-pdf-btn" data-action="exportOne" data-index="${c.index}">PDF</button>
    </div>
  </div>`;
}

/* shrink an element until its text wraps to at most `data-fit-lines` lines */
function fitLines(el) {
  const maxLines = parseFloat(el.dataset.fitLines);
  const min = parseFloat(el.dataset.fitLinesMin);
  let size = parseFloat(el.dataset.fitLinesBase);
  const cs = getComputedStyle(el);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  el.style.fontSize = size + 'px';
  const lineCount = () => Math.round((el.clientHeight - padY) / parseFloat(getComputedStyle(el).lineHeight));
  while (lineCount() > maxLines && size > min) {
    size -= 1;
    el.style.fontSize = size + 'px';
  }
}

/* shrink text that would overflow its fixed-size card (long paste content) */
function fitCardText(cardEl) {
  cardEl.querySelectorAll('[data-fit-lines]').forEach(fitLines);
  const fits = () => cardEl.scrollHeight <= cardEl.clientHeight + 1;
  if (fits()) return;
  const targets = Array.from(cardEl.querySelectorAll('[data-fit-base]'));
  if (!targets.length) return;
  targets.forEach(el => { el.style.fontSize = el.dataset.fitBase + 'px'; });
  let guard = 0;
  while (!fits() && guard < 60) {
    let shrunkAny = false;
    for (const el of targets) {
      const min = parseFloat(el.dataset.fitMin);
      const cur = parseFloat(el.style.fontSize);
      if (cur > min) {
        el.style.fontSize = (cur - 1) + 'px';
        shrunkAny = true;
        if (fits()) break;
      }
    }
    if (!shrunkAny) break;
    guard++;
  }
}

function renderPreview() {
  const cards = buildCards();
  document.getElementById('cardCount').textContent = cards.length;
  document.getElementById('cardsList').innerHTML = cards.map(cardColHTML).join('');
  document.querySelectorAll('.exportcard').forEach(fitCardText);
}

/* ---------------------------------------------------------------- */
/* export (capture each card as PNG, pack into a PDF)                */
/* ---------------------------------------------------------------- */

function setExporting(isExporting) {
  document.getElementById('statusText').textContent = isExporting ? 'Rendering…' : '';
  document.getElementById('exportAllBtn').disabled = isExporting;
}

async function captureNode(node) {
  const prevT = node.style.transform, prevO = node.style.transformOrigin;
  node.style.transform = 'none';
  node.style.transformOrigin = 'top left';
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  fitCardText(node);
  let url;
  try {
    url = await window.htmlToImage.toJpeg(node, { width: 1080, height: 1350, pixelRatio: 2, quality: 0.92, cacheBust: true, backgroundColor: '#ffffff' });
  } finally {
    node.style.transform = prevT;
    node.style.transformOrigin = prevO;
  }
  return url;
}

async function exportOne(i) {
  const nodes = document.querySelectorAll('.exportcard');
  if (!nodes[i] || !window.jspdf) return;
  setExporting(true);
  try {
    const url = await captureNode(nodes[i]);
    const pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'px', format: [1080, 1350] });
    pdf.addImage(url, 'JPEG', 0, 0, 1080, 1350);
    pdf.save(`ios-day-${state.day}-page-${String(i + 1).padStart(2, '0')}.pdf`);
  } catch (e) {
    console.error(e);
  }
  setExporting(false);
}

async function exportAll() {
  const nodes = [...document.querySelectorAll('.exportcard')];
  if (!nodes.length || !window.jspdf) return;
  setExporting(true);
  try {
    const pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'px', format: [1080, 1350] });
    for (let i = 0; i < nodes.length; i++) {
      if (i > 0) pdf.addPage([1080, 1350], 'portrait');
      const url = await captureNode(nodes[i]);
      pdf.addImage(url, 'JPEG', 0, 0, 1080, 1350);
    }
    pdf.save(`ios-day-${state.day}-cards.pdf`);
  } catch (e) {
    console.error(e);
  }
  setExporting(false);
}

/* ---------------------------------------------------------------- */
/* wiring                                                             */
/* ---------------------------------------------------------------- */

function init() {
  const formPane = document.getElementById('formPane');

  formPane.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'pasteText') { state.pasteText = t.value; return; }
    if (t.id === 'dayField') { state.day = t.value; renderPreview(); return; }
    if (t.id === 'titleField') { state.title = t.value; renderPreview(); return; }
    if (t.id === 'prevDayField') { state.prevDay = t.value; renderPreview(); return; }

    const list = t.dataset.list, field = t.dataset.field;
    if (!list || !field) return;
    const i = parseInt(t.dataset.index, 10);
    if (field === 'opt') {
      const oi = parseInt(t.dataset.opt, 10);
      state.quizzes[i].opts[oi] = t.value;
    } else {
      state[list][i][field] = t.value;
    }
    renderPreview();
  });

  formPane.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'addTerm') state.terms.push({ term: '', def: '', example: '' });
    else if (action === 'addQuiz') state.quizzes.push({ q: '', opts: ['', '', ''] });
    else if (action === 'addAnswer') state.answers.push({ label: '', text: '' });
    else if (action === 'addReview') state.reviews.push({ term: '', desc: '' });
    else if (action === 'remove') state[btn.dataset.list].splice(parseInt(btn.dataset.index, 10), 1);
    else return;
    renderForm();
    renderPreview();
  });

  document.getElementById('parseBtn').addEventListener('click', () => {
    Object.assign(state, parsePaste(state.pasteText));
    renderForm();
    renderPreview();
  });

  document.getElementById('cardsList').addEventListener('click', e => {
    const btn = e.target.closest('[data-action="exportOne"]');
    if (!btn) return;
    exportOne(parseInt(btn.dataset.index, 10));
  });

  document.getElementById('exportAllBtn').addEventListener('click', exportAll);

  renderForm();
  renderPreview();
}

init();
