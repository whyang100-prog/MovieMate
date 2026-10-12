import React from 'react';

export default function Icon({ name, size = 20, ...props }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="10.8" cy="10.8" r="7.1" /><path d="m16 16 4.5 4.5" /></>,
    heart: <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z" />,
    image: <><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.3"/><path d="m3 17 6-6 4 4 3-3 5 5"/></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />,
    edit: <><path d="m14.5 4.5 5 5M4 20l5-1L21 7a2 2 0 0 0 0-3l-1-1a2 2 0 0 0-3 0L5 15Z"/><path d="M13 21h8"/></>,
    trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></>,
    upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    poster: <><rect x="4" y="3" width="6" height="18" rx="1.5"/><rect x="14" y="3" width="6" height="18" rx="1.5"/></>,
    chat: <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2v-10A9 9 0 0 1 11 3h1.5a8.5 8.5 0 0 1 8.5 8.5Z" />,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 4v2"/></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    check: <path d="m5 12 4 4L19 6" />,
    circle: <circle cx="12" cy="12" r="9" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] ?? paths.circle}</svg>;
}
