const PATHS = {
  home: 'M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4-4',
  plus: 'M12 5v14M5 12h14',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z',
  chat: 'M3 21l1.6-4.6A8.5 8.5 0 1112 20.5a8.4 8.4 0 01-4.1-1L3 21z',
  back: 'M9 6l6 6-6 6',
  pin: 'M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  check: 'M5 12l5 5 9-10',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z',
  compass: 'M12 21a9 9 0 100-18 9 9 0 000 18zM15.5 8.5l-2 5-5 2 2-5z',
  fish: 'M3 12c3-5 8-6 13-3l5-2-1 5 1 5-5-2c-5 3-10 2-13-3zM8 11h.01',
  anchor: 'M12 7a2 2 0 100-4 2 2 0 000 4zM12 7v14M6 12H3a9 9 0 0018 0h-3M8 11h8',
  boat: 'M3 15h18l-2.5 5h-13zM12 3v10M12 5l6 8h-6',
  filter: 'M4 6h16M7 12h10M10 18h4',
  x: 'M6 6l12 12M18 6L6 18',
  zoom: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4-4M11 8v6M8 11h6',
  zoomout: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4-4M8 11h6',
  renew: 'M20 12a8 8 0 11-2.3-5.7M20 4v5h-5',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  store: 'M4 9l1-5h14l1 5M4 9a2.5 2.5 0 005 0 2.5 2.5 0 006 0 2.5 2.5 0 005 0M5 11v9h14v-9',
  logout: 'M10 4H5v16h5M15 8l4 4-4 4M19 12H9',
  bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  image: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M15.5 9.5h.01',
  video: 'M4 6h11v12H4zM15 10l5-3v10l-5-3',
  badge: 'M12 3l2.4 1.8 3-.1.9 2.8 2.4 1.8-.9 2.8.9 2.8-2.4 1.8-.9 2.8-3-.1L12 21l-2.4-1.8-3 .1-.9-2.8-2.4-1.8.9-2.8-.9-2.8 2.4-1.8.9-2.8 3 .1zM8.5 12l2.5 2.5 4.5-5',
  share: 'M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
};

// Icons that point "forward/back" must mirror in left-to-right languages
const MIRRORED = new Set(['back']);

export default function Icon({ name, size = 22, color = 'currentColor', fill = 'none', stroke = 2 }) {
  return (
    <svg className={MIRRORED.has(name) ? 'mirror-ltr' : undefined} width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
