import React, { useEffect, useState } from 'react';

export default function FluidCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [trail, setTrail] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const onMouseMove = (e) => {
      setPos({ x: e.clientX, y: e.clientY });
    };

    const onMouseOver = (e) => {
      const target = e.target;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.classList.contains('cursor-pointer')
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseover', onMouseOver);

    // Smooth trail loop
    let animId;
    const updateTrail = () => {
      setTrail((prev) => ({
        x: prev.x + (pos.x - prev.x) * 0.22,
        y: prev.y + (prev.y + (pos.y - prev.y) * 0.22),
      }));
      animId = requestAnimationFrame(updateTrail);
    };
    animId = requestAnimationFrame(updateTrail);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
      cancelAnimationFrame(animId);
    };
  }, [pos.x, pos.y]);

  return (
    <>
      {/* Primary Glow Dot */}
      <div
        className="fixed pointer-events-none z-50 rounded-full bg-accent mix-blend-screen transition-transform duration-75"
        style={{
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          width: isHovered ? '24px' : '8px',
          height: isHovered ? '24px' : '8px',
          transform: 'translate(-50%, -50%)',
          boxShadow: isHovered
            ? '0 0 25px 6px rgba(91, 140, 255, 0.9)'
            : '0 0 10px 2px rgba(91, 140, 255, 0.6)',
          opacity: 0.85,
        }}
      />

      {/* Trailing Outer Halo */}
      <div
        className="fixed pointer-events-none z-40 rounded-full border border-accent/40 transition-transform duration-200"
        style={{
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          width: isHovered ? '48px' : '28px',
          height: isHovered ? '48px' : '28px',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 15px 1px rgba(91, 140, 255, 0.2)',
        }}
      />
    </>
  );
}
