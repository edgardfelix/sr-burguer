'use client';

import { createGlobalStyle } from 'styled-components';
import { ease, font } from './tokens';

export const GlobalStyle = createGlobalStyle`
  :root {
    --paper: #F5EEE3;
    --paper-2: #EDE3D3;
    --surface: #FBF7F1;
    --ink: #1C1611;
    --ink-soft: #3A2F26;
    --muted: #6B5D50;
    --line: rgba(28, 22, 17, 0.12);
    --line-strong: rgba(28, 22, 17, 0.24);
    --amber: #E3922B;
    --amber-soft: #F6DDB4;
    --amber-ink: #96500F;
    --red: #B83220;
    --red-soft: #F4D7CF;
    --green: #2A6F41;
    --green-soft: #D6E8D7;
    --night: #17110D;
    --night-2: #241B15;
    --cream: #F3E8D6;
    --cream-muted: #B9AA96;
    --focus: #96500F;
    color-scheme: light;
  }

  *, *::before, *::after { box-sizing: border-box; }

  html {
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
    scroll-padding-top: 128px;
  }

  @media (prefers-reduced-motion: no-preference) {
    html { scroll-behavior: smooth; }
  }

  body {
    margin: 0;
    min-height: 100vh;
    background: var(--paper);
    color: var(--ink);
    font-family: ${font.text};
    font-size: 1rem;
    line-height: 1.5;
    font-feature-settings: 'kern', 'liga';
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  h1, h2, h3, h4, p, figure, blockquote, dl, dd, ul, ol { margin: 0; }
  ul[role='list'], ol[role='list'] { list-style: none; padding: 0; }

  h1, h2 {
    font-family: ${font.display};
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.05;
    text-wrap: balance;
  }

  p { text-wrap: pretty; }

  img, picture, video, svg { display: block; max-width: 100%; }

  a { color: inherit; text-decoration-thickness: 1px; text-underline-offset: 3px; }

  button, input, select, textarea { font: inherit; color: inherit; }

  /* iOS amplia a página em campos com menos de 16px. */
  input, select, textarea { font-size: 16px; }

  button, a, [role='button'], label { touch-action: manipulation; }

  button, [role='button'] {
    -webkit-user-select: none;
    user-select: none;
  }

  :focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
    border-radius: 4px;
  }

  ::selection { background: var(--amber-soft); color: var(--ink); }

  .visually-hidden {
    position: absolute !important;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0);
    white-space: nowrap; border: 0;
  }

  .skip-link {
    position: fixed;
    left: 12px; top: 12px;
    z-index: 1000;
    padding: 10px 14px;
    background: var(--ink);
    color: var(--paper);
    border-radius: 6px;
    font-weight: 600;
    text-decoration: none;
    transform: translateY(-160%);
    transition: transform 160ms ${ease.out};
  }
  .skip-link:focus-visible { transform: translateY(0); }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 1ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 1ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* Toasts (Sonner) no padrão da marca. */
  [data-sonner-toaster] { --width: 360px; font-family: ${font.text}; }
  [data-sonner-toast][data-styled='true'] {
    background: var(--ink);
    color: var(--paper);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.45);
    padding: 14px 16px;
    gap: 10px;
    font-size: 15px;
  }
  [data-sonner-toast][data-styled='true'] [data-description] { color: var(--cream-muted); }
  [data-sonner-toast][data-styled='true'] [data-icon] { color: var(--amber); }
  [data-sonner-toast][data-type='error'][data-styled='true'] [data-icon] { color: #F08A7A; }
`;
