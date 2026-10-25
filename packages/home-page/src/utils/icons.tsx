import type { VNode } from '@stencil/core';
import { h } from '@stencil/core';

/* Ícones de linha (24x24) compartilhados pelos componentes da landing page */
const ICON_PATHS: Record<string, string[]> = {
  pin: ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z', 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 6v6l4 2'],
  ball: [
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
    'm12 7 4.5 3.3-1.7 5.2H9.2l-1.7-5.2Z',
    'M12 2v5M21.5 9.2l-5 1.1M18 20l-3.2-4.5M6 20l3.2-4.5M2.5 9.2l5 1.1',
  ],
  pause: ['M10 4H6v16h4Z', 'M18 4h-4v16h4Z'],
  play: ['m6 3 14 9-14 9Z'],
  mail: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'm22 6-10 7L2 6'],
  calendar: ['M8 2v4M16 2v4', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'M3 10h18'],
  chevronLeft: ['m15 18-6-6 6-6'],
  chevronRight: ['m9 18 6-6-6-6'],
  phone: [
    'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z',
  ],
};

export const renderIcon = (name: string): VNode => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    {ICON_PATHS[name].map((d) => (
      <path key={d} d={d}></path>
    ))}
  </svg>
);
