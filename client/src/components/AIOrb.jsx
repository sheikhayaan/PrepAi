import React, { useEffect, useRef } from 'react';

export default function AIOrb({
  isSpeaking = false,
  isListening = false,
  volume = 0,
  size = 120,
}) {
  const canvasRef = useRef(null);
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const renderSize = size * 2;
    canvas.width = renderSize * dpr;
    canvas.height = renderSize * dpr;
    ctx.scale(dpr, dpr);

    let animationFrameId;
    let time = 0;

    const render = () => {
      // Dynamic speed based on speaking/listening state (respects reduced motion)
      const speed = prefersReducedMotion ? 0.005 : (isSpeaking ? 0.045 : isListening ? 0.03 : 0.018);
      time += speed;

      const width = renderSize;
      const height = renderSize;
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = (size / 2) * 0.72;

      ctx.clearRect(0, 0, width, height);

      // 1. External Multi-Layered Aurora Ambient Glow
      const outerGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.4,
        centerX,
        centerY,
        baseRadius * 2.2
      );
      if (isSpeaking) {
        outerGlow.addColorStop(0, 'rgba(59, 130, 246, 0.6)');
        outerGlow.addColorStop(0.35, 'rgba(99, 102, 241, 0.3)');
        outerGlow.addColorStop(0.7, 'rgba(147, 51, 234, 0.1)');
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (isListening) {
        outerGlow.addColorStop(0, 'rgba(34, 197, 94, 0.5)');
        outerGlow.addColorStop(0.4, 'rgba(59, 130, 246, 0.25)');
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        outerGlow.addColorStop(0, 'rgba(37, 99, 235, 0.35)');
        outerGlow.addColorStop(0.5, 'rgba(59, 130, 246, 0.12)');
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 2. Liquid Surface Ripple Displacement (3D Fluid Mesh)
      ctx.save();
      ctx.beginPath();
      const numPoints = 48;
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const reactiveAmp = isSpeaking ? 6.5 + volume * 8 : isListening ? 3.5 : 1.5;
        const wave1 = Math.sin(angle * 3 + time * 2.2) * reactiveAmp;
        const wave2 = Math.cos(angle * 5 - time * 1.8) * (reactiveAmp * 0.6);
        const wave3 = Math.sin(angle * 7 + time * 3.1) * (reactiveAmp * 0.3);
        const r = baseRadius + wave1 + wave2 + wave3;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // 3. 3D Internal Spherical Shading with Chromatic Depth
      const sphereGradient = ctx.createRadialGradient(
        centerX - baseRadius * 0.35,
        centerY - baseRadius * 0.35,
        baseRadius * 0.05,
        centerX,
        centerY,
        baseRadius * 1.15
      );
      if (isSpeaking) {
        sphereGradient.addColorStop(0, '#BFDBFE');
        sphereGradient.addColorStop(0.2, '#60A5FA');
        sphereGradient.addColorStop(0.5, '#2563EB');
        sphereGradient.addColorStop(0.8, '#1E3A8A');
        sphereGradient.addColorStop(1, '#020617');
      } else if (isListening) {
        sphereGradient.addColorStop(0, '#BBF7D0');
        sphereGradient.addColorStop(0.25, '#38BDF8');
        sphereGradient.addColorStop(0.6, '#1D4ED8');
        sphereGradient.addColorStop(1, '#020617');
      } else {
        sphereGradient.addColorStop(0, '#93C5FD');
        sphereGradient.addColorStop(0.25, '#3B82F6');
        sphereGradient.addColorStop(0.65, '#1D4ED8');
        sphereGradient.addColorStop(0.9, '#0F172A');
        sphereGradient.addColorStop(1, '#020617');
      }

      ctx.fillStyle = sphereGradient;
      ctx.fill();

      // 4. Luminous Electric Edge Stroke
      ctx.lineWidth = isSpeaking ? 3 : 2;
      ctx.strokeStyle = isSpeaking
        ? 'rgba(191, 219, 254, 0.9)'
        : 'rgba(147, 197, 253, 0.65)';
      ctx.shadowColor = '#60A5FA';
      ctx.shadowBlur = isSpeaking ? 18 : 8;
      ctx.stroke();

      // 5. Specular High-Gloss Liquid Flare (Curvature Reflection)
      const highlight = ctx.createRadialGradient(
        centerX - baseRadius * 0.35,
        centerY - baseRadius * 0.38,
        0,
        centerX - baseRadius * 0.35,
        centerY - baseRadius * 0.38,
        baseRadius * 0.55
      );
      highlight.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      highlight.addColorStop(0.35, 'rgba(191, 219, 254, 0.45)');
      highlight.addColorStop(0.8, 'rgba(255, 255, 255, 0.05)');
      highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = highlight;
      ctx.beginPath();
      ctx.arc(
        centerX - baseRadius * 0.35,
        centerY - baseRadius * 0.38,
        baseRadius * 0.55,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // 6. Secondary Internal Floor Reflection
      const floorGlow = ctx.createRadialGradient(
        centerX + baseRadius * 0.28,
        centerY + baseRadius * 0.36,
        0,
        centerX + baseRadius * 0.28,
        centerY + baseRadius * 0.36,
        baseRadius * 0.45
      );
      floorGlow.addColorStop(0, 'rgba(96, 165, 250, 0.6)');
      floorGlow.addColorStop(0.6, 'rgba(59, 130, 246, 0.2)');
      floorGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = floorGlow;
      ctx.beginPath();
      ctx.arc(
        centerX + baseRadius * 0.28,
        centerY + baseRadius * 0.36,
        baseRadius * 0.45,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSpeaking, isListening, volume, size]);

  return (
    <div
      className="relative flex items-center justify-center transition-transform duration-300"
      style={{ width: size * 1.5, height: size * 1.5 }}
      role="img"
      aria-label={`AI Interviewer Orb Visualizer (${isSpeaking ? 'Speaking question' : isListening ? 'Listening to speech' : 'Idle'})`}
    >
      <canvas
        ref={canvasRef}
        width={size * 2}
        height={size * 2}
        className="w-full h-full drop-shadow-[0_0_40px_rgba(59,130,246,0.7)] cursor-pointer hover:scale-105 transition-transform"
        aria-hidden="true"
      />
    </div>
  );
}
