const PATHS = {
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9"/>',
  board: '<path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 4V5z"/><line x1="7.5" y1="8" x2="16.5" y2="8"/><line x1="7.5" y1="11.5" x2="13.5" y2="11.5"/>',
  tag: '<path d="M3 3h7.5L20 12.5 12.5 20 3 10.5V3z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
  chat: '<path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 4V5z"/><circle cx="8.3" cy="9.3" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="9.3" r="1" fill="currentColor" stroke="none"/><circle cx="15.7" cy="9.3" r="1" fill="currentColor" stroke="none"/>',
  user: '<circle cx="12" cy="8.2" r="3.6"/><path d="M4.5 20c0-4 3.5-6.4 7.5-6.4s7.5 2.4 7.5 6.4"/>',
  back: '<path d="M19 12H5"/><path d="M11 18l-6-6 6-6"/>',
  heart: '<path d="M12 20.6s-7-4.3-9.3-8.6A4.8 4.8 0 0 1 12 6.4 4.8 4.8 0 0 1 21.3 12c-2.3 4.3-9.3 8.6-9.3 8.6z"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><line x1="20" y1="20" x2="15.8" y2="15.8"/>',
  camera: '<path d="M4 8h3.2l1.8-2.6h6l1.8 2.6H20v11H4z"/><circle cx="12" cy="13.5" r="3.3"/>',
  check: '<circle cx="12" cy="12" r="9"/><polyline points="7.5 12.5 10.5 15.5 16.5 8.5"/>',
  alert: '<path d="M12 3 21.5 20H2.5z"/><line x1="12" y1="9.3" x2="12" y2="14"/><circle cx="12" cy="16.8" r=".9" fill="currentColor" stroke="none"/>',
  send: '<path d="M21 3 3.5 10.4 11 13l2.6 7.5z"/><line x1="21" y1="3" x2="11" y2="13"/>',
  more: '<circle cx="12" cy="5.2" r="1.15" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none"/><circle cx="12" cy="18.8" r="1.15" fill="currentColor" stroke="none"/>',
  pin: '<path d="M12 21.5s6.5-6.9 6.5-11.8a6.5 6.5 0 0 0-13 0c0 4.9 6.5 11.8 6.5 11.8z"/><circle cx="12" cy="9.6" r="2.1"/>',
  star: '<path d="M12 3.2l2.5 5.5 6 .6-4.5 4 1.3 5.9L12 16l-5.3 3.2 1.3-5.9-4.5-4 6-.6z"/>',
  shield: '<path d="M12 3.2 18.5 6v5.6c0 4.6-2.9 7.6-6.5 8.4-3.6-.8-6.5-3.8-6.5-8.4V6z"/>',
  bell: '<path d="M6.2 9.3a5.8 5.8 0 0 1 11.6 0v4.5l1.8 2.7H4.4l1.8-2.7z"/><path d="M10.2 19.8a1.9 1.9 0 0 0 3.6 0"/>',
  x: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  chev: '<polyline points="9 6 15 12 9 18"/>',
  logout: '<path d="M9.5 20.5h-4a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h4"/><polyline points="15.5 16.3 20 12 15.5 7.7"/><line x1="20" y1="12" x2="8.7" y2="12"/>',
  edit: '<path d="M11.5 19.5H20"/><path d="M15.7 4.3a2 2 0 0 1 2.9 2.9L8 17.7l-4 1 1-4z"/>',
  flag: '<path d="M5.5 20.5V4"/><path d="M5.5 4.6h12.3l-2.8 3.9 2.8 3.9H5.5"/>',
  bot: '<rect x="4" y="8.2" width="16" height="10.6" rx="3"/><circle cx="9.2" cy="13.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="14.8" cy="13.5" r="1.2" fill="currentColor" stroke="none"/><path d="M12 8.2V4.6"/><circle cx="12" cy="3.3" r="1.1"/>',
  eye: '<path d="M2.5 12s3.6-6.8 9.5-6.8 9.5 6.8 9.5 6.8-3.6 6.8-9.5 6.8-9.5-6.8-9.5-6.8z"/><circle cx="12" cy="12" r="2.7"/>',
  box: '<path d="M3.5 7.8 12 3.5l8.5 4.3v8.4L12 20.5l-8.5-4.3z"/><path d="M3.7 8 12 12.2 20.3 8"/><line x1="12" y1="12.2" x2="12" y2="20.5"/>',
  grad: '<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6 11.6v4c0 1.4 2.7 3 6 3s6-1.6 6-3v-4"/><line x1="21.5" y1="9.5" x2="21.5" y2="15.5"/>',
  trend: '<polyline points="3 17 9.5 10 14 14.5 21 6.5"/><polyline points="15 6.5 21 6.5 21 12.5"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="4.2" y1="4.2" x2="6" y2="6"/><line x1="18" y1="18" x2="19.8" y2="19.8"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/><line x1="4.2" y1="19.8" x2="6" y2="18"/><line x1="18" y1="6" x2="19.8" y2="4.2"/>',
  book: '<path d="M4 5.2a1.5 1.5 0 0 1 1.5-1.5H12v16.6H5.5A1.5 1.5 0 0 0 4 21.8z"/><path d="M20 5.2a1.5 1.5 0 0 0-1.5-1.5H12v16.6h6.5a1.5 1.5 0 0 1 1.5 1.5z"/>',
  bowl: '<path d="M3.5 11h17a1 1 0 0 1 1 1.2c-.8 4-4.6 7-9.5 7s-8.7-3-9.5-7A1 1 0 0 1 3.5 11z"/><path d="M8.5 11c0-2.5 1.6-4.5 3.5-4.5s3.5 2 3.5 4.5"/>',
};

export default function Icon({ name, size = 20, style }) {
  const p = PATHS[name] || '<circle cx="12" cy="12" r="8"/>';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      dangerouslySetInnerHTML={{ __html: p }}
    />
  );
}
