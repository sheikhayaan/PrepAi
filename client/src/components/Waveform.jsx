import React from 'react';

export default function Waveform({ isRecording = false, volume = 0 }) {
  const bars = [0.3, 0.7, 1.0, 0.6, 0.9, 0.4, 0.8, 0.5, 0.9, 0.6, 0.3];

  return (
    <div className="flex items-center justify-center gap-1 h-8 px-3 py-1 bg-surface/80 border border-hairline rounded-full">
      {bars.map((baseHeight, idx) => {
        const heightMultiplier = isRecording ? Math.max(0.2, (volume * 1.5 + baseHeight) % 1) : 0.2;
        const barHeight = Math.max(4, Math.round(heightMultiplier * 24));

        return (
          <div
            key={idx}
            className={`w-1 rounded-full transition-all duration-100 ${
              isRecording ? 'bg-accent shadow-[0_0_8px_rgba(91,140,255,0.8)]' : 'bg-text-muted/40'
            }`}
            style={{
              height: `${barHeight}px`,
              animation: isRecording ? `pulseGlow ${0.4 + idx * 0.1}s ease-in-out infinite alternate` : 'none',
            }}
          />
        );
      })}
    </div>
  );
}
