import React from "react";

const ICONS = {
  search: [
    "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z",
    "m20 20-3.5-3.5"
  ],
  users: [
    "M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
    "M4 20c0-3.4 2.8-5.5 8-5.5s8 2.1 8 5.5"
  ],
  incidents: [
    "M12 3c2.3 3.1 4 5.1 4 8a4 4 0 1 1-8 0c0-2.9 1.7-4.9 4-8Z",
    "M12 12.6c1.2 1.2 2 2.2 2 3.3a2 2 0 1 1-4 0c0-1.1.8-2.1 2-3.3Z"
  ],
  participations: [
    "M7.5 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    "M16.5 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
    "M3.5 20c0-2.8 2-4.5 5.2-4.5S14 17.2 14 20",
    "M14.5 20c.2-1.8 1.6-3.2 4-3.2 1.2 0 2.2.3 3 .9"
  ],
  tag: [
    "M4 8.5V4h4.5L20 15.5 15.5 20 4 8.5Z",
    "M8 8h.01"
  ],
  mapPin: [
    "M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z",
    "M12 13a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z"
  ],
  compass: [
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
    "m15.5 8.5-2.3 6.7-6.7 2.3 2.3-6.7 6.7-2.3Z"
  ],
  truck: [
    "M3 7h11v9H3z",
    "M14 10h3.5L20 12.5V16h-6",
    "M7 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
    "M16.5 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"
  ],
  firefighter: [
    "M12 4c1.6 2.2 3 3.8 3 6a3 3 0 1 1-6 0c0-2.2 1.4-3.8 3-6Z",
    "M5 20c0-2.7 2.4-4.4 7-4.4s7 1.7 7 4.4"
  ],
  inbox: [
    "M4 6h16v10H4z",
    "M4 12h4l2 3h4l2-3h4"
  ],
  mail: [
    "M4 6h16v12H4z",
    "m4 8 8 6 8-6"
  ],
  globe: [
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
    "M3 12h18",
    "M12 3c2.4 2.6 3.7 5.6 3.7 9S14.4 18.4 12 21",
    "M12 3C9.6 5.6 8.3 8.6 8.3 12S9.6 18.4 12 21"
  ],
  lock: [
    "M7 11V8a5 5 0 0 1 10 0v3",
    "M6 11h12v10H6z",
    "M12 15v2"
  ],
  send: [
    "m3 12 18-8-4 16-4-6-10-2Z",
    "m13 14 8-10"
  ],
  chart: [
    "M4 19h16",
    "M7 14v5",
    "M12 10v9",
    "M17 6v13"
  ],
  checkCircle: [
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
    "m8.5 12 2.2 2.2L15.5 9.5"
  ],
  clock: [
    "M12 6v6l4 2",
    "M4 12a8 8 0 1 0 2.4-5.7",
    "M4 4v4h4"
  ],
  file: [
    "M7 3h7l4 4v14H7z",
    "M14 3v5h5"
  ]
};

function SectionIcon({ name, className = "" }) {
  const paths = ICONS[name] || ICONS.search;
  return (
    <svg className={`ui-icon ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
      {paths.map((pathValue, index) => (
        <path key={`${name}-${index}`} d={pathValue} />
      ))}
    </svg>
  );
}

export default SectionIcon;
