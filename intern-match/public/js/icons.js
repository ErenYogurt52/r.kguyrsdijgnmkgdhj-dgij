// Icons and brand art from the original Intern Match design (Canva template palette).
import { raw } from './html.js';

const STROKE = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    lock: '<rect x="5.5" y="10.5" width="13" height="10"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>',
    bookmark: '<path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/>',
    'bookmark-fill': '<path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" fill="currentColor"/>',
    arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
    external: '<path d="M13.5 4.5h6v6M19.5 4.5L11 13M18 14v5.5H4.5V6H10"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    alert: '<path d="M12 3.8l9 15.7H3z"/><path d="M12 10v4.2M12 16.6v.4"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z"/><path d="M8.7 12l2.3 2.3 4.3-4.3"/>',
    minus: '<path d="M6 12h12"/>',
    question: '<path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.8.7-.8 1.2v.9M12 17v.5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    filter: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    pin: '<path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    sparkle: '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1L5 10.5l5.1-1.9z"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
    ban: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.8-3.8 3.9-5.5 7.5-5.5s6.7 1.7 7.5 5.5"/>',
    building: '<path d="M4.5 20.5v-15h9v15M13.5 9.5h6v11M3 20.5h18M7.5 9h3M7.5 12.5h3M7.5 16h3"/>',
    layers: '<path d="M12 4l8.5 4.5L12 13 3.5 8.5z"/><path d="M3.5 12.5L12 17l8.5-4.5"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 21h4"/>',
    'bell-off': '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 21h4M4 4l16 16"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13"/><path d="M4 6.5l8 6.5 8-6.5"/>',
    logout: '<path d="M14 4.5H5.5v15H14M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/>',
    trash: '<path d="M4.5 6.5h15M9.5 6.5V4h5v2.5M6.5 6.5l1 14h9l1-14"/>',
};
const FILL = {
    'cat-marketing': '<path d="M3 9.5h4l9-5.5v16l-9-5.5H3z"/><path d="M6 15.5h3.5L11 21H7.5z"/><path d="M18.5 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="2"/>',
    'cat-finance': '<path d="M3 20h18v1.5H3zM5 12h3.5v6.5H5zM10.25 8h3.5v10.5h-3.5zM15.5 4h3.5v14.5h-3.5z"/>',
    'cat-accounting': '<path fill-rule="evenodd" d="M5 2.5h14v19H5zm2.5 2.5v4h9V5zm0 6.5v2h2v-2zm3.5 0v2h2v-2zm3.5 0v6.5h2v-6.5zm-7 3.5v2h2v-2zm3.5 0v2h2v-2z"/>',
    'cat-business': '<path fill-rule="evenodd" d="M8.5 3.5h7v3h5.5v5H3v-5h5.5zm2 2v1h3v-1zM3 13.5h7.5v2h3v-2H21v7H3z"/>',
    'cat-data': '<path d="M11 3.1A9 9 0 1 0 20.9 13H11z"/><path d="M13 1.5V11h9.5A9.5 9.5 0 0 0 13 1.5z"/>',
    'cat-it': '<path fill-rule="evenodd" d="M2.5 4h19v13h-8v2h3v2h-9v-2h3v-2h-8zm2 2v9h15V6z"/>',
    'cat-software': '<path d="M8.3 6.3L2.6 12l5.7 5.7 1.4-1.4L5.4 12l4.3-4.3zM15.7 6.3l-1.4 1.4 4.3 4.3-4.3 4.3 1.4 1.4 5.7-5.7zM13.3 4.5l1.9.6-4.5 14.4-1.9-.6z"/>',
    'cat-hr': '<circle cx="9" cy="7.5" r="3.8"/><path d="M1.5 20.5c.4-4.4 3.4-7 7.5-7s7.1 2.6 7.5 7z"/><circle cx="17.3" cy="8.5" r="2.8"/><path d="M17.9 20.5h4.6c-.3-3.5-2.3-5.9-5.3-6.4 1 1.7 1.2 3.8.7 6.4z"/>',
    'cat-logistics': '<path d="M1.5 5h13v11.5h-13zM15.5 9h4.3l3.2 4v3.5h-7.5z"/><circle cx="6" cy="18" r="2.4"/><circle cx="18.5" cy="18" r="2.4"/>',
    'cat-communication': '<path d="M2.5 3.5h14v10h-8l-4 3.5v-3.5h-2z"/><path d="M18.5 7.5h3v10h-2V21l-4-3.5h-6v-2h8.5z"/>',
    'cat-design': '<path fill-rule="evenodd" d="M12 2.5l7 7-2.8 8.5H7.8L5 9.5zm0 6.3a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8z"/><path d="M7.5 19.5h9v2.5h-9z"/>',
};

export const SPRITE = '<svg xmlns="http://www.w3.org/2000/svg" class="sprite" aria-hidden="true" focusable="false"><defs>'
  + Object.entries(STROKE).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('')
  + Object.entries(FILL).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24" fill="currentColor" stroke="none">${v}</symbol>`).join('')
  + '</defs></svg>';

export const HERO_ART = `<svg class="hero-art" viewBox="0 0 800 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="hg-a" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#2B0710"/><stop offset=".32" stop-color="#9B1C14"/><stop offset=".58" stop-color="#E8662B"/><stop offset=".78" stop-color="#F5993F"/><stop offset="1" stop-color="#C8481A"/></linearGradient>
    <linearGradient id="hg-b" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB25E"/><stop offset=".4" stop-color="#E8662B"/><stop offset="1" stop-color="#4A0C12"/></linearGradient>
    <linearGradient id="hg-c" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FFD29A" stop-opacity="0"/><stop offset=".5" stop-color="#FFD29A" stop-opacity=".9"/><stop offset="1" stop-color="#FFD29A" stop-opacity="0"/></linearGradient>
    <radialGradient id="hg-glow" cx=".64" cy=".46" r=".58"><stop offset="0" stop-color="#E8662B" stop-opacity=".5"/><stop offset="1" stop-color="#0E0B1F" stop-opacity="0"/></radialGradient>
    <filter id="hf-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="hf-soft2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>
  </defs>
  <rect width="800" height="700" fill="url(#hg-glow)"/>
  <path d="M130 760C270 600 340 470 480 400 610 335 700 250 830 70L870 760Z" fill="#240610"/>
  <path d="M40 700C220 610 300 470 440 380 570 296 650 250 760 40 800 150 770 300 660 390 540 490 420 520 330 640 300 680 260 720 220 760Z" fill="url(#hg-a)"/>
  <path d="M250 710C360 560 470 500 560 420 650 340 720 250 770 150 760 280 700 370 610 440 520 510 420 560 360 710Z" fill="url(#hg-b)" opacity=".92"/>
  <path d="M330 700C420 590 520 520 620 440 700 380 750 300 780 220" fill="none" stroke="#2B0710" stroke-width="30" opacity=".6" filter="url(#hf-soft)"/>
  <path d="M200 690C330 560 430 470 560 390 660 330 720 250 760 130" fill="none" stroke="url(#hg-c)" stroke-width="14" filter="url(#hf-soft2)"/>
  <path d="M470 700C540 610 610 560 680 500 740 450 780 390 800 330" fill="none" stroke="#FFC27A" stroke-width="3" opacity=".45" filter="url(#hf-soft2)"/>
</svg>`;

export const icon = (n, c) => raw(`<svg class="icon${c ? ' ' + c : ''}" aria-hidden="true" focusable="false"><use href="#i-${n}"></use></svg>`);
export const Logo = () => raw('<svg class="logo" viewBox="0 0 28 24" aria-hidden="true" focusable="false"><rect x="0" y="7" width="17" height="17" fill="#9B1C14"/><rect x="11" y="0" width="17" height="17" fill="#E8662B"/><rect x="11" y="7" width="6" height="10" fill="#0E0B1F"/></svg>');
