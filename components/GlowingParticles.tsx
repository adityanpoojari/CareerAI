const particles = [
  { left: "5%", top: "15%", size: 4, delay: "0s", duration: "8s" },
  { left: "15%", top: "70%", size: 3, delay: "2s", duration: "11s" },
  { left: "28%", top: "30%", size: 5, delay: "1s", duration: "9s" },
  { left: "45%", top: "85%", size: 3, delay: "4s", duration: "12s" },
  { left: "58%", top: "18%", size: 4, delay: "3s", duration: "10s" },
  { left: "72%", top: "58%", size: 3, delay: "1s", duration: "9s" },
  { left: "88%", top: "25%", size: 5, delay: "5s", duration: "11s" },
  { left: "94%", top: "78%", size: 3, delay: "2s", duration: "13s" },
  { left: "38%", top: "48%", size: 2, delay: "3s", duration: "7s" },
  { left: "65%", top: "88%", size: 4, delay: "0s", duration: "10s" },
  { left: "8%", top: "45%", size: 2, delay: "6s", duration: "12s" },
  { left: "82%", top: "12%", size: 3, delay: "4s", duration: "8s" },
  { left: "21%", top: "8%", size: 2, delay: "5s", duration: "10s" },
  { left: "34%", top: "66%", size: 3, delay: "1s", duration: "13s" },
  { left: "52%", top: "42%", size: 2, delay: "7s", duration: "9s" },
  { left: "76%", top: "36%", size: 4, delay: "3s", duration: "12s" },
  { left: "97%", top: "48%", size: 2, delay: "6s", duration: "11s" },
  { left: "12%", top: "92%", size: 3, delay: "2s", duration: "8s" },
  { left: "61%", top: "72%", size: 2, delay: "4s", duration: "14s" },
  { left: "43%", top: "11%", size: 3, delay: "0s", duration: "10s" },
];

export default function GlowingParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((particle, index) => (
        <span
          key={index}
          className="absolute rounded-full bg-white shadow-[0_0_14px_4px_rgba(255,255,255,0.55)] animate-[float_10s_ease-in-out_infinite]"
          style={{
            left: particle.left,
            top: particle.top,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}

      <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -right-32 bottom-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
    </div>
  );
}
