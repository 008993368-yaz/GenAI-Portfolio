const Navbar = ({ links, activeSection, onNavClick }) => {
  const handleClick = (e, id) => {
    e.preventDefault();
    onNavClick(id);
  };

  return (
    <nav className="floating-nav">
      <div className="nav-pill">
        {links.map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            className={`nav-link ${activeSection === link.id ? 'active' : ''}`}
            onClick={(e) => handleClick(e, link.id)}
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
