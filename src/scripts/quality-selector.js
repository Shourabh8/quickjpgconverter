// Quality selector styling fix for tool pages
// Dynamically updates border/background when radio buttons change

export function initQualitySelector() {
  const radios = document.querySelectorAll('input[name="quality"]');
  const labels = document.querySelectorAll('label');

  if (!radios.length || !labels.length) return;

  function updateStyles() {
    labels.forEach((label) => {
      const radio = label.querySelector('input[type="radio"]');
      if (!radio) return;

      if (radio.checked) {
        label.style.borderColor = '';
        label.style.backgroundColor = '';
        label.classList.remove('border-border-default', 'hover:border-border-strong', 'hover:bg-surface-subtle/50');
        label.classList.add('border-brand-300', 'dark:border-brand-700', 'bg-brand-50/50', 'dark:bg-brand-950/30');
      } else {
        label.style.borderColor = '';
        label.style.backgroundColor = '';
        label.classList.remove('border-brand-300', 'dark:border-brand-700', 'bg-brand-50/50', 'dark:bg-brand-950/30');
        label.classList.add('border-border-default', 'hover:border-border-strong', 'hover:bg-surface-subtle/50');
      }
    });
  }

  radios.forEach((radio) => {
    radio.addEventListener('change', updateStyles);
  });

  // Initial state
  updateStyles();
}
