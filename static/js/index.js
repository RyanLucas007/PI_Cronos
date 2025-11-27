(() => {
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const perfilBtn = document.getElementById('perfilBtn');
  const profileMenu = document.getElementById('profileMenu');
  if (perfilBtn && profileMenu) {
    perfilBtn.addEventListener('click', () => profileMenu.classList.toggle('active'));
    document.addEventListener('click', (e) => {
      if (!profileMenu.contains(e.target) && !perfilBtn.contains(e.target)) {
        profileMenu.classList.remove('active');
      }
    });
  }

  const modal = document.getElementById('gameDetailsModal');
  if (!modal) return;

  const overlay = modal.querySelector('.gmodal__overlay');
  const media = document.getElementById('gmodalMedia');
  const stage = document.getElementById('gmodalStage');
  const thumbs = document.getElementById('gmodalThumbs');

  const titleEl = document.getElementById('gmodalTitle');
  const tagsEl = document.getElementById('gmodalTags');
  const descEl = document.getElementById('gmodalDesc');

  // Coluna direita
  const smallCover = document.getElementById('gmodalSmallCover');
  const dateEl = document.getElementById('gmodalDate');
  const devEl = document.getElementById('gmodalDev');
  const reviewsEl = document.getElementById('gmodalReviews');

  const playBtn = document.getElementById('gmodalPlay');
  const buyBtn = document.getElementById('gmodalBuy');
  const wishBtn = document.getElementById('gmodalWishlist');

  const navPrev = modal.querySelector('[data-nav="prev"]');
  const navNext = modal.querySelector('[data-nav="next"]');

  let gallery = [];
  let curIdx = 0;
  let cover = '';
  let opener = null;

  const ytEmbed = (url) => {
    try {
      const u = new URL(url, window.location.origin);
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.slice(1);
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      const id = u.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    } catch { return null; }
  };

  const detectKind = (url = '') => {
    if (!url) return null;
    const y = ytEmbed(url);
    if (y) return { type: 'youtube', url: y };
    if (/\.(mp4|webm|mov)$/i.test(url)) return { type: 'video', url };
    return { type: 'image', url };
  };

  const stopAndClearMedia = () => {
    stage.querySelectorAll('video').forEach(v => {
      try { v.pause(); v.removeAttribute('src'); v.load?.(); } catch { }
    });
    stage.querySelectorAll('iframe').forEach(f => { try { f.src = 'about:blank'; } catch { } });
    stage.querySelectorAll(':scope > *:not(.gmodal__nav)').forEach(n => n.remove());
  };

  const highlightThumb = (i) => {
    $$('.gmodal__thumb', thumbs).forEach((el, idx) => el.classList.toggle('is-active', idx === i));
  };

  const renderMain = (i) => {
    curIdx = Math.max(0, Math.min(i, gallery.length - 1));
    stopAndClearMedia();
    const item = gallery[curIdx]; if (!item) return;

    let node;
    if (item.type === 'youtube') {
      node = document.createElement('iframe');
      node.src = item.url;
      node.allow = 'autoplay; encrypted-media; picture-in-picture';
      node.allowFullscreen = true;
    } else if (item.type === 'video') {
      node = document.createElement('video');
      node.src = item.url;
      node.controls = true;
      node.playsInline = true;
    } else {
      node = document.createElement('img');
      node.src = item.url;
      node.alt = 'Imagem';
    }

    const anchor = stage.querySelector('.gmodal__nav--next');
    anchor ? stage.insertBefore(node, anchor) : stage.appendChild(node);

    highlightThumb(curIdx);

    const hasMany = gallery.length > 1;
    [navPrev, navNext].forEach(btn => btn.style.display = hasMany ? '' : 'none');
  };

  const renderThumbs = () => {
    thumbs.innerHTML = '';
    gallery.forEach((it, i) => {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'gmodal__thumb';
      t.setAttribute('data-kind', it.type === 'image' ? 'IMG' : 'VID');

      const img = document.createElement('img');
      img.src = (it.type === 'image') ? it.url : (cover || it.url);
      img.alt = 'thumb';
      t.appendChild(img);

      if (it.type !== 'image') {
        const p = document.createElement('span');
        p.className = 'thumb-play';
        p.textContent = '►';
        t.appendChild(p);
      }

      t.addEventListener('click', () => renderMain(i));
      thumbs.appendChild(t);
    });
    highlightThumb(curIdx);
  };

  const lockScroll = () => {
    const sw = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = sw + 'px';
    document.body.style.overflow = 'hidden';
  };
  const unlockScroll = () => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  };
  const showModal = () => { modal.classList.add('show'); lockScroll(); };
  const hideModal = () => { modal.classList.remove('show'); stopAndClearMedia(); unlockScroll(); opener?.focus?.(); };

  navNext?.addEventListener('click', () => renderMain((curIdx + 1) % gallery.length));
  navPrev?.addEventListener('click', () => renderMain((curIdx - 1 + gallery.length) % gallery.length));
  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', hideModal));
  overlay?.addEventListener('click', hideModal);

  window.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('show')) return;
    if (e.key === 'Escape') hideModal();
    else if (e.key === 'ArrowRight') renderMain((curIdx + 1) % gallery.length);
    else if (e.key === 'ArrowLeft') renderMain((curIdx - 1 + gallery.length) % gallery.length);
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.open-modal');
    if (!btn) return;

    e.preventDefault();
    opener = btn;

    const card = btn.closest('[data-id]') || btn.closest('.indie-card,.game-card') || btn;
    const ds = card.dataset || {};

    const title = ds.title || card.querySelector('h3,h5')?.textContent?.trim() || 'Jogo';
    const desc = ds.desc || card.querySelector('.desc,.card-text,p')?.textContent?.trim() || '';

    const devName = ds.dev || '';
    const published = ds.published || '';
    const reviews = parseInt(ds.reviews || '0', 10) || 0;

    cover = ds.cover || card.querySelector('img')?.getAttribute('src') || '';
    const trailer = ds.trailer || '';
    const price = parseFloat((ds.price || '0').replace(',', '.')) || 0;
    const slug = ds.buildslug || '';
    const id = ds.id || '';

    titleEl.textContent = title;
    descEl.textContent = desc;

    tagsEl.innerHTML = '';
    const tags = [];
    if (price <= 0) tags.push('GRÁTIS');
    if (slug) tags.push('WEB');
    tags.forEach(t => {
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = t;
      tagsEl.appendChild(b);
    });

    if (slug) { playBtn.hidden = false; playBtn.href = `/jogar/${slug}`; } else { playBtn.hidden = true; }
    if (id && price > 0) {
      buyBtn.hidden = false;
      buyBtn.textContent = `Comprar - R$ ${price.toFixed(2)}`;
      buyBtn.disabled = false;
      buyBtn.onclick = async () => {
        try {
          const res = await fetch(`/comprar/${id}`, { method: 'POST' });
          const data = await res.json();
          if (data.ok) { buyBtn.textContent = 'Adquirido'; buyBtn.disabled = true; }
          else alert('Não foi possível comprar agora.');
        } catch { alert('Erro de rede ao finalizar compra.'); }
      };
    } else { buyBtn.hidden = true; }

    wishBtn.onclick = () => { wishBtn.textContent = 'Na wishlist'; };

    gallery = [];
    if (ds.gallery) {
      try { JSON.parse(ds.gallery).forEach(u => { const k = detectKind(String(u)); if (k) gallery.push(k); }); } catch { }
    } else if (trailer) {
      const k = detectKind(trailer); if (k) gallery.push(k);
    } else if (cover) {
      gallery.push({ type: 'image', url: cover });
    }

    const order = { youtube: 0, video: 1, image: 2 };
    gallery.sort((a, b) => order[a.type] - order[b.type]);

    curIdx = 0;
    renderThumbs();
    renderMain(curIdx);

    if (cover) { smallCover.src = cover; smallCover.parentElement.style.display = ''; }
    else { smallCover.parentElement.style.display = 'none'; }

    const fmtDate = (s) => {
      if (!s) return '—';
      const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
      if (isNaN(d)) return s;
      return d.toLocaleDateString();
    };
    dateEl.textContent = `Publicado em ${fmtDate(published)}`;
    devEl.textContent = devName ? `Publicado por ${devName}` : 'por —';
    reviewsEl.textContent = `${reviews} análise${reviews === 1 ? '' : 's'}`;

    showModal();
  });
})();


document.addEventListener('DOMContentLoaded', function () {
  const burgerBtn = document.getElementById('burgerBtn');
  const nav = document.getElementById('mainNav');

  if (burgerBtn && nav) {
    burgerBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      nav.classList.toggle('active');
    });

    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) &&
        !burgerBtn.contains(e.target) &&
        nav.classList.contains('active')) {
        nav.classList.remove('active');
      }
    });
  }
});