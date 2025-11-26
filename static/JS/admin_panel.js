document.addEventListener('DOMContentLoaded', () => {
    const perfilBtn = document.getElementById('perfilBtn');
    const profileMenu = document.getElementById('profileMenu');

    if (perfilBtn && profileMenu) {
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
    }

    const actionCards = document.querySelectorAll('.admin-action-card');
    actionCards.forEach(card => {
        card.addEventListener('mousedown', () => card.classList.add('pressed'));
        card.addEventListener('mouseup', () => card.classList.remove('pressed'));
        card.addEventListener('mouseleave', () => card.classList.remove('pressed'));
    });



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
            if (!nav.contains(e.target) &&
                !burgerBtn.contains(e.target) &&
                nav.classList.contains('active')) {
                nav.classList.remove('active');
            }
        });
    }
});
