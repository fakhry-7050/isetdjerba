/* Small shared polish layer. No dependencies; safe on every page. */
(() => {
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bar = document.createElement('div');
  bar.id = 'auroraProgress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  const updateProgress = () => {
    const root = document.documentElement;
    const max = root.scrollHeight - window.innerHeight;
    const percent = max > 0 ? Math.min(100, Math.max(0, window.scrollY / max * 100)) : 0;
    bar.style.width = percent + '%';
    if (toTop) toTop.classList.toggle('visible', window.scrollY > 420);
  };

  let toTop = null;
  if (!document.querySelector('.navigator') && document.documentElement.scrollHeight > window.innerHeight + 240) {
    toTop = document.createElement('button');
    toTop.className = 'aurora-to-top';
    toTop.type = 'button';
    toTop.setAttribute('aria-label', 'Back to top');
    toTop.title = 'Back to top';
    toTop.textContent = '↑';
    toTop.addEventListener('click', () => window.scrollTo({top: 0, behavior: reduced ? 'auto' : 'smooth'}));
    document.body.appendChild(toTop);
  }

  if (!reduced && 'IntersectionObserver' in window) {
    const candidates = document.querySelectorAll('.hero-panel,.guide-grid article,.challenge-shell,.challenge-score,.admin-login,.admin-map-panel,.admin-editor,.admin-table-panel,.footer-intro,.footer-profile,.footer-social');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold: 0.08, rootMargin: '0px 0px -24px 0px'});
    candidates.forEach((el, i) => {
      el.classList.add('aurora-reveal');
      if (el.matches('.guide-grid article')) el.style.transitionDelay = (i % 3) * 70 + 'ms';
      observer.observe(el);
    });
  }

  let scheduled = false;
  window.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { updateProgress(); scheduled = false; });
  }, {passive:true});
  window.addEventListener('resize', updateProgress, {passive:true});
  window.addEventListener('pageshow', updateProgress);
  updateProgress();
})();
