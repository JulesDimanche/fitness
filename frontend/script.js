// Auto-rotate evolution stages with smooth progress animations
const cards = document.querySelectorAll('.evolution-card');
let currentCard = 0;

function showNextCard() {
  // Fade out current card
  cards[currentCard].classList.remove('active');
  
  // Update to next card
  currentCard = (currentCard + 1) % cards.length;
  
  // Reset progress bar width before animating
  const nextProgressFill = cards[currentCard].querySelector('.progress-fill');
  nextProgressFill.style.width = '0';
  
  // Show new card
  cards[currentCard].classList.add('active');
  
  // Animate progress bar after a slight delay
  setTimeout(() => {
    const targetWidth = nextProgressFill.getAttribute('data-width') || nextProgressFill.style.width;
    nextProgressFill.style.width = '0';
    setTimeout(() => {
      nextProgressFill.style.width = targetWidth;
    }, 50);
  }, 50);
}

// Initialize first progress bar animation
// Initialize progress bars on load
document.addEventListener('DOMContentLoaded', () => {
  // Set initial progress widths
  document.querySelectorAll('.progress-fill').forEach(bar => {
    const targetWidth = bar.parentElement.parentElement.querySelector('.progress-label span:last-child').textContent;
    bar.style.width = targetWidth;
    bar.setAttribute('data-target', targetWidth);
  });

  // Start carousel
  startEvolutionCarousel();
});

function startEvolutionCarousel() {
  const cards = document.querySelectorAll('.evolution-card');
  let currentCard = 0;

  function animateProgressBar(bar) {
    bar.style.width = '0';
    setTimeout(() => {
      bar.style.width = bar.getAttribute('data-target');
    }, 50);
  }

  function showNextCard() {
    // Hide current card
    cards[currentCard].classList.remove('active');
    
    // Move to next card
    currentCard = (currentCard + 1) % cards.length;
    
    // Show new card
    cards[currentCard].classList.add('active');
    
    // Animate its progress bar
    const nextBar = cards[currentCard].querySelector('.progress-fill');
    animateProgressBar(nextBar);
  }

  // Animate first card's progress bar
  setTimeout(() => {
    animateProgressBar(document.querySelector('.evolution-card.active .progress-fill'));
  }, 500);

  // Rotate every 5 seconds
  setInterval(showNextCard, 5000);
}

// Add hover effects to buttons
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    btn.style.setProperty('--mouse-x', `${x}px`);
    btn.style.setProperty('--mouse-y', `${y}px`);
  });
});