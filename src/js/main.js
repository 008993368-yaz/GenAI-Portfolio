// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Reveal on scroll
const reveals = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  },
  { threshold: 0.15 }
);

reveals.forEach((el) => observer.observe(el));
