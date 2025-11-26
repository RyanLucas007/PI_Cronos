document.addEventListener('DOMContentLoaded', () => {
  createParticles();
});

function createParticles() {
  const particlesContainer = document.getElementById('particles');
  if (!particlesContainer) return;

  const particleCount = 90;
  for (let i = 0; i < particleCount; i++) {
    const p = document.createElement('div');
    p.classList.add('particle', 'float');

    const size = Math.random() * 5 + 3;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;

    const hue = Math.random() * 30 + 270;
    const alpha = Math.random() * 0.3 + 0.2;
    p.style.background = `hsla(${hue}, 100%, 65%, ${alpha})`;

    p.style.left = `${Math.random() * 100}vw`;
    p.style.top = `${Math.random() * 100}vh`;

    p.style.animationDelay = `${Math.random() * 5}s`;
    p.style.animationDuration = `${Math.random() * 10 + 15}s`;

    particlesContainer.appendChild(p);
  }
}