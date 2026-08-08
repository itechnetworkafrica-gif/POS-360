import { useEffect, useState } from "react";

const STEPS = [
  { label: "Establishing secure connection...",  pct: 12 },
  { label: "Loading your store profile...",       pct: 28 },
  { label: "Syncing inventory data...",           pct: 45 },
  { label: "Fetching sales & reports...",         pct: 61 },
  { label: "Applying your settings...",           pct: 76 },
  { label: "Preparing your dashboard...",         pct: 90 },
  { label: "Almost ready...",                     pct: 97 },
];

export function LoadingScreen() {
  const [stepIdx, setStepIdx]   = useState(0);
  const [displayPct, setDisplayPct] = useState(0);

  // Advance steps every 700ms (total ~5s for the full sequence)
  useEffect(() => {
    const t = setInterval(() => {
      setStepIdx(i => Math.min(i + 1, STEPS.length - 1));
    }, 700);
    return () => clearInterval(t);
  }, []);

  // Smooth-interpolate toward target percentage
  useEffect(() => {
    const target = STEPS[stepIdx].pct;
    const t = setInterval(() => {
      setDisplayPct(p => {
        if (p >= target) { clearInterval(t); return p; }
        return Math.min(p + 1, target);
      });
    }, 18);
    return () => clearInterval(t);
  }, [stepIdx]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: "linear-gradient(135deg,#07090f 0%,#0d1422 50%,#050709 100%)" }}
    >
      {/* Animated grid background */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(#5AC85A 1px,transparent 1px),linear-gradient(90deg,#5AC85A 1px,transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />

      {/* Ambient glow orbs */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle,rgba(90,200,90,0.18) 0%,transparent 70%)",
          animation: "glowPulse 4s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle,rgba(51,170,255,0.08) 0%,transparent 70%)",
          animation: "glowPulse 6s ease-in-out infinite reverse",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-10 w-[320px]">

        {/* Logo with spinning rings */}
        <div className="relative h-32 w-32 flex items-center justify-center">
          {/* Outer ring — slow */}
          <svg
            className="absolute inset-0 w-full h-full animate-spin"
            style={{ animationDuration: "4s" }}
            viewBox="0 0 128 128"
          >
            <defs>
              <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5AC85A" stopOpacity="1" />
                <stop offset="60%" stopColor="#5AC85A" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#5AC85A" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle cx="64" cy="64" r="58" fill="none" stroke="url(#g1)" strokeWidth="2.5"
              strokeDasharray="200 165" strokeLinecap="round" />
          </svg>

          {/* Middle ring — counter */}
          <svg
            className="absolute inset-0 w-full h-full animate-spin"
            style={{ animationDuration: "3s", animationDirection: "reverse" }}
            viewBox="0 0 128 128"
          >
            <defs>
              <linearGradient id="g2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#5AC85A" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#5AC85A" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle cx="64" cy="64" r="48" fill="none" stroke="url(#g2)" strokeWidth="1.5"
              strokeDasharray="90 210" strokeLinecap="round" />
          </svg>

          {/* Inner ring — fast */}
          <svg
            className="absolute inset-0 w-full h-full animate-spin"
            style={{ animationDuration: "1.8s" }}
            viewBox="0 0 128 128"
          >
            <circle cx="64" cy="64" r="38" fill="none" stroke="rgba(90,200,90,0.2)"
              strokeWidth="1" strokeDasharray="40 200" strokeLinecap="round" />
          </svg>

          {/* Logo box */}
          <div
            className="h-[72px] w-[72px] rounded-2xl flex items-center justify-center relative z-10"
            style={{
              background: "rgba(90,200,90,0.09)",
              border: "1px solid rgba(90,200,90,0.28)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 0 32px rgba(90,200,90,0.15), inset 0 1px 0 rgba(255,255,255,0.07)",
            }}
          >
            <img
              src="/logo.png"
              alt="Gotecx POS"
              className="h-[46px] w-[46px] object-contain"
              style={{ filter: "drop-shadow(0 0 16px rgba(90,200,90,0.7))" }}
            />
          </div>
        </div>

        {/* Brand */}
        <div className="text-center space-y-1">
          <h1 className="text-[42px] font-black tracking-tight leading-none text-white">
            POS<span style={{ color: "#5AC85A" }}>360</span>
          </h1>
          <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-white/25">
            Enterprise POS Platform
          </p>
        </div>

        {/* Progress */}
        <div className="w-full space-y-3">
          <div
            className="relative h-[3px] w-full rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${displayPct}%`,
                background: "linear-gradient(90deg,#3de878,#5AC85A,#8cf08c)",
                boxShadow: "0 0 14px rgba(90,200,90,0.8)",
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p
              className="text-[11px] transition-all duration-500 truncate max-w-[220px]"
              style={{ color: "rgba(255,255,255,0.38)" }}
            >
              {STEPS[stepIdx].label}
            </p>
            <span className="text-[11px] font-bold tabular-nums ml-2" style={{ color: "#5AC85A" }}>
              {displayPct}%
            </span>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-400"
              style={{
                height: i === stepIdx ? "6px" : "5px",
                width:  i === stepIdx ? "18px" : "5px",
                background: i <= stepIdx ? "#5AC85A" : "rgba(255,255,255,0.12)",
                boxShadow: i === stepIdx ? "0 0 8px #5AC85A" : "none",
              }}
            />
          ))}
        </div>
      </div>

      <p className="absolute bottom-6 text-[10px] text-white/15 tracking-widest uppercase">
        Powered by Gotecx
      </p>

      <style>{`
        @keyframes glowPulse {
          0%,100% { transform: translate(-50%,-50%) scale(1); opacity: 0.9; }
          50%      { transform: translate(-50%,-50%) scale(1.12); opacity: 1.3; }
        }
      `}</style>
    </div>
  );
}
