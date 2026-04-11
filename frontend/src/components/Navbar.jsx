const Navbar = ({ links, activeSection, onNavClick }) => {
  const handleClick = (e, id) => {
    e.preventDefault();
    onNavClick(id);
  };

  const handleKeyDown = (e, index) => {
    const key = e.key;
    const navLinks = document.querySelectorAll('.nav-pill .nav-link');
    if (!navLinks.length) return;

    if (key === 'ArrowRight' || key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % navLinks.length;
      navLinks[nextIndex].focus();
    }

    if (key === 'ArrowLeft' || key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + navLinks.length) % navLinks.length;
      navLinks[prevIndex].focus();
    }

    if (key === 'Home') {
      e.preventDefault();
      navLinks[0].focus();
    }

    if (key === 'End') {
      e.preventDefault();
      navLinks[navLinks.length - 1].focus();
    }
  };

  return (
    <nav className="floating-nav" aria-label="Primary navigation">
      <div className="nav-pill" role="menubar">
        {links.map((link, index) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            className={`nav-link ${activeSection === link.id ? 'active' : ''}`}
            onClick={(e) => handleClick(e, link.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            role="menuitem"
            aria-current={activeSection === link.id ? 'page' : undefined}
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
