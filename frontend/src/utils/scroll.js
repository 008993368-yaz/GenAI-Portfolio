export const smoothScrollTo = (sectionId) => {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const navHeight = document.querySelector('.nav')?.offsetHeight || 0;
  const targetPosition = section.offsetTop - navHeight - 20;

  window.scrollTo({
    top: targetPosition,
    behavior: 'smooth'
  });
};
