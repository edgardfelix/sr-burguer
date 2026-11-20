/**
 * Tokens de design como variáveis CSS (funcionam em Server e Client Components).
 * Paleta tirada do próprio logo: papel creme, tinta marrom-quase-preta, âmbar do "BURGER".
 * Contraste conferido (WCAG AA): muted 5,4:1, amberInk 5,2:1, red 5,1:1, green 5,2:1 sobre o papel.
 */
export const c = {
  paper: 'var(--paper)',
  paper2: 'var(--paper-2)',
  surface: 'var(--surface)',
  ink: 'var(--ink)',
  inkSoft: 'var(--ink-soft)',
  muted: 'var(--muted)',
  line: 'var(--line)',
  lineStrong: 'var(--line-strong)',
  amber: 'var(--amber)',
  amberSoft: 'var(--amber-soft)',
  amberInk: 'var(--amber-ink)',
  red: 'var(--red)',
  redSoft: 'var(--red-soft)',
  green: 'var(--green)',
  greenSoft: 'var(--green-soft)',
  night: 'var(--night)',
  night2: 'var(--night-2)',
  cream: 'var(--cream)',
  creamMuted: 'var(--cream-muted)',
  focus: 'var(--focus)',
} as const;

export const font = {
  display: 'var(--font-display), Georgia, "Times New Roman", serif',
  text: 'var(--font-text), "Segoe UI", system-ui, -apple-system, sans-serif',
} as const;

export const ease = {
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
  inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
  drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
} as const;

export const radius = {
  xs: '3px',
  sm: '5px',
  md: '8px',
  lg: '12px',
} as const;

export const shadow = {
  card: '0 1px 0 rgba(28, 22, 17, 0.04), 0 1px 2px rgba(28, 22, 17, 0.06)',
  raised: '0 1px 2px rgba(28, 22, 17, 0.08), 0 8px 24px -8px rgba(28, 22, 17, 0.22)',
  sheet: '0 -1px 0 rgba(28, 22, 17, 0.06), 0 -12px 40px -12px rgba(28, 22, 17, 0.28)',
} as const;

export const mq = {
  sm: '@media (min-width: 640px)',
  md: '@media (min-width: 768px)',
  lg: '@media (min-width: 1024px)',
  xl: '@media (min-width: 1280px)',
  /** Hover só em mouse/trackpad: no toque o :hover "gruda" após o tap. */
  hover: '@media (hover: hover) and (pointer: fine)',
  reduced: '@media (prefers-reduced-motion: reduce)',
} as const;

export const layout = {
  maxWidth: '1200px',
  gutter: 'clamp(16px, 4vw, 32px)',
  header: '64px',
  categoryNav: '52px',
} as const;
