// Inicializar Iconos Lucide
    lucide.createIcons();

    // Control de la Diapositiva Activa
    const slides = document.querySelectorAll('.slide');
    const totalSlides = slides.length;
    let currentSlideIndex = 0;

    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const progressDotsContainer = document.getElementById('progress-dots');

    // Generar dots dinámicamente
    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement('div');
      dot.classList.add('dot');
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', () => goToSlide(i));
      progressDotsContainer.appendChild(dot);
    }

    const dots = document.querySelectorAll('.dot');

    function updateControls() {
      btnPrev.disabled = currentSlideIndex === 0;
      btnNext.disabled = currentSlideIndex === totalSlides - 1;
      
      dots.forEach((dot, idx) => {
        if (idx === currentSlideIndex) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }

    function goToSlide(index) {
      slides[currentSlideIndex].classList.remove('active');
      currentSlideIndex = index;
      slides[currentSlideIndex].classList.add('active');
      updateControls();
    }

    btnPrev.addEventListener('click', () => {
      if (currentSlideIndex > 0) {
        goToSlide(currentSlideIndex - 1);
      }
    });

    btnNext.addEventListener('click', () => {
      if (currentSlideIndex < totalSlides - 1) {
        goToSlide(currentSlideIndex + 1);
      }
    });

    // Soporte para Teclado (Flechas izquierda/derecha)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' && currentSlideIndex < totalSlides - 1) {
        goToSlide(currentSlideIndex + 1);
      } else if (e.key === 'ArrowLeft' && currentSlideIndex > 0) {
        goToSlide(currentSlideIndex - 1);
      }
    });

    // --- MANEJO DE TEMA (CLARO / OSCURO) ---
    const htmlEl = document.documentElement;
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    themeToggle.addEventListener('click', () => {
      const currentTheme = htmlEl.getAttribute('data-theme');
      if (currentTheme === 'dark') {
        htmlEl.setAttribute('data-theme', 'light');
        themeIcon.setAttribute('data-lucide', 'moon');
      } else {
        htmlEl.setAttribute('data-theme', 'dark');
        themeIcon.setAttribute('data-lucide', 'sun');
      }
      // Re-crear iconos lucide para el botón cambiado
      lucide.createIcons();
    });