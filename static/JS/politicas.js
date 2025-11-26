document.addEventListener('DOMContentLoaded', () => {
    // Burger / nav
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

    // Menu de perfil
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