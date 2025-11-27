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