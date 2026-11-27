const shapes = {
  people: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M17 5a3 3 0 0 1 0 6m4 9v-2a4 4 0 0 0-3-4" /></>,
  date: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18m4 4h2m2 0h2m-6 3h2" /></>,
  connect: <path d="M10 13a4 4 0 0 0 6 .4l3-3a4 4 0 0 0-6-5.6l-1.6 1.6m2.6 4.6a4 4 0 0 0-6-.4l-3 3a4 4 0 0 0 6 5.6l1.6-1.6" />,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
  filters: <><path d="M3 6h9m4 0h5M3 12h3m4 0h11M3 18h12m4 0h2" /><circle cx="14" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="17" cy="18" r="2" /></>,
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
  time: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  timezone: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
  capacity: <path d="M3 7h18a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1a2 2 0 1 0 0-4V9a2 2 0 0 1 2-2Zm12 0v2m0 2v2m0 2v2" />,
  next: <path d="m9 18 6-6-6-6" />,
  down: <path d="m6 9 6 6 6-6" />,
  back: <path d="m12 19-7-7 7-7m-7 7h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 4 4 10-10" />,
  image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 16-6-6L5 21" /></>,
  edit: <path d="m14 5 5 5M5 14l-1 6 6-1L21 8a2 2 0 0 0 0-3l-2-2a2 2 0 0 0-3 0Z" />,
};

export default function Icon({ name, className = "" }) {
  return (
    <svg className={`doin-icon ${className}`} aria-hidden="true" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {shapes[name]}
    </svg>
  );
}
