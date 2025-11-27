document.addEventListener("DOMContentLoaded", () => {
    setupInteractions()
})

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
}

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