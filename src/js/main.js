// Page navigation active state
function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const linkPage = link.getAttribute('href');
        
        if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
            link.classList.add('active');
        }
    });
}

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all sections
document.querySelectorAll('.section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setActiveNavLink();
    
    // Add active class style
    const style = document.createElement('style');
    style.textContent = `
        .nav-link.active {
            background-color: var(--secondary-color);
            color: var(--white);
        }
    `;
    document.head.appendChild(style);
});

// Print functionality (optional)
function printResume() {
    window.print();
}

// Console message
console.log('%c Portfolio Loaded Successfully! ', 'background: #3498db; color: white; font-size: 16px; padding: 5px 10px; border-radius: 3px;');