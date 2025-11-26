document.addEventListener('DOMContentLoaded', () => {
  setupInteractions();
  setupIntersectionObserver();
  initModal();
  hydrateNoteGameOptions();
  setupLibraryControls();
  applySavedViewMode();
  wirePlayButtons();
  initDownloads();
});

function setupInteractions() {
  const perfilBtn = document.getElementById('perfilBtn');
  const profileMenu = document.getElementById('profileMenu');
  if (perfilBtn && profileMenu) {
    perfilBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
      if (!perfilBtn.contains(e.target) && !profileMenu.contains(e.target)) {
        profileMenu.classList.remove('active');
      }
    });
  }

  document.querySelectorAll('.nav-button').forEach((btn) => {
    btn.addEventListener('mouseenter', () => btn.classList.add('glow'));
    btn.addEventListener('mouseleave', () => btn.classList.remove('glow'));
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  const destaqueTitulo = document.querySelector('.destaque-grande h2');
  if (destaqueTitulo) destaqueTitulo.classList.add('typing');

  const destaqueBtn = document.querySelector('.destaque-btn');
  if (destaqueBtn) {
    setInterval(() => {
      destaqueBtn.classList.add('pulse');
      setTimeout(() => destaqueBtn.classList.remove('pulse'), 1600);
    }, 5000);
  }
}

function setupIntersectionObserver() {
  const options = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('slide-up');
        io.unobserve(entry.target);
      }
    });
  }, options);

  document.querySelectorAll('.destaque-pequeno, .colecao-item, .leaderboard-item').forEach(el => io.observe(el));

  const destaqueGrande = document.querySelector('.destaque-grande');
  if (destaqueGrande) setTimeout(() => destaqueGrande.classList.add('fade-in'), 300);
}

function initModal() {
  const modal = document.getElementById('noteModal');
  if (!modal) return;

  const addNoteBtn = document.getElementById('addNoteBtn');
  const closeModal = document.getElementById('closeModal');
  const cancelNote = document.getElementById('cancelNote');
  const saveNote = document.getElementById('saveNote');

  const open = () => {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  };

  if (addNoteBtn) addNoteBtn.addEventListener('click', open);
  if (closeModal) closeModal.addEventListener('click', close);
  if (cancelNote) cancelNote.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  if (saveNote) {
    saveNote.addEventListener('click', () => {
      const game = document.getElementById('noteGame').value;
      const title = document.getElementById('noteTitle').value.trim();
      const content = document.getElementById('noteContent').value.trim();
      const category = document.getElementById('noteCategory').value;

      if (!game || !title || !content) {
        alert('Preencha jogo, título e conteúdo da anotação.');
        return;
      }
      const key = `notes:${game}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push({ title, content, category, created_at: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(existing));

      alert('Anotação salva com sucesso!');
      close();
      document.getElementById('noteTitle').value = '';
      document.getElementById('noteContent').value = '';
    });
  }
}

function hydrateNoteGameOptions() {
  const select = document.getElementById('noteGame');
  if (!select) return;

  select.querySelectorAll('option:not(:first-child)').forEach(o => o.remove());

  document.querySelectorAll('#libraryRow .lib-item').forEach(card => {
    const title = card.querySelector('.card-title')?.textContent.trim();
    if (!title) return;
    const opt = document.createElement('option');
    opt.value = title.toLowerCase().replace(/\s+/g, '');
    opt.textContent = title;
    select.appendChild(opt);
  });
}

function setupLibraryControls() {
  const row = document.getElementById('libraryRow');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const sortBy = document.getElementById('sortBy');
  const viewCardsBtn = document.getElementById('viewCards');
  const viewListBtn = document.getElementById('viewList');

  if (!row) return;

  const runAll = () => { runLibraryFilters(); sortLibrary(sortBy ? sortBy.value : 'alphabetical'); };

  if (searchInput) searchInput.addEventListener('input', runLibraryFilters);
  if (categoryFilter) categoryFilter.addEventListener('change', runLibraryFilters);
  if (sortBy) sortBy.addEventListener('change', () => sortLibrary(sortBy.value));

  if (viewCardsBtn) viewCardsBtn.addEventListener('click', () => setViewMode('cards'));
  if (viewListBtn) viewListBtn.addEventListener('click', () => setViewMode('list'));

  runAll();

  function setViewMode(mode) {
    if (mode === 'list') {
      row.classList.add('list-view');
      row.classList.remove('row-cols-md-3');
      row.classList.add('row-cols-1');
      localStorage.setItem('library:view', 'list');
    } else {
      row.classList.remove('list-view');
      row.classList.add('row-cols-md-3');
      row.classList.remove('row-cols-1');
      localStorage.setItem('library:view', 'cards');
    }
  }
}

function applySavedViewMode() {
  const saved = localStorage.getItem('library:view') || 'cards';
  const row = document.getElementById('libraryRow');
  if (!row) return;
  if (saved === 'list') {
    row.classList.add('list-view');
    row.classList.remove('row-cols-md-3');
    row.classList.add('row-cols-1');
  }
}

function runLibraryFilters() {
  const row = document.getElementById('libraryRow');
  if (!row) return;

  const term = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const cat = (document.getElementById('categoryFilter')?.value || 'all').toLowerCase();

  row.querySelectorAll('.col').forEach(col => {
    const card = col.querySelector('.lib-item');
    if (!card) return;

    const title = (card.dataset.title || '').toLowerCase();
    const category = (card.dataset.category || '').toLowerCase();

    const matchTitle = !term || title.includes(term);
    const matchCat = cat === 'all' || category === cat;

    col.style.display = (matchTitle && matchCat) ? 'block' : 'none';
  });
}

function sortLibrary(criteria) {
  const row = document.getElementById('libraryRow');
  if (!row) return;

  const cols = Array.from(row.children).filter(c => c.style.display !== 'none' && c.classList.contains('col'));

  cols.sort((a, b) => {
    const ta = a.querySelector('.card-title')?.textContent.trim().toLowerCase() || '';
    const tb = b.querySelector('.card-title')?.textContent.trim().toLowerCase() || '';

    if (criteria === 'alphabetical') return ta.localeCompare(tb);
    return 0;
  });

  cols.forEach(c => row.appendChild(c));
}

function wirePlayButtons() {
  document.querySelectorAll('#libraryRow .btn-success').forEach(btn => {
    btn.addEventListener('click', () => {
      const title = btn.closest('.card').querySelector('.card-title')?.textContent || 'Jogo';
    });
  });
}

function initDownloads() {
  const AREAS = document.querySelectorAll('.download-area');
  if (!AREAS.length) return;

  AREAS.forEach(area => {
    const slug = area.dataset.slug;
    const playUrl = area.dataset.playUrl;

    if (isDownloaded(slug)) {
      renderPlay(area, playUrl);
      return;
    }

    if (isInProgress(slug)) {
      startProgressLoop(area, { resume: true });
      return;
    }
    const btn = area.querySelector('.btn-download');
    if (btn) {
      btn.addEventListener('click', () => {
        startProgressLoop(area, { resume: false });
      });
    }
  });
}

const DL_TOTAL_MS = 20000;
const LS_PREFIX = 'cronos:dl:';

function getState(slug) {
  try { return JSON.parse(localStorage.getItem(LS_PREFIX + slug) || 'null'); }
  catch { return null; }
}
function setState(slug, obj) {
  localStorage.setItem(LS_PREFIX + slug, JSON.stringify(obj));
}
function isDownloaded(slug) {
  const st = getState(slug);
  return st && st.status === 'done';
}
function isInProgress(slug) {
  const st = getState(slug);
  return st && st.status === 'in_progress';
}

function renderPlay(area, playUrl) {
  const btn = area.querySelector('.btn-download');
  const barWrap = area.querySelector('.dl-progress');
  if (btn) btn.classList.add('d-none');
  if (barWrap) barWrap.classList.add('d-none');

  const slot = area.querySelector('.play-slot');
  if (slot) {
    slot.innerHTML = '';
    const a = document.createElement('a');
    a.className = 'btn btn-primary w-100 btn-download';
    a.textContent = 'Jogar';
    a.href = playUrl;
    slot.appendChild(a);
  }
}

function startProgressLoop(area, { resume }) {
  const slug = area.dataset.slug;
  const playUrl = area.dataset.playUrl;

  const btn = area.querySelector('.btn-download');
  const barWrap = area.querySelector('.dl-progress');
  const bar = area.querySelector('.dl-progress-bar');

  if (btn) btn.classList.add('d-none');
  if (barWrap) barWrap.classList.remove('d-none');

  let startAt = Date.now();

  if (resume) {
    const st = getState(slug);
    if (st && st.started_at) {
      startAt = st.started_at;
    }
  } else {
    setState(slug, { status: 'in_progress', started_at: Date.now() });
  }

  const tick = () => {
    const st = getState(slug);
    if (!st || st.status !== 'in_progress') return;

    const elapsed = Date.now() - st.started_at;
    const pct = Math.min(100, Math.floor((elapsed / DL_TOTAL_MS) * 100));

    if (bar) {
      bar.style.width = pct + '%';
      bar.textContent = pct + '%';
      bar.setAttribute('aria-valuenow', String(pct));
    }

    if (pct >= 100) {
      setState(slug, { status: 'done', finished_at: Date.now() });
      renderPlay(area, playUrl);
      return;
    }
    requestAnimationFrame(tick);
  };

  const st = getState(slug) || {};
  if (st.status !== 'in_progress') {
    setState(slug, { status: 'in_progress', started_at: startAt });
  }
  requestAnimationFrame(tick);
}

(function () {
  const btn = document.getElementById('perfilBtn');
  const menu = document.getElementById('profileMenu');
  if (!btn || !menu) return;

  function toggleMenu(e) {
    e?.preventDefault();
    const isOpen = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
  }

  function closeMenu() {
    if (menu.classList.contains('open')) {
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  }

  btn.addEventListener('click', toggleMenu);
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
})();


document.addEventListener('DOMContentLoaded', () => {
  const burgerBtn = document.getElementById('burgerBtn');
  const mainNav = document.getElementById('mainNav');

  if (burgerBtn && mainNav) {
    burgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const opened = mainNav.classList.toggle('active');
      burgerBtn.setAttribute('aria-expanded', opened ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
      if (!mainNav.contains(e.target) &&
        !burgerBtn.contains(e.target) &&
        mainNav.classList.contains('active')) {
        mainNav.classList.remove('active');
        burgerBtn.setAttribute('aria-expanded', 'false');
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 992 && mainNav.classList.contains('active')) {
        mainNav.classList.remove('active');
        burgerBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }
});