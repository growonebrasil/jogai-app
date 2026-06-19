import { cn } from "@/lib/utils";
import { usePlayerPerformance } from "@/hooks/usePlayerPerformance";

interface PlayerCardEAFCProps {
  name: string;
  username?: string;
  position: string;
  overall: number;
  goals?: number;
  assists?: number;
  matches?: number;
  yellowCards?: number;
  redCards?: number;
  craqueVotes?: number;
  rarity?: "bronze" | "prata" | "ouro" | "ouro_raro" | "roxo" | "azul";
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  userId?: string;
}

const rarityConfig = {
  bronze: {
    bg: "linear-gradient(160deg, #4a3520 0%, #2a1d10 40%, #1a1008 100%)",
    accent: "#C9A84C",
    accentLight: "#DEC070",
    border: "#8B6914",
    frameBorder: "rgba(201,168,76,0.5)",
    glow: "rgba(139,105,20,0.4)",
    textMain: "#DEC070",
    neon: "#C9A84C",
  },
  prata: {
    bg: "linear-gradient(160deg, #3a4550 0%, #1e2830 40%, #0f1820 100%)",
    accent: "#D0DCE8",
    accentLight: "#E8F0F8",
    border: "#A0B0C0",
    frameBorder: "rgba(208,220,232,0.4)",
    glow: "rgba(160,176,192,0.4)",
    textMain: "#E8F0F8",
    neon: "#D0DCE8",
  },
  ouro: {
    bg: "linear-gradient(160deg, #3a3010 0%, #1a1808 40%, #0a0a04 100%)",
    accent: "#FFF0A0",
    accentLight: "#FFFBE8",
    border: "#E8C840",
    frameBorder: "rgba(232,200,64,0.5)",
    glow: "rgba(232,200,64,0.45)",
    textMain: "#FFF0A0",
    neon: "#E8C840",
  },
  ouro_raro: {
    bg: "linear-gradient(160deg, #0a0a2e 0%, #0a0820 50%, #050510 100%)",
    accent: "#E8C840",
    accentLight: "#F0D860",
    border: "#C8A830",
    frameBorder: "rgba(200,168,48,0.6)",
    glow: "rgba(200,168,48,0.5)",
    textMain: "#F0D860",
    neon: "#E8C840",
  },
  roxo: {
    bg: "linear-gradient(160deg, #2a0040 0%, #180028 40%, #0a0014 100%)",
    accent: "#E0B0FF",
    accentLight: "#F0D8FF",
    border: "#BA55D3",
    frameBorder: "rgba(186,85,211,0.5)",
    glow: "rgba(186,85,211,0.45)",
    textMain: "#F0D8FF",
    neon: "#BA55D3",
  },
  azul: {
    bg: "linear-gradient(160deg, #001838 0%, #001028 40%, #000818 100%)",
    accent: "#80DDFF",
    accentLight: "#B0EEFF",
    border: "#00AAFF",
    frameBorder: "rgba(0,170,255,0.5)",
    glow: "rgba(0,170,255,0.45)",
    textMain: "#B0EEFF",
    neon: "#00AAFF",
  },
};

const sizeConfig = {
  sm: { width: 200, height: 310, overall: "text-[40px]", pos: "text-[11px]", name: "text-[11px]", statLabel: "text-[7px]", statVal: "text-[13px]" },
  md: { width: 260, height: 400, overall: "text-[52px]", pos: "text-[13px]", name: "text-[13px]", statLabel: "text-[8px]", statVal: "text-[15px]" },
  lg: { width: 320, height: 490, overall: "text-[64px]", pos: "text-[15px]", name: "text-[15px]", statLabel: "text-[9px]", statVal: "text-[17px]" },
};

const positionLabels: Record<string, string> = {
  GOL: "GOL", ZAG: "ZAG", LAT: "LAT", VOL: "VOL", MEI: "MEI", ATA: "ATA",
};

export function PlayerCardEAFC({
  name, username, position, overall,
  goals, assists, matches, yellowCards, redCards, craqueVotes,
  rarity = "ouro", avatarUrl, size = "md", className, userId,
}: PlayerCardEAFCProps) {
  const { data: performance } = usePlayerPerformance(userId);

  const c = rarityConfig[rarity];
  const s = sizeConfig[size];
  const cardName = name.length > 16 ? name.split(" ").slice(0, 2).join(" ") : name;

  // Use real calculated score when available
  const displayOverall = performance?.calculatedScore ?? overall;

  const pGoals = goals ?? performance?.goals ?? 0;
  const pAssists = assists ?? performance?.assists ?? 0;
  const pMatches = matches ?? performance?.matches ?? 0;
  const pCards = (yellowCards ?? performance?.yellowCards ?? 0) + (redCards ?? performance?.redCards ?? 0);
  const pCraque = craqueVotes ?? performance?.fairPlayVotes ?? 0;

  const statsLeft = [
    { label: "PAR", value: pMatches },
    { label: "GOL", value: pGoals },
    { label: "ASS", value: pAssists },
  ];
  const statsRight = [
    { label: "CAR", value: pCards },
    { label: "CRQ", value: pCraque },
  ];

  return (
    <div
      className={cn("group relative select-none", className)}
      style={{ width: s.width, height: s.height }}
    >
      {/* Outer glow */}
      <div
        className="absolute -inset-3 rounded-[22px] opacity-30 blur-2xl transition-all duration-500 group-hover:opacity-60"
        style={{ background: `radial-gradient(ellipse, ${c.glow}, transparent 70%)` }}
      />

      {/* Card body */}
      <div
        className="absolute inset-0 overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]"
        style={{
          borderRadius: "16px",
          border: `1.5px solid ${c.frameBorder}`,
          boxShadow: `0 0 0 1px ${c.border}20 inset, 0 24px 64px rgba(0,0,0,0.75), 0 2px 8px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Layer 1: Base gradient */}
        <div className="absolute inset-0" style={{ background: c.bg }} />

        {/* Layer 2: Player image as BACKGROUND — full bleed */}
        {avatarUrl ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${avatarUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center 20%",
              backgroundRepeat: "no-repeat",
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="font-display font-black opacity-[0.07]"
              style={{ color: c.accent, fontSize: s.width * 0.7 }}
            >
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Layer 3: Cinematic vignette + bottom gradient for readability */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 120% 100% at 50% 30%, transparent 40%, rgba(0,0,0,0.6) 100%),
              linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.75) 30%, rgba(0,0,0,0.15) 55%, transparent 70%)
            `,
          }}
        />

        {/* Layer 3b: Neon accent glow at top */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 30% at 50% 0%, ${c.neon}18, transparent 60%)`,
          }}
        />

        {/* Decorative frame lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 260 400" preserveAspectRatio="none">
          <path d="M16,6 Q130,-6 244,6" stroke={c.accent} strokeWidth="0.8" fill="none" opacity="0.25" />
          <path d="M6,16 Q6,200 16,380 Q130,400 244,380 Q254,200 254,16" stroke={c.accent} strokeWidth="0.4" fill="none" opacity="0.1" />
          {/* Corner accents */}
          <line x1="6" y1="16" x2="30" y2="16" stroke={c.accent} strokeWidth="1" opacity="0.3" />
          <line x1="6" y1="16" x2="6" y2="40" stroke={c.accent} strokeWidth="1" opacity="0.3" />
          <line x1="254" y1="16" x2="230" y2="16" stroke={c.accent} strokeWidth="1" opacity="0.3" />
          <line x1="254" y1="16" x2="254" y2="40" stroke={c.accent} strokeWidth="1" opacity="0.3" />
        </svg>

        {/* TOP LEFT — SCORE + POSITION */}
        <div className="absolute top-3 left-4 z-20 flex flex-col items-center leading-none">
          <span
            className={cn("font-display font-black tracking-tighter leading-[0.85]", s.overall)}
            style={{
              color: c.textMain,
              textShadow: `0 0 30px ${c.glow}, 0 0 60px ${c.glow}, 0 2px 10px rgba(0,0,0,0.9)`,
            }}
          >
            {displayOverall}
          </span>
          <span
            className={cn("font-display font-bold uppercase tracking-[0.2em] mt-0.5", s.pos)}
            style={{
              color: c.accent,
              textShadow: `0 1px 6px rgba(0,0,0,0.9)`,
            }}
          >
            {positionLabels[position] || position}
          </span>
        </div>

        {/* BOTTOM SECTION — Name + Stats overlay on image */}
        <div className="absolute left-0 right-0 bottom-0 z-20">
          {/* Player name bar */}
          <div className="text-center px-3 mb-1">
            <h3
              className={cn("font-display font-black uppercase tracking-[0.12em] leading-tight", s.name)}
              style={{
                color: "#FFFFFF",
                textShadow: `0 0 12px ${c.glow}, 0 2px 8px rgba(0,0,0,0.9)`,
              }}
            >
              {cardName}
            </h3>
          </div>

          {/* Accent divider */}
          <div
            className="mx-auto mb-1.5"
            style={{
              width: "70%",
              height: 1,
              background: `linear-gradient(90deg, transparent, ${c.accent}80, transparent)`,
            }}
          />

          {/* Stats glass panel */}
          <div
            className="mx-2 mb-2 rounded-lg overflow-hidden"
            style={{
              background: `rgba(0,0,0,0.55)`,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: `1px solid ${c.accent}20`,
              boxShadow: `0 0 20px ${c.glow}20 inset`,
            }}
          >
            <div className="flex items-stretch">
              {/* Left stats */}
              <div className="flex-1 flex items-center justify-evenly py-2 px-1">
                {statsLeft.map((stat, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <span
                      className={cn("font-display font-black leading-none", s.statVal)}
                      style={{ color: "#FFFFFF", textShadow: `0 0 8px ${c.glow}` }}
                    >
                      {stat.value}
                    </span>
                    <span
                      className={cn("uppercase tracking-widest font-semibold mt-0.5", s.statLabel)}
                      style={{ color: c.accent, opacity: 0.8 }}
                    >
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Vertical divider */}
              <div
                style={{
                  width: 1,
                  background: `linear-gradient(180deg, transparent, ${c.accent}40, transparent)`,
                }}
              />

              {/* Right stats */}
              <div className="flex items-center justify-evenly py-2 px-1" style={{ width: "42%" }}>
                {statsRight.map((stat, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <span
                      className={cn("font-display font-black leading-none", s.statVal)}
                      style={{ color: "#FFFFFF", textShadow: `0 0 8px ${c.glow}` }}
                    >
                      {stat.value}
                    </span>
                    <span
                      className={cn("uppercase tracking-widest font-semibold mt-0.5", s.statLabel)}
                      style={{ color: c.accent, opacity: 0.8 }}
                    >
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Craque da Galera badge */}
          {pCraque > 0 && (
            <div className="flex justify-center pb-2">
              <div
                className="px-3 py-0.5 rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${c.neon}30, ${c.neon}10)`,
                  border: `1px solid ${c.neon}50`,
                  boxShadow: `0 0 12px ${c.neon}30`,
                }}
              >
                <span style={{ color: c.textMain, fontSize: "8px", fontWeight: 800, letterSpacing: "0.08em" }}>
                  ⭐ CRAQUE DA GALERA • {pCraque}×
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Hover shine sweep */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-[14px] z-30"
          style={{
            background: `linear-gradient(115deg, transparent 30%, ${c.accentLight}12 48%, ${c.accentLight}25 50%, ${c.accentLight}12 52%, transparent 70%)`,
          }}
        />
      </div>
    </div>
  );
}
