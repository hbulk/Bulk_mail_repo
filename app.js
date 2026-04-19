// Bulk Mail Launcher v3

// ── Core app ──────────────────────────────────────────────
const LIMIT = 490;

// fileMap: key = unique file id, value = { name, ext, emails: [] }
let fileMap = new Map();
let fileIdCounter = 0;

// Computed merged + deduped email list across all files
function getAllEmails() {
  const seen = new Set();
  const result = [];
  for (const f of fileMap.values()) {
    for (const e of f.emails) {
      if (!seen.has(e)) { seen.add(e); result.push(e); }
    }
  }
  return result;
}

// ── Drag & Drop ───────────────────────────────────────────
const dz = document.getElementById('dz');
const fi = document.getElementById('fi');

dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('over'); });
dz.addEventListener('dragleave', ()  => dz.classList.remove('over'));
dz.addEventListener('drop', e => {
  e.preventDefault();
  dz.classList.remove('over');
  if (e.dataTransfer.files.length) {
    [...e.dataTransfer.files].forEach(f => addFile(f));
  }
});
fi.addEventListener('change', e => {
  if (e.target.files.length) {
    [...e.target.files].forEach(f => addFile(f));
    fi.value = ''; // reset so same file can be re-added after removal
  }
});

// ── Add file ──────────────────────────────────────────────
function addFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['xlsx','xls','csv'].includes(ext)) {
    showWarn('Only .xlsx, .xls, or .csv files are supported.');
    return;
  }
  const id = ++fileIdCounter;
  fileMap.set(id, { name: file.name, ext, emails: [], status: 'loading' });
  renderFileList();
  parseFile(file, id);
}

// ── Parse a single file ───────────────────────────────────
function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
}

function parseFile(file, id) {
  const reader = new FileReader();
  const isCSV = file.name.toLowerCase().endsWith('.csv');

  reader.onload = function(e) {
    try {
      let rows;
      if (isCSV) {
        const text = e.target.result;
        rows = text.split(/\r?\n/).map(line => [line.split(',')[0].trim().replace(/^"|"$/g, '')]);
      } else {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      }

      const valid = [];
      let rawRows = 0;
      rows.forEach(row => {
        const v = row[0];
        if (!v || String(v).trim() === '') return;
        rawRows++;
        if (isEmail(v)) valid.push(String(v).trim());
      });

      const entry = fileMap.get(id);
      if (entry) {
        entry.emails = [...new Set(valid)];
        entry.rawRows = rawRows;
        entry.status = 'done';
        fileMap.set(id, entry);
      }
    } catch(err) {
      const entry = fileMap.get(id);
      if (entry) { entry.status = 'error'; fileMap.set(id, entry); }
    }
    renderAll();
  };

  if (isCSV) reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
}

// ── Remove file ───────────────────────────────────────────
function removeFile(id) {
  fileMap.delete(id);
  renderAll();
}

// ── Render file list ──────────────────────────────────────
function renderFileList() {
  const container = document.getElementById('file-list');
  if (fileMap.size === 0) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }
  container.classList.remove('hidden');
  container.innerHTML = [...fileMap.entries()].map(([id, f]) => {
    const extLabel = f.ext.toUpperCase();
    const meta = f.status === 'loading'
      ? 'Parsing...'
      : f.status === 'error'
        ? 'Error reading file'
        : `${f.emails.length} valid email${f.emails.length !== 1 ? 's' : ''}`;
    return `
      <div class="file-item" id="file-item-${id}">
        <div class="file-icon ${f.ext}">${extLabel}</div>
        <div class="file-info">
          <div class="file-name">${f.name}</div>
          <div class="file-meta">${meta}</div>
        </div>
        <button class="file-remove" onclick="removeFile(${id})" title="Remove file">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>`;
  }).join('');
}

// ── Render preview + send cards ───────────────────────────
function renderAll() {
  renderFileList();

  const emails = getAllEmails();

  if (fileMap.size === 0 || emails.length === 0 && [...fileMap.values()].every(f => f.status === 'done')) {
    if (fileMap.size === 0) {
      document.getElementById('card-preview').classList.add('hidden');
      document.getElementById('card-send').classList.add('hidden');
      hideWarn();
      return;
    }
  }

  // Totals across all done files
  const totalRaw   = [...fileMap.values()].reduce((a, f) => a + (f.status === 'done' ? (f.rawRows || f.emails.length) : 0), 0);
  const totalValid = [...fileMap.values()].reduce((a, f) => a + (f.status === 'done' ? f.emails.length : 0), 0);
  const merged = getAllEmails();
  const dupes  = totalValid - merged.length;

  document.getElementById('s-total').textContent = totalRaw;
  document.getElementById('s-valid').textContent = merged.length;
  document.getElementById('s-skip').textContent  = totalRaw - totalValid;

  const body = document.getElementById('elist-body');
  body.innerHTML = merged.slice(0, 80).map(e =>
    `<div class="erow"><span class="dot"></span>${e}</div>`
  ).join('') + (merged.length > 80
    ? `<div class="erow emore">... and ${merged.length - 80} more addresses</div>`
    : '');

  document.getElementById('s-count').textContent = `${merged.length} unique found`;

  const chunks = Math.ceil(merged.length / LIMIT);
  document.getElementById('launch-note').textContent = chunks > 1
    ? `${merged.length} emails → ${chunks} Gmail windows`
    : `${merged.length} email${merged.length !== 1 ? 's' : ''} ready to send`;

  document.getElementById('card-preview').classList.remove('hidden');
  document.getElementById('card-send').classList.remove('hidden');
  hideWarn();

  if (merged.length === 0) showWarn('No valid email addresses found. Check your files.');
}

// ── Gmail URL builder ─────────────────────────────────────
function buildUrl(chunk, mode, subject) {
  const param = mode === 'bcc' ? 'bcc' : 'to';
  const addrs = encodeURIComponent(chunk.join(','));
  const subj  = encodeURIComponent(subject);
  return `https://mail.google.com/mail/?view=cm&fs=1&${param}=${addrs}&su=${subj}`;
}

// ── Launch Gmail ──────────────────────────────────────────
document.getElementById('launch-btn').addEventListener('click', () => {
  const emails = getAllEmails();
  if (!emails.length) { showWarn('No emails loaded. Please upload a file first.'); return; }

  const subject = document.getElementById('subj').value.trim();
  const mode    = document.querySelector('input[name="mode"]:checked').value;

  const chunks = [];
  for (let i = 0; i < emails.length; i += LIMIT) chunks.push(emails.slice(i, i + LIMIT));

  window.open(buildUrl(chunks[0], mode, subject), '_blank');

  const batchWrap  = document.getElementById('batch-wrap');
  const batchLinks = document.getElementById('batch-links');

  if (chunks.length > 1) {
    document.getElementById('batch-title').textContent =
      `Batch 1 opened. Click to open remaining ${chunks.length - 1} batch${chunks.length > 2 ? 'es' : ''}:`;
    batchLinks.innerHTML = chunks.slice(1).map((chunk, i) =>
      `<a class="batch-link" href="${buildUrl(chunk, mode, subject)}" target="_blank">
        Open batch ${i + 2} — ${chunk.length} emails
      </a>`
    ).join('');
    batchWrap.classList.remove('hidden');
    showWarn(`${emails.length} emails split into ${chunks.length} batches (Gmail allows ~500/send). Click each batch link above.`);
  } else {
    batchWrap.classList.add('hidden');
    hideWarn();
  }
});

// ── Reset ─────────────────────────────────────────────────
function doReset() {
  fileMap.clear();
  fi.value = '';
  document.getElementById('subj').value = '';
  document.getElementById('elist-body').innerHTML = '';
  document.getElementById('batch-wrap').classList.add('hidden');
  document.getElementById('card-preview').classList.add('hidden');
  document.getElementById('card-send').classList.add('hidden');
  document.getElementById('file-list').classList.add('hidden');
  document.getElementById('file-list').innerHTML = '';
  hideWarn();
}

// ── Warn helpers ──────────────────────────────────────────
function showWarn(msg) {
  const w = document.getElementById('warn');
  document.getElementById('warn-text').textContent = msg;
  w.classList.remove('hidden');
}
function hideWarn() {
  document.getElementById('warn').classList.add('hidden');
}
