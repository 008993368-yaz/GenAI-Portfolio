const Header = ({ personalInfo }) => {
  return (
    <header className="header">
      <div className="container">
        <h1 className="name">{personalInfo.name}</h1>
        <div className="contact-info">
          <span>{personalInfo.location}</span>
          <span>{personalInfo.phone}</span>
          <span>{personalInfo.email}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
