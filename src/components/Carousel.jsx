import { useState } from 'react';

export default function Carousel({ urls }) {
  const [i, setI] = useState(0);
  if (!urls.length) return <div className="car-empty" />;
  return (
    <div className="car-wrap">
      <div
        className="car"
        onScroll={(e) => setI(Math.round(Math.abs(e.currentTarget.scrollLeft) / e.currentTarget.clientWidth))}
      >
        {urls.map((u, n) => (
          <img key={`${n}-${u}`} src={u} alt="" loading="lazy" />
        ))}
      </div>
      {urls.length > 1 && <span className="car-count">{Math.min(i + 1, urls.length)} / {urls.length}</span>}
    </div>
  );
}
