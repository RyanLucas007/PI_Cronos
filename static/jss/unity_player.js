document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.header');
  const frameWrap = document.getElementById('frameWrap');
  const iframe = document.getElementById('gameFrame');
  const loader = document.getElementById('loader');
  const playCatcher = document.getElementById('playCatcher');
  const hotTop = document.getElementById('hotTop');
  const perfilBtn = document.getElementById('perfilBtn');
  const profileMenu = document.getElementById('profileMenu');
  if (!perfilBtn || !profileMenu) return;

  const hideHeader = () => {
    header.classList.add('is-hidden');
  };

  const showHeader = () => {
    header.classList.remove('is-hidden');
  };

  if (iframe && loader) {
    iframe.addEventListener('load', () => {
      loader.style.opacity = '0';
      setTimeout(() => (loader.style.display = 'none'), 300);
    });
  }

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

  if (playCatcher) {
    const onFirstPointerDown = (e) => {
      e.preventDefault();
      hideHeader();

      playCatcher.removeEventListener('pointerdown', onFirstPointerDown, true);
      playCatcher.parentElement && playCatcher.parentElement.removeChild(playCatcher);
    };
    playCatcher.addEventListener('pointerdown', onFirstPointerDown, true);
  }

  document.addEventListener('pointerdown', (e) => {
    if (!frameWrap.contains(e.target)) showHeader();
  });

  if (hotTop) {
    hotTop.addEventListener('mouseenter', showHeader);
    hotTop.addEventListener('pointerdown', showHeader);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') showHeader();
  });

  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange']
    .forEach(ev => document.addEventListener(ev, () => {
      const isFull =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;
      if (isFull) hideHeader(); else showHeader();
    }));
});


document.addEventListener('DOMContentLoaded', function () {
  const burgerBtn = document.getElementById('burgerBtn');
  const nav = document.getElementById('mainNav');

  if (burgerBtn && nav) {
    burgerBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      nav.classList.toggle('active');
    });

    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) && !burgerBtn.contains(e.target) && nav.classList.contains('active')) {
        nav.classList.remove('active');
      }
    });
  }
});

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

  const perfilBtn = document.getElementById('perfilBtn');
  const profileMenu = document.getElementById('profileMenu');

  if (perfilBtn && profileMenu) {
    perfilBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('active');
      perfilBtn.setAttribute(
        'aria-expanded',
        profileMenu.classList.contains('active') ? 'true' : 'false'
      );
    });

    document.addEventListener('click', (e) => {
      if (!profileMenu.contains(e.target) &&
        !perfilBtn.contains(e.target) &&
        profileMenu.classList.contains('active')) {
        profileMenu.classList.remove('active');
        perfilBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }
});