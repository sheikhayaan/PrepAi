import React, { useEffect, useRef } from 'react';

export default function AuroraBackground({ showHorizon = true, intensity = 1.0, transparent = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      if (prefersReducedMotion) renderStatic();
    };
    window.addEventListener('resize', handleResize);

    // Aurora wave parameters
    let time = 0;
    const auroras = [
      { color1: 'rgba(59, 130, 246, 0.22)', color2: 'rgba(37, 99, 235, 0.05)', speed: 0.0008, freq: 0.0015, amp: 140, yOff: 0.25 },
      { color1: 'rgba(99, 102, 241, 0.18)', color2: 'rgba(147, 51, 234, 0.03)', speed: 0.0012, freq: 0.002, amp: 180, yOff: 0.35 },
      { color1: 'rgba(14, 165, 233, 0.15)', color2: 'rgba(56, 189, 248, 0.0)', speed: 0.0006, freq: 0.0012, amp: 110, yOff: 0.18 },
      { color1: 'rgba(34, 197, 94, 0.08)', color2: 'rgba(16, 185, 129, 0.0)', speed: 0.0005, freq: 0.001, amp: 90, yOff: 0.4 },
    ];

    // Star particles
    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height * 0.7,
      radius: Math.random() * 1.4 + 0.4,
      alpha: Math.random() * 0.8 + 0.2,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      phase: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      time += 1;
      ctx.clearRect(0, 0, width, height);

      if (!transparent) {
        // Deep dark cosmic background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#07090E');
        bgGrad.addColorStop(0.5, '#0B0D13');
        bgGrad.addColorStop(1, '#0F1115');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Render Stars with twinkling
      for (const star of stars) {
        const currentAlpha = star.alpha * (0.6 + 0.4 * Math.sin(time * star.twinkleSpeed + star.phase));
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render Aurora Wave Curtains
      auroras.forEach((a) => {
        ctx.save();
        ctx.beginPath();
        const baseHeight = height * a.yOff;
        ctx.moveTo(0, height);

        for (let x = 0; x <= width; x += 15) {
          const wave1 = Math.sin(x * a.freq + time * a.speed) * a.amp;
          const wave2 = Math.cos(x * a.freq * 1.5 - time * a.speed * 1.2) * (a.amp * 0.6);
          const wave3 = Math.sin((x + time * 10) * 0.0008) * (a.amp * 0.3);
          const y = baseHeight + wave1 + wave2 + wave3;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, baseHeight - a.amp, 0, height * 0.85);
        grad.addColorStop(0, a.color1);
        grad.addColorStop(0.5, a.color2);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });

      // Top-Left Blue Atmospheric Volumetric Light Beam
      const beam = ctx.createRadialGradient(0, 0, 50, 0, 0, width * 0.6);
      beam.addColorStop(0, 'rgba(59, 130, 246, 0.22)');
      beam.addColorStop(0.4, 'rgba(37, 99, 235, 0.08)');
      beam.addColorStop(1, 'transparent');
      ctx.fillStyle = beam;
      ctx.fillRect(0, 0, width * 0.8, height * 0.6);

      // Bottom Planet Earth Curvature Horizon
      if (showHorizon) {
        const horizonCenter = width / 2;
        const horizonY = height + 480;
        const horizonRadius = Math.max(width * 0.85, 750);

        ctx.save();
        ctx.beginPath();
        ctx.arc(horizonCenter, horizonY, horizonRadius, Math.PI, 0);
        ctx.closePath();

        // Planet atmospheric rim glow
        const horizonGlow = ctx.createRadialGradient(
          horizonCenter,
          horizonY,
          horizonRadius - 60,
          horizonCenter,
          horizonY,
          horizonRadius + 20
        );
        horizonGlow.addColorStop(0, 'rgba(59, 130, 246, 0.45)');
        horizonGlow.addColorStop(0.3, 'rgba(96, 165, 250, 0.2)');
        horizonGlow.addColorStop(0.8, 'rgba(30, 58, 138, 0.05)');
        horizonGlow.addColorStop(1, 'transparent');

        ctx.fillStyle = horizonGlow;
        ctx.fill();

        // Horizon thin cyan light edge
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.8)';
        ctx.shadowColor = '#3B82F6';
        ctx.shadowBlur = 25;
        ctx.stroke();
        ctx.restore();
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [showHorizon, intensity]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
