document.addEventListener('DOMContentLoaded', () => {
  let currentMediaItems = [];
  let currentMediaIndex = 0;
  let currentGameCard = null;
  let currentPurchase = null;
  let paypalButtonsInstance = null;



  const gallery = document.getElementById('game-gallery');

  (function setupPerfilDropdown() {
    const perfilBtn = document.getElementById('perfilBtn');
    const profileMenu = document.getElementById('profileMenu');
    if (!perfilBtn || !profileMenu) return;

    perfilBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('active');
      const opened = profileMenu.classList.contains('active');
      perfilBtn.setAttribute('aria-expanded', opened ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
      if (!profileMenu.contains(e.target) && !perfilBtn.contains(e.target)) {
        profileMenu.classList.remove('active');
        perfilBtn.setAttribute('aria-expanded', 'false');
      }
    });
  })();

  (function setupCategoryFilter() {
    const pills = Array.from(document.querySelectorAll('.cat-pill'));
    const cards = Array.from(document.querySelectorAll('.game-card'));
    const noRes = document.getElementById('no-results');
    if (!pills.length || !cards.length) return;

    function applyFilter(cat) {
      let visibleCount = 0;
      cards.forEach((card) => {
        const c = (card.dataset.category || '').toLowerCase();
        const match = cat === 'all' || c === cat;
        card.classList.toggle('hidden', !match);
        if (match) visibleCount++;
      });
      if (noRes) {
        noRes.classList.toggle('hidden', visibleCount > 0);
      }
    }

    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const cat = (pill.dataset.cat || 'all').toLowerCase();
        applyFilter(cat);
      });
    });

    applyFilter('all');
  })();

  const overlay = document.getElementById('overlay');
  const drawer = document.getElementById('paymentDrawer');
  const drawerTitle = document.getElementById('drawerGameTitle');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
  const finishLaterBtn = document.getElementById('finishLaterBtn');

  const optPaypal = document.getElementById('optPaypal');
  const optPix = document.getElementById('optPix');
  const paypalSection = document.getElementById('paypalSection');
  const pixSection = document.getElementById('pixSection');

  const pixQrImage = document.getElementById('pixQrImage');
  const pixCopyInput = document.getElementById('pixCopy');
  const pixStatus = document.getElementById('pixStatus');
  const copyPixBtn = document.getElementById('copyPixBtn');
  const genPixBtn = document.getElementById('genPixBtn');

  function openDrawer() {
    if (!overlay || !drawer || !currentPurchase) return;
    drawerTitle.textContent = currentPurchase.title || 'Jogo';
    overlay.classList.add('visible');
    drawer.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }

  function closeDrawer() {
    if (!overlay || !drawer) return;
    overlay.classList.remove('visible');
    drawer.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  }

  function selectMethod(method) {
    if (method === 'paypal') {
      if (!optPaypal || !paypalSection) return;

      optPaypal.classList.add('active');
      paypalSection.classList.remove('hidden');
      ensurePayPalButtons();

      if (optPix) optPix.classList.remove('active');
      if (pixSection) pixSection.classList.add('hidden');

    } else if (method === 'pix') {
      if (!optPix || !pixSection) return;

      optPix.classList.add('active');
      pixSection.classList.remove('hidden');

      if (optPaypal) optPaypal.classList.remove('active');
      if (paypalSection) paypalSection.classList.add('hidden');
    }
  }


  if (overlay) {
    overlay.addEventListener('click', () => {
      closeDrawer();
    });
  }
  if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
  if (cancelPaymentBtn) cancelPaymentBtn.addEventListener('click', closeDrawer);
  if (finishLaterBtn) {
    finishLaterBtn.addEventListener('click', () => {
      alert('Pagamento será finalizado depois. (Fluxo PIX / manual simulado)');
      closeDrawer();
    });
  }

  if (optPaypal) {
    optPaypal.addEventListener('click', () => selectMethod('paypal'));
  }
  if (optPix) {
    optPix.addEventListener('click', () => selectMethod('pix'));
  }

  if (genPixBtn) {
    genPixBtn.addEventListener('click', () => {
      if (!currentPurchase) {
        alert('Nenhum jogo selecionado.');
        return;
      }
      const fakeCode = `PIX-${currentPurchase.id}-${Date.now()}`;
      if (pixCopyInput) pixCopyInput.value = fakeCode;
      if (pixStatus) pixStatus.textContent = 'PIX gerado (simulado). Copie o código e pague no seu app.';
      if (pixQrImage) pixQrImage.classList.add('hidden');
    });
  }

  if (copyPixBtn && pixCopyInput) {
    copyPixBtn.addEventListener('click', () => {
      pixCopyInput.select();
      try {
        document.execCommand('copy');
        pixStatus && (pixStatus.textContent = 'Código PIX copiado!');
      } catch (e) {
        pixStatus && (pixStatus.textContent = 'Não foi possível copiar automaticamente.');
      }
    });
  }

  function ensurePayPalButtons() {
    if (paypalButtonsInstance) return;
    if (typeof paypal === 'undefined') {
      console.warn('PayPal SDK não carregado.');
      return;
    }
    const container = document.getElementById('paypal-button-container');
    if (!container) return;

    paypalButtonsInstance = paypal.Buttons({
      createOrder: function (data, actions) {
        if (!currentPurchase) {
          return actions.reject();
        }
        const value = (currentPurchase.price || 0).toFixed(2);
        return actions.order.create({
          purchase_units: [{
            amount: { value }
          }]
        });
      },
      onApprove: function (data, actions) {
        return actions.order.capture().then(function () {
          if (!currentPurchase) return;
          // registra compra na Cronos
          fetch(`/comprar/${currentPurchase.id}`, {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
          })
            .then(r => r.json().then(d => ({ ok: r.ok, d })))
            .then(({ ok, d }) => {
              if (ok && !d.error) {
                marcarComoAdquirido(currentPurchase.id);
                alert('Compra concluída! Jogo adicionado à biblioteca.');
                closeDrawer();
              } else {
                alert('Pagamento aprovado no PayPal, mas houve erro ao registrar a compra.');
              }
            })
            .catch(() => {
              alert('Erro de rede ao registrar compra após o PayPal.');
            });
        });
      },
      onError: function (err) {
        console.error('Erro PayPal', err);
        alert('Erro no PayPal. Tente novamente.');
      }
    });

    paypalButtonsInstance.render('#paypal-button-container');
  }

  function marcarComoAdquirido(gameId) {
    const btns = document.querySelectorAll(`.comprar-btn[data-game-id="${gameId}"]`);
    btns.forEach((b) => {
      b.disabled = true;
      b.textContent = 'Adquirido';
      b.classList.add('disabled');
    });

    document.querySelectorAll(`.game-card[data-id="${gameId}"]`).forEach(card => {
      card.dataset.owned = '1';
    });
  }

  function comprarGratuito(gameId, btn) {
    if (!gameId) return;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Processando...';

    fetch(`/comprar/${gameId}`, {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (ok && !d.error) {
          marcarComoAdquirido(gameId);
          alert('Jogo adicionado à sua biblioteca!');
        } else {
          alert('Não foi possível concluir a obtenção do jogo.');
          btn.disabled = false;
          btn.textContent = originalText;
        }
      })
      .catch(() => {
        alert('Erro de rede ao obter o jogo.');
        btn.disabled = false;
        btn.textContent = originalText;
      });
  }

  function handleComprarClick(btn) {
    const card = btn.closest('.game-card');
    if (!card) return;

    const gameId = parseInt(btn.dataset.gameId || '0', 10);
    const price = parseFloat(btn.dataset.price || '0');
    const title = card.dataset.title || 'Jogo';
    const isFree = card.dataset.free === '1' || price <= 0;

    if (!gameId) return;

    if (card.dataset.owned === '1' || btn.disabled) {
      return;
    }

    if (isFree) {
      comprarGratuito(gameId, btn);
    } else {
      currentPurchase = {
        id: gameId,
        title,
        price: isNaN(price) ? 0 : price,
        card
      };
      selectMethod('paypal');
      openDrawer();
    }
  }

  const gmodal = document.getElementById('gameDetailsModal');
  const gmodalStage = document.getElementById('gmodalStage');
  const gmodalThumbs = document.getElementById('gmodalThumbs');
  const gmodalSmallCover = document.getElementById('gmodalSmallCover');
  const gmodalTitle = document.getElementById('gmodalTitle');
  const gmodalDesc = document.getElementById('gmodalDesc');
  const gmodalTags = document.getElementById('gmodalTags');
  const gmodalBuyBtn = document.getElementById('gmodalBuy');
  const gmodalPlayLink = document.getElementById('gmodalPlay');

  function closeModal() {
    if (!gmodal) return;
    gmodal.classList.remove('show');
    gmodal.setAttribute('aria-hidden', 'true');
    if (gmodalStage) {
      const vids = gmodalStage.querySelectorAll('video');
      vids.forEach(v => v.pause());
    }
  }

  function renderMedia(index) {
    if (!gmodalStage || !currentMediaItems.length) return;
    index = (index + currentMediaItems.length) % currentMediaItems.length;
    currentMediaIndex = index;
    const item = currentMediaItems[index];

    gmodalStage.innerHTML = '';

    if (item.type === 'image') {
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.alt || '';
      gmodalStage.appendChild(img);
    } else if (item.type === 'video') {
      const video = document.createElement('video');
      video.src = item.src;
      video.controls = true;
      video.autoplay = true;
      gmodalStage.appendChild(video);
    }

    if (gmodalThumbs) {
      Array.from(gmodalThumbs.querySelectorAll('.gmodal__thumb')).forEach((thumb, i) => {
        thumb.classList.toggle('is-active', i === currentMediaIndex);
      });
    }
  }

  function openModalForCard(card) {
    if (!gmodal) return;

    currentGameCard = card;
    currentMediaItems = [];
    currentMediaIndex = 0;

    const title = card.dataset.title || 'Jogo';
    const desc = card.dataset.desc || '';
    const cover = card.dataset.cover || card.querySelector('img.card-img-top')?.src || '';
    const cat = card.dataset.category || '';
    const trailer = card.dataset.trailer || '';

    const imgsStr = card.dataset.images || '';
    const vidsStr = card.dataset.videos || '';

    if (gmodalTitle) gmodalTitle.textContent = title;
    if (gmodalDesc) gmodalDesc.textContent = desc || 'Sem descrição.';
    if (gmodalSmallCover && cover) {
      gmodalSmallCover.src = cover;
    }

    if (gmodalTags) {
      gmodalTags.innerHTML = '';
      if (cat) {
        const span = document.createElement('span');
        span.className = 'badge';
        span.textContent = cat;
        gmodalTags.appendChild(span);
      }
    }

    if (trailer) {
      currentMediaItems.push({ type: 'video', src: trailer, isTrailer: true });
    }

    imgsStr.split('|').filter(Boolean).forEach((u) => {
      currentMediaItems.push({ type: 'image', src: u });
    });

    vidsStr.split('|').filter(Boolean).forEach((u) => {
      currentMediaItems.push({ type: 'video', src: u });
    });

    if (!currentMediaItems.length && cover) {
      currentMediaItems.push({ type: 'image', src: cover });
    }

    if (gmodalThumbs) {
      gmodalThumbs.innerHTML = '';
      currentMediaItems.forEach((item, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'gmodal__thumb';
        if (idx === 0) thumb.classList.add('is-active');
        thumb.dataset.index = String(idx);

        const img = document.createElement('img');
        img.src = item.src;
        img.alt = item.isTrailer ? 'Trailer' : 'Mídia';
        thumb.appendChild(img);

        if (item.type === 'video') {
          const badge = document.createElement('span');
          badge.className = 'thumb-play';
          badge.textContent = 'Vídeo';
          thumb.appendChild(badge);
        }

        thumb.addEventListener('click', () => {
          renderMedia(idx);
        });

        gmodalThumbs.appendChild(thumb);
      });
    }

    renderMedia(0);

    if (gmodalPlayLink) {
      const buildSlug = card.dataset.buildslug || '';
      const owned = card.dataset.owned === '1';
      if (buildSlug && owned) {
        gmodalPlayLink.hidden = false;
        gmodalPlayLink.textContent = 'Jogar agora';
        gmodalPlayLink.href = `/jogar/${buildSlug}`;
      } else {
        gmodalPlayLink.hidden = true;
      }
    }

    gmodal.classList.add('show');
    gmodal.setAttribute('aria-hidden', 'false');
  }

  if (gmodal) {
    gmodal.addEventListener('click', (e) => {
      const closeTarget = e.target.closest('[data-close]');
      if (closeTarget) {
        closeModal();
        return;
      }
      const navBtn = e.target.closest('.gmodal__nav');
      if (navBtn && currentMediaItems.length > 1) {
        const dir = navBtn.dataset.nav === 'next' ? 1 : -1;
        renderMedia(currentMediaIndex + dir);
      }
    });
  }

  if (gmodalBuyBtn) {
    gmodalBuyBtn.addEventListener('click', () => {
      if (!currentGameCard) return;
      const btn = currentGameCard.querySelector('.comprar-btn');
      if (btn) {
        handleComprarClick(btn);
      }
    });
  }

  if (gallery) {
    gallery.addEventListener('click', (e) => {
      const btnComprar = e.target.closest('.comprar-btn');
      if (btnComprar) {
        e.stopPropagation();
        handleComprarClick(btnComprar);
        return;
      }

      const card = e.target.closest('.game-card');
      if (card) {
        e.preventDefault();
        openModalForCard(card);
      }
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // === MENU BURGER / NAV PRINCIPAL ===
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

  // === BOTÃO DE CATEGORIAS (MOBILE) ===
  const catBtn = document.getElementById('toggleCatDrawer');
  const catDrawer = document.getElementById('catDrawer');

  if (catBtn && catDrawer) {
    catBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const opened = catDrawer.classList.toggle('open');
      catBtn.setAttribute('aria-expanded', opened ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
      if (catDrawer.classList.contains('open') &&
        !catDrawer.contains(e.target) &&
        !catBtn.contains(e.target)) {
        catDrawer.classList.remove('open');
        catBtn.setAttribute('aria-expanded', 'false');
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 992 && catDrawer.classList.contains('open')) {
        catDrawer.classList.remove('open');
        catBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }
});