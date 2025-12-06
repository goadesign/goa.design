/**
 * TOC Scroll Spy
 * Highlights the current visible section in the right navigation (Table of Contents)
 * Uses Intersection Observer for efficient scroll tracking
 */
(function() {
  'use strict';

  const CONFIG = {
    tocSelector: '.td-toc #TableOfContents',
    headingSelector: 'h2[id], h3[id], h4[id]',
    activeClass: 'active',
    rootMargin: '-80px 0px -70% 0px'
  };

  let observer = null;
  let tocLinks = [];
  let headings = [];

  function init() {
    const toc = document.querySelector(CONFIG.tocSelector);
    if (!toc) return;

    tocLinks = Array.from(toc.querySelectorAll('a[href^="#"]'));
    if (tocLinks.length === 0) return;

    const tocIds = tocLinks.map(link => link.getAttribute('href').slice(1));
    headings = Array.from(document.querySelectorAll(CONFIG.headingSelector))
      .filter(heading => tocIds.includes(heading.id));

    if (headings.length === 0) return;

    observer = new IntersectionObserver(handleIntersection, {
      rootMargin: CONFIG.rootMargin,
      threshold: [0, 1]
    });

    headings.forEach(heading => observer.observe(heading));
    setInitialActive();
  }

  function handleIntersection(entries) {
    const visibleEntries = entries.filter(entry => entry.isIntersecting);
    
    if (visibleEntries.length > 0) {
      visibleEntries.sort((a, b) => 
        a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top
      );
      setActiveLink(visibleEntries[0].target.id);
    } else {
      const scrollTop = window.scrollY + 100;
      let activeHeading = null;
      
      for (const heading of headings) {
        if (heading.offsetTop <= scrollTop) {
          activeHeading = heading;
        } else {
          break;
        }
      }
      
      if (activeHeading) {
        setActiveLink(activeHeading.id);
      }
    }
  }

  function setActiveLink(id) {
    tocLinks.forEach(link => link.classList.remove(CONFIG.activeClass));
    const activeLink = tocLinks.find(link => link.getAttribute('href') === `#${id}`);
    if (activeLink) {
      activeLink.classList.add(CONFIG.activeClass);
    }
  }

  function setInitialActive() {
    const scrollTop = window.scrollY + 100;
    let activeHeading = headings[0];

    for (const heading of headings) {
      if (heading.offsetTop <= scrollTop) {
        activeHeading = heading;
      } else {
        break;
      }
    }

    if (activeHeading) {
      setActiveLink(activeHeading.id);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
