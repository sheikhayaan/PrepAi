import React from 'react';

export default function CosmicBackground({ showHorizon = false, showBeam = true }) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Deep dark base */}
      <div className="absolute inset-0 bg-[#0A0C10]" />

      {/* Top-Left Celestial Blue Volumetric Light Beam */}
      {showBeam && (
        <div className="absolute -top-32 -left-32 w-[650px] h-[650px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none transform -rotate-12" />
      )}

      {/* Subtle Top-Center Blue Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-blue-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Star Field Particles (Subtle) */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(1.5px 1.5px at 10% 20%, rgba(255,255,255,0.7) 100%, transparent),
                            radial-gradient(1px 1px at 30% 60%, rgba(147,197,253,0.8) 100%, transparent),
                            radial-gradient(1.5px 1.5px at 70% 30%, rgba(255,255,255,0.6) 100%, transparent),
                            radial-gradient(1px 1px at 85% 75%, rgba(147,197,253,0.7) 100%, transparent),
                            radial-gradient(2px 2px at 50% 15%, rgba(255,255,255,0.8) 100%, transparent),
                            radial-gradient(1px 1px at 90% 10%, rgba(147,197,253,0.5) 100%, transparent),
                            radial-gradient(1.5px 1.5px at 20% 85%, rgba(255,255,255,0.5) 100%, transparent)`,
          backgroundSize: '350px 350px',
        }}
      />

      {/* Bottom Planet Earth Horizon Curvature Glow */}
      {showHorizon && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[160vw] h-[400px] pointer-events-none">
          {/* Horizon Rim Curved Arc */}
          <div className="absolute inset-0 rounded-[100%] bg-gradient-to-t from-blue-900/40 via-blue-600/15 to-transparent blur-[60px] transform translate-y-36" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-70 shadow-[0_0_25px_4px_rgba(59,130,246,0.8)]" />
        </div>
      )}
    </div>
  );
}
