import { useApp } from '../../context/AppContext';
import './DarkModeToggle.css';

const DarkModeToggle = () => {
  const { darkMode, actions } = useApp();

  return (
    <button
      className="dark-mode-toggle"
      onClick={actions.toggleDarkMode}
      aria-label="Toggle dark mode"
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="toggle-icon">
        {darkMode ? '☀️' : '🌙'}
      </span>
    </button>
  );
};

export default DarkModeToggle;
