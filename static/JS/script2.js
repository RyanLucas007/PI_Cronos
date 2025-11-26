document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  setupInteractions();
  setupIntersectionObserver();
  initRatingSystem();
  initNotesSystem();
  initProfileMenu();
  initCategoryFilters();
});

function createParticles() {
  const particlesContainer = document.getElementById('particles');
  const particleCount = 30;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    particle.classList.add('float');

    const size = Math.random() * 5 + 3;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;

    particle.style.left = `${Math.random() * 100}vw`;
    particle.style.top = `${Math.random() * 100}vh`;

    particle.style.animationDelay = `${Math.random() * 15}s`;

    particlesContainer.appendChild(particle);
  }
}

function setupInteractions() {
  const navButtons = document.querySelectorAll('.nav-button');
  navButtons.forEach(button => {
    button.addEventListener('mouseenter', () => {
      button.classList.add('glow');
    });

    button.addEventListener('mouseleave', () => {
      button.classList.remove('glow');
    });

    button.addEventListener('focus', () => {
      button.classList.add('glow');
    });

    button.addEventListener('blur', () => {
      button.classList.remove('glow');
    });
  });

  const gameItems = document.querySelectorAll('.leaderboard-item, .destaque-pequeno, .colecao-item');
  gameItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
      item.style.zIndex = '10';
    });

    item.addEventListener('mouseleave', () => {
      item.style.zIndex = '1';
    });
  });

  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      navButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      button.setAttribute('aria-current', 'page');
    });
  });
}

function setupIntersectionObserver() {
  const sections = document.querySelectorAll('.destaque-grande, .destaques-pequenos-container, .destaque-colecao');

  sections.forEach((section, index) => {
    setTimeout(() => {
      section.classList.add('fade-in');
    }, index * 150);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('slide-up');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1
  });

  const itemsToAnimate = document.querySelectorAll('.destaque-pequeno, .colecao-item');
  itemsToAnimate.forEach(item => {
    observer.observe(item);
  });
}

function initRatingSystem() {
  const gameRatings = document.querySelectorAll('.game-rating');
  gameRatings.forEach(ratingEl => {
    const rating = parseFloat(ratingEl.getAttribute('data-rating'));
    const ratingPercent = (rating / 5) * 100;
    ratingEl.style.setProperty('--rating-percent', `${ratingPercent}%`);
  });

  const userRatings = document.querySelectorAll('.user-rating');
  userRatings.forEach(ratingEl => {
    const rating = parseFloat(ratingEl.getAttribute('data-rating'));
    const ratingPercent = (rating / 5) * 100;
    ratingEl.style.setProperty('--user-rating-percent', `${ratingPercent}%`);
  });
}

function initNotesSystem() {
  const noteModal = document.getElementById('noteModal');
  const addNoteBtn = document.getElementById('addNoteBtn');
  const closeModal = document.getElementById('closeModal');
  const cancelNote = document.getElementById('cancelNote');
  const saveNote = document.getElementById('saveNote');
  const addNoteIcons = document.querySelectorAll('.add-note-icon');

  addNoteBtn.addEventListener('click', () => {
    noteModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  });

  addNoteIcons.forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      const gameItem = icon.closest('.colecao-item');
      const gameTitle = gameItem.querySelector('h4').textContent;

      document.getElementById('noteGame').value = gameTitle.toLowerCase().replace(/\s+/g, '-');

      noteModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  const closeNoteModal = () => {
    noteModal.classList.remove('active');
    document.body.style.overflow = 'auto';
  };

  closeModal.addEventListener('click', closeNoteModal);
  cancelNote.addEventListener('click', closeNoteModal);

  noteModal.addEventListener('click', (e) => {
    if (e.target === noteModal) {
      closeNoteModal();
    }
  });

  saveNote.addEventListener('click', () => {
    const game = document.getElementById('noteGame').value;
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteContent').value;
    const category = document.getElementById('noteCategory').value;

    if (!game || !title || !content) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const note = {
      game,
      title,
      content,
      category,
      date: new Date().toISOString()
    };

    let userNotes = JSON.parse(localStorage.getItem('userNotes') || '[]');
    userNotes.push(note);
    localStorage.setItem('userNotes', JSON.stringify(userNotes));

    alert('Anotação salva com sucesso!');
    closeNoteModal();
    document.getElementById('noteForm').reset();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && noteModal.classList.contains('active')) {
      closeNoteModal();
    }
  });
}

function initProfileMenu() {
  const profileBtn = document.getElementById('perfilBtn');
  const profileMenu = document.getElementById('profileMenu');
  let isMenuOpen = false;

  profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isMenuOpen = !isMenuOpen;

    if (isMenuOpen) {
      profileMenu.classList.add('active');
      profileBtn.setAttribute('aria-expanded', 'true');
    } else {
      profileMenu.classList.remove('active');
      profileBtn.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('click', (e) => {
    if (isMenuOpen && !profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
      profileMenu.classList.remove('active');
      profileBtn.setAttribute('aria-expanded', 'false');
      isMenuOpen = false;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMenuOpen) {
      profileMenu.classList.remove('active');
      profileBtn.setAttribute('aria-expanded', 'false');
      isMenuOpen = false;
    }
  });
}

function initCategoryFilters() {
  const categoryFilter = document.getElementById('categoryFilter');
  const sortBy = document.getElementById('sortBy');
  const gameItems = document.querySelectorAll('.colecao-item, .destaque-pequeno');

  categoryFilter.addEventListener('change', () => {
    const selectedCategory = categoryFilter.value;

    gameItems.forEach(item => {
      const itemCategory = item.getAttribute('data-category');

      if (selectedCategory === 'all' || selectedCategory === itemCategory) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  });

  sortBy.addEventListener('change', () => {
    const sortMethod = sortBy.value;
    const colecaoGrids = document.querySelectorAll('.colecao-grid');

    colecaoGrids.forEach(grid => {
      const items = Array.from(grid.querySelectorAll('.colecao-item'));

      switch (sortMethod) {
        case 'recent':
          items.sort(() => Math.random() - 0.5);
          break;
        case 'popular':
          items.sort(() => Math.random() - 0.5);
          break;
        case 'rating':
          items.sort((a, b) => {
            const aRating = parseFloat(a.querySelector('.user-rating').getAttribute('data-rating'));
            const bRating = parseFloat(b.querySelector('.user-rating').getAttribute('data-rating'));
            return bRating - aRating;
          });
          break;
        case 'alphabetical':
          items.sort((a, b) => {
            const aTitle = a.querySelector('h4').textContent;
            const bTitle = b.querySelector('h4').textContent;
            return aTitle.localeCompare(bTitle);
          });
          break;
      }

      items.forEach(item => grid.appendChild(item));
    });
  });
}