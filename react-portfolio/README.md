# React Portfolio - Yazhini Elanchezhian

A modern, responsive portfolio website built with React and Vite, converted from a static HTML/CSS/JavaScript site while preserving all original functionality and styling.

## Features

- ✨ Component-based architecture with React
- 🎯 Data-driven rendering
- 📱 Fully responsive design
- 🎨 Preserved CSS styling and design system
- 🔄 Smooth scrolling with navbar offset
- 🎯 Active navigation link highlighting (on click AND scroll)
- 👁️ Fade-in/slide-up animations using Intersection Observer
- 💬 Floating chatbot button UI
- ⚡ Fast development with Vite

## Project Structure

```
react-portfolio/
├── index.html
├── package.json
├── vite.config.js
├── .gitignore
└── src/
    ├── main.jsx                 # Application entry point
    ├── App.jsx                  # Main App component
    ├── App.css                  # Global styles (preserved from original)
    ├── components/              # React components
    │   ├── Header.jsx
    │   ├── Navbar.jsx
    │   ├── SummarySection.jsx
    │   ├── SkillsSection.jsx
    │   ├── SkillCategory.jsx
    │   ├── ProjectsSection.jsx
    │   ├── ProjectCard.jsx
    │   ├── ExperienceSection.jsx
    │   ├── ExperienceItem.jsx
    │   ├── EducationSection.jsx
    │   ├── EducationItem.jsx
    │   ├── Footer.jsx
    │   └── ChatbotButton.jsx
    ├── data/                    # Data files
    │   ├── portfolioData.js     # All portfolio content
    │   └── navigation.js        # Navigation links
    ├── hooks/                   # Custom React hooks
    │   ├── useIntersectionObserver.js
    │   └── useScrollSpy.js
    └── utils/                   # Utility functions
        └── scroll.js
```

## Getting Started

### Installation

Navigate to the project directory and install dependencies:

```bash
cd react-portfolio
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

Create a production build:

```bash
npm run build
```

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

## Key Technical Details

### Custom Hooks

- **useIntersectionObserver**: Handles fade-in animations when sections enter viewport
- **useScrollSpy**: Tracks the currently visible section and updates active nav link on scroll

### Data-Driven Approach

All content (skills, projects, experience, education) is stored in `src/data/portfolioData.js` for easy updates without touching component code.

### Styling

CSS is preserved from the original static site with CSS variables for theming:
- `--primary-color: #2c3e50`
- `--secondary-color: #3498db`
- `--accent-color: #2980b9`

### Behavior Preservation

1. **Sticky Navigation**: Uses `position: sticky` in CSS
2. **Smooth Scrolling**: Implemented via custom `smoothScrollTo` utility with navbar offset
3. **Active Link Highlighting**: Dual-mode - updates on both click and scroll
4. **Animations**: IntersectionObserver-based fade-in/slide-up on section visibility
5. **Responsive Layout**: Media queries maintain mobile-friendly design

## Technologies Used

- React 18.2
- Vite 5.0
- Vanilla CSS (no preprocessor needed)
- JavaScript ES6+

## Browser Support

Modern browsers with ES6+ support:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

© 2026 Yazhini Elanchezhian. All rights reserved.
