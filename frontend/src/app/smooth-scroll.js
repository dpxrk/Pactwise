'use client';

// Enhanced smooth scrolling with custom easing
export function initSmoothScroll() {
  // Custom easing function for smoother animation
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  }

  // Smooth scroll to element
  function smoothScrollTo(target, duration = 1000) {
    const targetElement = document.querySelector(target);
    if (!targetElement) return;

    const startPosition = window.pageYOffset;
    const targetPosition = targetElement.getBoundingClientRect().top + startPosition - 80; // 80px offset for fixed nav
    const distance = targetPosition - startPosition;
    const startTime = performance.now();

    function animation(currentTime) {
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      window.scrollTo(0, startPosition + distance * easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animation);
      }
    }

    requestAnimationFrame(animation);
  }

  // Add smooth scroll to all anchor links
  function handleSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('href');
        
        // Only smooth scroll for internal anchors
        if (target && target !== '#' && document.querySelector(target)) {
          smoothScrollTo(target, 800);
          
          // Update URL without jumping
          if (history.pushState) {
            history.pushState(null, null, target);
          }
        }
      });
    });
  }

  // Initialize on DOM content loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleSmoothScroll);
  } else {
    handleSmoothScroll();
  }

  // Reinitialize on navigation (for SPA)
  const observer = new MutationObserver(() => {
    handleSmoothScroll();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Scroll-based animations
export function initScrollAnimations() {
  // Intersection Observer for fade-in animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe elements for scroll animations
  const animateElements = document.querySelectorAll('.card-3d, .hero-3d');
  animateElements.forEach(el => observer.observe(el));

  // Parallax effect for floating elements
  let ticking = false;

  function updateParallax() {
    const scrolled = window.pageYOffset;
    const parallaxElements = document.querySelectorAll('.floating-3d');
    
    parallaxElements.forEach((element, index) => {
      const rate = scrolled * -0.5 * (index + 1) * 0.2;
      element.style.transform = `translateY(${rate}px) rotateY(${scrolled * 0.02}deg)`;
    });
    
    ticking = false;
  }

  function requestParallaxTick() {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }

  window.addEventListener('scroll', requestParallaxTick);
}

// Initialize everything
export function initScrollEffects() {
  initSmoothScroll();
  initScrollAnimations();
}