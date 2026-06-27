/* ═══════════════════════════════════════════════════════════
   FocusFlow Pro — Main JavaScript
   Handles: drag-and-drop Kanban, task CRUD, toast system,
            Web Audio ambient engine, modal management
   ═══════════════════════════════════════════════════════════ */

// ─── TOAST ───────────────────────────────────────────────────

function showToast(message, type = 'default') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ─── WEB AUDIO AMBIENT ENGINE ────────────────────────────────

let _actx = null;
let _sndNodes = [];
let _sndOn = false;
let _sndType = localStorage.getItem('ambientType') || 'rain';

function getAudioCtx() {
  if (!_actx) {
    _actx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _actx;
}

function killNodes() {
  _sndNodes.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch (_) {} });
  _sndNodes = [];
}

function spawnAmbient(ctx, type) {
  const sr = ctx.sampleRate, len = sr * 4;
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      d[i] = type === 'rain'   ? (last + 0.022 * w) / 1.022 * 3.4
           : type === 'forest' ? (last + 0.042 * w) / 1.042 * 1.9
           : type === 'cafe'   ? w * 0.52
           : w; // white
      last = d[i];
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  const flt = ctx.createBiquadFilter();
  if      (type === 'rain')   { flt.type = 'bandpass'; flt.frequency.value = 680; flt.Q.value = 0.85; }
  else if (type === 'forest') { flt.type = 'lowpass';  flt.frequency.value = 490; }
  else if (type === 'cafe')   { flt.type = 'peaking';  flt.frequency.value = 1200; flt.gain.value = 3; }
  else                        { flt.type = 'lowpass';  flt.frequency.value = 3800; }

  const gain = ctx.createGain();
  gain.gain.value = { rain: 0.28, forest: 0.21, cafe: 0.14, white: 0.055 }[type] ?? 0.15;

  src.connect(flt);
  flt.connect(gain);
  gain.connect(ctx.destination);
  src.start();
  return [src, flt, gain];
}

function initAmbientUI() {
  // Sync active button
  document.querySelectorAll('.sound-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sound === _sndType);
    btn.addEventListener('click', () => {
      _sndType = btn.dataset.sound;
      localStorage.setItem('ambientType', _sndType);
      document.querySelectorAll('.sound-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.sound === _sndType)
      );
      if (_sndOn) {
        killNodes();
        _sndNodes = spawnAmbient(getAudioCtx(), _sndType);
      }
    });
  });

  document.querySelectorAll('.sound-toggle').forEach(btn => {
    btn.classList.toggle('on', _sndOn);
    btn.textContent = _sndOn ? '🔊 Playing' : '🔇 Off';
    btn.addEventListener('click', () => {
      if (_sndOn) {
        killNodes();
        _sndOn = false;
      } else {
        const ctx = getAudioCtx();
        if (ctx.state === 'suspended') ctx.resume();
        _sndNodes = spawnAmbient(ctx, _sndType);
        _sndOn = true;
      }
      document.querySelectorAll('.sound-toggle').forEach(b => {
        b.classList.toggle('on', _sndOn);
        b.textContent = _sndOn ? '🔊 Playing' : '🔇 Off';
      });
    });
  });
}

// ─── DRAG & DROP ─────────────────────────────────────────────

function initDragAndDrop() {
  document.addEventListener('dragstart', e => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    card.classList.add('dragging');
    e.dataTransfer.setData('text/plain', card.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
  });

  document.addEventListener('dragend', e => {
    const card = e.target.closest('.task-card');
    if (card) card.classList.remove('dragging');
    document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));
  });

  document.querySelectorAll('.kanban-column').forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', e => {
      if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over');
    });
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const taskId = e.dataTransfer.getData('text/plain');
      if (!taskId) return;
      const newStatus = col.dataset.status;
      const card = document.querySelector(`.task-card[data-id="${taskId}"]`);
      if (card) {
        card.classList.remove('dragging');
        const list = col.querySelector('.task-list');
        list.appendChild(card);
        // Remove empty placeholder if needed
        const empty = list.querySelector('.empty-column');
        if (empty) empty.remove();
      }
      fetch('/update_task_status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `id=${taskId}&status=${newStatus}`,
      })
        .then(r => r.json())
        .then(d => { if (!d.success) showToast('Failed to update status', 'error'); })
        .catch(() => showToast('Network error', 'error'));
    });
  });
}

// ─── ADD TASK MODAL ──────────────────────────────────────────

function buildTaskCard(data) {
  const tagsHtml = data.tags
    ? data.tags.split(',').map(t => t.trim()).filter(Boolean)
        .map(t => `<span class="tag-badge">${t}</span>`).join('')
    : '';
  return `
    <div class="task-card" data-id="${data.id}" data-priority="${data.priority}" data-tags="${data.tags}" draggable="true">
      <div class="priority-strip ${data.priority}"></div>
      <div class="task-topline">
        <span class="task-title">${escHtml(data.title)}</span>
        <div class="task-actions">
          <a href="/timer?task_id=${data.id}" class="icon-btn focus" title="Focus Timer">⏱</a>
          <button class="icon-btn edit-task" data-id="${data.id}" title="Edit Task">✏</button>
          <button class="icon-btn delete-task danger" data-id="${data.id}" title="Delete Task">×</button>
        </div>
      </div>
      ${data.description ? `<p class="task-desc">${escHtml(data.description)}</p>` : ''}
      <div class="task-footer">
        <div class="task-tags">${tagsHtml}</div>
        <span class="pomodoro-badge">🍅 ×0</span>
      </div>
    </div>`;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function initAddTaskModal() {
  // Open buttons: "+ New task" header btn and column "+" buttons
  document.querySelectorAll('[data-open-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      const defaultStatus = btn.dataset.openAdd || 'todo';
      openAddModal(defaultStatus);
    });
  });

  const modal = document.getElementById('add-task-modal');
  if (!modal) return;

  // Segment buttons — status
  modal.querySelectorAll('.status-btns .seg-btn').forEach(b => {
    b.addEventListener('click', () => {
      modal.querySelectorAll('.status-btns .seg-btn').forEach(x => x.style.cssText = '');
      const col = { todo: '#818cf8', doing: '#fbbf24', done: '#2dd4bf' }[b.dataset.val] || '#818cf8';
      b.style.background = col + '25';
      b.style.color = col;
      b.style.outline = `1px solid ${col}60`;
      modal.dataset.status = b.dataset.val;
    });
  });

  // Segment buttons — priority
  modal.querySelectorAll('.priority-btns .seg-btn').forEach(b => {
    b.addEventListener('click', () => {
      modal.querySelectorAll('.priority-btns .seg-btn').forEach(x => x.style.cssText = '');
      const col = { urgent:'#ff6b6b', high:'#f87171', medium:'#fbbf24', low:'#2dd4bf' }[b.dataset.val] || '#fbbf24';
      b.style.background = col + '22';
      b.style.color = col;
      b.style.outline = `1px solid ${col}55`;
      modal.dataset.priority = b.dataset.val;
    });
  });

  // Tag input
  const tagInput = modal.querySelector('#add-tag-input');
  const tagArea  = modal.querySelector('#add-tags-area');
  let tags = [];

  function addTag(val) {
    val = val.trim();
    if (!val || tags.includes(val)) return;
    tags.push(val);
    const span = document.createElement('span');
    span.className = 'tag-badge';
    span.style.cursor = 'pointer';
    span.textContent = val + ' ×';
    span.addEventListener('click', () => {
      tags = tags.filter(t => t !== val);
      span.remove();
    });
    tagArea.insertBefore(span, tagInput);
    tagInput.value = '';
  }

  tagInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput.value); }
  });

  // Submit
  modal.querySelector('#add-task-submit')?.addEventListener('click', () => {
    const title = modal.querySelector('#add-title').value.trim();
    if (!title) { showToast('Title is required', 'error'); return; }
    const status   = modal.dataset.status   || 'todo';
    const priority = modal.dataset.priority || 'medium';
    const description = modal.querySelector('#add-description').value;

    fetch('/add_task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&priority=${priority}&status=${status}&tags=${encodeURIComponent(tags.join(','))}`,
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const list = document.querySelector(`.kanban-column[data-status="${data.status}"] .task-list`);
          if (list) {
            list.querySelector('.empty-column')?.remove();
            list.insertAdjacentHTML('afterbegin', buildTaskCard(data));
          }
          closeAddModal();
          showToast('Task added ✓', 'success');
        } else {
          showToast('Failed to add task', 'error');
        }
      })
      .catch(() => showToast('Network error', 'error'));
  });

  modal.querySelector('.modal-close')?.addEventListener('click', closeAddModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeAddModal(); });
}

function openAddModal(defaultStatus = 'todo') {
  const modal = document.getElementById('add-task-modal');
  if (!modal) return;
  // Reset
  modal.querySelector('#add-title').value = '';
  modal.querySelector('#add-description').value = '';
  modal.querySelector('#add-tag-input').value = '';
  modal.querySelectorAll('#add-tags-area .tag-badge').forEach(el => el.remove());
  modal.dataset.status   = defaultStatus;
  modal.dataset.priority = 'medium';

  // Reset seg btns
  modal.querySelectorAll('.status-btns .seg-btn').forEach(b => {
    b.style.cssText = '';
    if (b.dataset.val === defaultStatus) b.click();
  });
  modal.querySelectorAll('.priority-btns .seg-btn').forEach(b => {
    b.style.cssText = '';
    if (b.dataset.val === 'medium') b.click();
  });

  modal.classList.add('open');
  modal.querySelector('#add-title').focus();
}
function closeAddModal() {
  document.getElementById('add-task-modal')?.classList.remove('open');
}

// ─── EDIT TASK ───────────────────────────────────────────────

function initEditTask() {
  const modal   = document.getElementById('edit-task-modal');
  if (!modal) return;
  const form    = document.getElementById('edit-task-form');
  const closeBtn = modal.querySelector('.modal-close');

  document.addEventListener('click', e => {
    const btn = e.target.closest('.edit-task');
    if (!btn) return;
    const id   = btn.dataset.id;
    const card = document.querySelector(`.task-card[data-id="${id}"]`);
    if (!card) return;

    document.getElementById('edit-task-id').value          = id;
    document.getElementById('edit-task-title').value       = card.querySelector('.task-title')?.textContent?.trim() || '';
    document.getElementById('edit-task-description').value = card.querySelector('.task-desc')?.textContent?.trim() || '';
    document.getElementById('edit-task-priority').value    = card.dataset.priority || 'medium';
    document.getElementById('edit-task-tags').value        = card.dataset.tags || '';
    modal.classList.add('open');
  });

  closeBtn?.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });

  form?.addEventListener('submit', e => {
    e.preventDefault();
    const id          = document.getElementById('edit-task-id').value;
    const title       = document.getElementById('edit-task-title').value.trim();
    const description = document.getElementById('edit-task-description').value;
    const priority    = document.getElementById('edit-task-priority').value;
    const tags        = document.getElementById('edit-task-tags').value;

    fetch('/edit_task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `id=${id}&title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&priority=${priority}&tags=${encodeURIComponent(tags)}`,
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const card = document.querySelector(`.task-card[data-id="${id}"]`);
          if (card) {
            card.querySelector('.task-title').textContent = title;
            card.dataset.priority = priority;
            card.dataset.tags = tags;
            card.querySelector('.priority-strip').className = `priority-strip ${priority}`;
            const descEl = card.querySelector('.task-desc');
            if (description) {
              if (descEl) { descEl.textContent = description; descEl.style.display = ''; }
              else {
                const p = document.createElement('p');
                p.className = 'task-desc';
                p.textContent = description;
                card.querySelector('.task-topline').after(p);
              }
            } else if (descEl) {
              descEl.remove();
            }
            // Rebuild tags
            const footer = card.querySelector('.task-footer .task-tags');
            if (footer) {
              footer.innerHTML = tags
                ? tags.split(',').map(t => t.trim()).filter(Boolean)
                    .map(t => `<span class="tag-badge">${escHtml(t)}</span>`).join('')
                : '';
            }
          }
          modal.classList.remove('open');
          showToast('Task updated ✓', 'success');
        } else {
          showToast('Failed to update task', 'error');
        }
      })
      .catch(() => showToast('Network error', 'error'));
  });
}

// ─── DELETE TASK ─────────────────────────────────────────────

function initDeleteButtons() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.delete-task');
    if (!btn) return;
    const id = btn.dataset.id;
    if (!confirm('Delete this task?')) return;
    fetch('/delete_task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `id=${id}`,
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          btn.closest('.task-card')?.remove();
          showToast('Task removed.', 'error');
        } else {
          showToast('Failed to delete task', 'error');
        }
      })
      .catch(() => showToast('Network error', 'error'));
  });
}

// ─── INIT ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initDragAndDrop();
  initAddTaskModal();
  initEditTask();
  initDeleteButtons();
  initAmbientUI();

  // Refresh sidebar session count live
  fetch('/get_stats').then(r => r.json()).then(d => {
    const el = document.getElementById('sidebar-sessions');
    if (el) el.textContent = `🍅 ${d.today_sessions} sessions`;
    const el2 = document.getElementById('sidebar-active');
    if (el2) el2.textContent = `📋 ${d.active_count} tasks`;
    const el3 = document.getElementById('sidebar-streak');
    if (el3) el3.textContent = `🔥 ${d.streak} days`;
  }).catch(() => {});
});
