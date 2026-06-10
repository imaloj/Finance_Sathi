import styled from 'styled-components';
import useTheme from '../hooks/useTheme';

const ThemeSwitch = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <StyledWrapper>
      <label htmlFor="theme-toggle" className="theme">
        <span className="theme__toggle-wrap">
          <input
            id="theme-toggle"
            className="theme__toggle"
            type="checkbox"
            role="switch"
            name="theme"
            checked={isDark}
            onChange={toggleTheme}
          />
          <span className="theme__icon">
            <span className="theme__icon-part" />
            <span className="theme__icon-part" />
            <span className="theme__icon-part" />
            <span className="theme__icon-part" />
            <span className="theme__icon-part" />
            <span className="theme__icon-part" />
            <span className="theme__icon-part" />
            <span className="theme__icon-part" />
            <span className="theme__icon-part" />
          </span>
        </span>
      </label>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  --transDur: 0.3s;
  --primary: #9333ea;
  --primaryT: rgba(147, 51, 234, 0);

  .theme {
    display: flex;
    align-items: center;
    -webkit-tap-highlight-color: transparent;
  }

  .theme__icon,
  .theme__toggle {
    z-index: 1;
  }

  .theme__icon,
  .theme__icon-part {
    position: absolute;
  }

  .theme__icon {
    display: block;
    top: 0.375em;
    left: 0.375em;
    width: 1em;
    height: 1em;
    transition: transform var(--transDur) ease-in-out;
    pointer-events: none;
  }

  .theme__icon-part {
    border-radius: 50%;
    box-shadow: 0.25em -0.25em 0 0.3em hsl(0, 0%, 100%) inset;
    top: calc(50% - 0.35em);
    left: calc(50% - 0.35em);
    width: 0.7em;
    height: 0.7em;
    transition:
      box-shadow var(--transDur) ease-in-out,
      opacity var(--transDur) ease-in-out,
      transform var(--transDur) ease-in-out;
    transform: scale(0.5);
  }

  .theme__icon-part ~ .theme__icon-part {
    background-color: hsl(0, 0%, 100%);
    border-radius: 0.05em;
    top: 50%;
    left: calc(50% - 0.04em);
    transform: rotate(0deg) translateY(0.35em);
    transform-origin: 50% 0;
    width: 0.07em;
    height: 0.15em;
  }

  .theme__icon-part:nth-child(3) { transform: rotate(45deg) translateY(0.32em); }
  .theme__icon-part:nth-child(4) { transform: rotate(90deg) translateY(0.32em); }
  .theme__icon-part:nth-child(5) { transform: rotate(135deg) translateY(0.32em); }
  .theme__icon-part:nth-child(6) { transform: rotate(180deg) translateY(0.32em); }
  .theme__icon-part:nth-child(7) { transform: rotate(225deg) translateY(0.32em); }
  .theme__icon-part:nth-child(8) { transform: rotate(270deg) translateY(0.35em); }
  .theme__icon-part:nth-child(9) { transform: rotate(315deg) translateY(0.35em); }

  .theme__toggle-wrap {
    position: relative;
    margin: 0 0.25em;
  }

  .theme__toggle,
  .theme__toggle:before {
    display: block;
  }

  .theme__toggle {
    background-color: hsl(48, 90%, 85%);
    border-radius: 25% / 50%;
    box-shadow: 0 0 0 0.125em var(--primaryT);
    padding: 0.175em;
    width: 3.5em;
    height: 1.75em;
    -webkit-appearance: none;
    appearance: none;
    cursor: pointer;
    transition:
      background-color var(--transDur) ease-in-out,
      box-shadow 0.15s ease-in-out;
  }

  .theme__toggle:before {
    background-color: hsl(48, 90%, 55%);
    border-radius: 50%;
    content: '';
    width: 1.4em;
    height: 1.4em;
    transition:
      transform var(--transDur) ease-in-out,
      background-color var(--transDur) ease-in-out;
  }

  .theme__toggle:focus {
    box-shadow: 0 0 0 0.125em var(--primaryT);
    outline: transparent;
  }

  .theme__toggle:focus-visible {
    box-shadow: 0 0 0 0.125em var(--primary);
  }

  /* Checked (dark mode) */
  .theme__toggle:checked {
    background-color: hsl(198, 90%, 15%);
  }

  .theme__toggle:checked:before,
  .theme__toggle:checked ~ .theme__icon {
    transform: translateX(1.75em);
  }

  .theme__toggle:checked:before {
    background-color: hsl(198, 90%, 55%);
  }

  .theme__toggle:checked ~ .theme__icon .theme__icon-part:nth-child(1) {
    box-shadow: 0.15em -0.15em 0 0.15em hsl(0, 0%, 100%) inset;
    transform: scale(1) translate(-0.05em, 0.05em);
    top: calc(50% - 0.35em);
    left: calc(50% - 0.35em);
  }

  .theme__toggle:checked ~ .theme__icon .theme__icon-part ~ .theme__icon-part {
    opacity: 0;
  }

  .theme__toggle:checked ~ .theme__icon .theme__icon-part:nth-child(2) { transform: rotate(45deg) translateY(0.5em); }
  .theme__toggle:checked ~ .theme__icon .theme__icon-part:nth-child(3) { transform: rotate(90deg) translateY(0.5em); }
  .theme__toggle:checked ~ .theme__icon .theme__icon-part:nth-child(4) { transform: rotate(135deg) translateY(0.5em); }
  .theme__toggle:checked ~ .theme__icon .theme__icon-part:nth-child(5) { transform: rotate(180deg) translateY(0.5em); }
  .theme__toggle:checked ~ .theme__icon .theme__icon-part:nth-child(6) { transform: rotate(225deg) translateY(0.5em); }
  .theme__toggle:checked ~ .theme__icon .theme__icon-part:nth-child(7) { transform: rotate(270deg) translateY(0.5em); }
  .theme__toggle:checked ~ .theme__icon .theme__icon-part:nth-child(8) { transform: rotate(315deg) translateY(0.5em); }
  .theme__toggle:checked ~ .theme__icon .theme__icon-part:nth-child(9) { transform: rotate(360deg) translateY(0.5em); }
`;

export default ThemeSwitch;
