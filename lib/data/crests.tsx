import type { ReactNode } from "react";

/**
 * Our own simplified drawings of each college's arms, worked from the blazon
 * (the design is heraldry; these drawings are ours). Shapes are kept big and
 * few so they read at 40px: the main field, ordinaries (chevron, cross,
 * chief…) and a simplified glyph for each charge. Drawn on a 60×64 shield
 * whose inside runs roughly x 6–54, y 4–60, and clipped to it.
 */

export const TINCTURES = {
  or: "#e2b84a",
  argent: "#ffffff",
  gules: "#c0453d",
  azure: "#3f5f9a",
  sable: "#1b1a12",
  vert: "#4f7a4a",
  purpure: "#6b4a7a",
  ink: "#1b1a12",
  plain: "#e7dfcb",
  plainDark: "#cfc4a8",
} as const;

const { or, argent, gules, azure, sable, vert, purpure } = TINCTURES;

export type CrestSpec = {
  field: string;
  art: ReactNode;
  /** Two main colours, for the college page banner. */
  colours: [string, string];
};

// ── Ordinaries ────────────────────────────────────────────────────────────

const Chevron = ({ y = 38, c, w = 7, left, right }: { y?: number; c?: string; w?: number; left?: string; right?: string }) => (
  <>
    <path d={`M2 ${y + 18} L30 ${y}`} stroke={left ?? c} strokeWidth={w} strokeLinecap="butt" />
    <path d={`M30 ${y} L58 ${y + 18}`} stroke={right ?? c} strokeWidth={w} strokeLinecap="butt" />
  </>
);
const Chief = ({ c, h = 16 }: { c: string; h?: number }) => <rect x="0" y="0" width="60" height={h} fill={c} />;
const Fess = ({ c, y = 26, h = 12 }: { c: string; y?: number; h?: number }) => <rect x="0" y={y} width="60" height={h} fill={c} />;
const Cross = ({ c, w = 9 }: { c: string; w?: number }) => (
  <>
    <rect x={30 - w / 2} y="0" width={w} height="64" fill={c} />
    <rect x="0" y={30 - w / 2} width="60" height={w} fill={c} />
  </>
);
const Saltire = ({ c, w = 9 }: { c: string; w?: number }) => (
  <>
    <path d="M0 0 L60 64" stroke={c} strokeWidth={w} />
    <path d="M60 0 L0 64" stroke={c} strokeWidth={w} />
  </>
);
const Bordure = ({ c, w = 8 }: { c: string; w?: number }) => (
  <path d="M6 4h48v26c0 16-12 25-24 30C18 55 6 46 6 30z" fill="none" stroke={c} strokeWidth={w * 2} />
);
const PerPale = ({ right }: { right: string }) => <rect x="30" y="0" width="30" height="64" fill={right} />;
const Flaunches = ({ c }: { c: string }) => (
  <>
    <path d="M0 0 H10 Q22 32 10 64 H0z" fill={c} />
    <path d="M60 0 H50 Q38 32 50 64 H60z" fill={c} />
  </>
);

// ── Charges (simplified glyphs) ───────────────────────────────────────────

const Star = ({ x, y, r = 5, c, n = 5 }: { x: number; y: number; r?: number; c: string; n?: number }) => {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI / n) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`);
  }
  return <polygon points={pts.join(" ")} fill={c} />;
};
const Rose = ({ x, y, r = 4.5, c = gules }: { x: number; y: number; r?: number; c?: string }) => (
  <>
    <circle cx={x} cy={y} r={r} fill={c} stroke={sable} strokeWidth="0.8" />
    <circle cx={x} cy={y} r={r * 0.35} fill={or} />
  </>
);
const Cinquefoil = ({ x, y, c }: { x: number; y: number; c: string }) => (
  <>
    {[0, 1, 2, 3, 4].map((i) => {
      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      return <circle key={i} cx={x + 2.6 * Math.cos(a)} cy={y + 2.6 * Math.sin(a)} r="2.1" fill={c} />;
    })}
    <circle cx={x} cy={y} r="1.1" fill={or} />
  </>
);
const Bird = ({ x, y, s = 1, c = sable }: { x: number; y: number; s?: number; c?: string }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M-5 0 C-3 -3 1 -3 2 -1 L5 -2 L3 0.5 C2 2.5 -2 2.5 -5 0z M-1 1 L-2 3 M1 1 L0.5 3"
    fill={c}
    stroke={c}
    strokeWidth="0.8"
  />
);
const LionPassant = ({ x, y, s = 1, c }: { x: number; y: number; s?: number; c: string }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M-7 -1 C-7 -4 -4 -5 -2 -3 L4 -3 C5 -5 8 -5 8 -2 C8 0 6 0 5 0 L5 4 L3.5 4 L3.5 1 L-2 1 L-2 4 L-3.5 4 L-3.5 1 C-5 1 -6 0 -7 -1z M-7 -1 C-9 -2 -9 -5 -8 -6"
    fill={c}
    stroke={c}
    strokeWidth="0.6"
    strokeLinejoin="round"
  />
);
const LionRampant = ({ x, y, s = 1, c }: { x: number; y: number; s?: number; c: string }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M-1 -8 C1 -9 3 -8 3 -6 L2 -4 L4 -3 L3 -2 L1 -3 L1 1 L4 5 L2 6 L0 3 L-2 6 L-4 5 L-2 1 L-2 -3 L-4 -4 L-3 -5 L-1 -4z M-2 1 C-5 0 -6 -3 -5 -6"
    fill={c}
    stroke={c}
    strokeWidth="0.6"
    strokeLinejoin="round"
  />
);
const Eagle = ({ x, y, s = 1, c }: { x: number; y: number; s?: number; c: string }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 -5 C1 -5 1.5 -4 1 -3 L5 -5 L6 -1 L2 0 L3 4 L0 2 L-3 4 L-2 0 L-6 -1 L-5 -5 L-1 -3 C-1.5 -4 -1 -5 0 -5z"
    fill={c}
  />
);
const Stag = ({ x, y, s = 1, c }: { x: number; y: number; s?: number; c: string }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M-5 0 L3 0 L4 -3 L5 -3 L5 -1 L4 1 L4 4 L3 4 L3 1 L-3 1 L-3 4 L-4 4 L-4 1 L-5 0z M4 -3 L3 -6 M4 -3 L6 -6 M4.5 -4.5 L7 -5"
    fill={c}
    stroke={c}
    strokeWidth="0.8"
    strokeLinejoin="round"
  />
);
const Head = ({ x, y, s = 1, c }: { x: number; y: number; s?: number; c: string }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M-3 3 L-3 -1 L-4 -4 L-1 -2 L1 -2 L4 -4 L3 -1 L3 3 L0 5z" fill={c} />
);
const Lily = ({ x, y, c = argent }: { x: number; y: number; c?: string }) => (
  <>
    <path d={`M${x} ${y + 5} V${y - 1}`} stroke={c} strokeWidth="1.3" />
    <path d={`M${x} ${y - 1} C${x - 3} ${y - 3} ${x - 3} ${y - 6} ${x} ${y - 7} C${x + 3} ${y - 6} ${x + 3} ${y - 3} ${x} ${y - 1}z`} fill={c} />
  </>
);
const Fleur = ({ x, y, s = 1, c }: { x: number; y: number; s?: number; c: string }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 -6 C2 -4 2 -1 0 1 C-2 -1 -2 -4 0 -6z M0 1 C3 -2 6 -1 5 2 C4 0 2 1 1 2z M0 1 C-3 -2 -6 -1 -5 2 C-4 0 -2 1 -1 2z M-3 2.5 H3 V3.5 H-3z M0 3.5 V6"
    fill={c}
    stroke={c}
    strokeWidth="0.6"
  />
);
const Book = ({ x, y, w = 16, page = argent, edge = or }: { x: number; y: number; w?: number; page?: string; edge?: string }) => (
  <>
    <path d={`M${x - w / 2} ${y - 5} L${x} ${y - 3} L${x + w / 2} ${y - 5} L${x + w / 2} ${y + 5} L${x} ${y + 7} L${x - w / 2} ${y + 5}z`} fill={page} stroke={edge} strokeWidth="1.2" />
    <path d={`M${x} ${y - 3} V${y + 7}`} stroke={sable} strokeWidth="0.8" />
  </>
);
const Crosslet = ({ x, y, s = 1, c }: { x: number; y: number; s?: number; c: string }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M-1 -4 H1 V-1 H4 V1 H1 V4 H-1 V1 H-4 V-1 H-1z" fill={c} />
);
const Patonce = ({ x, y, s = 1, c }: { x: number; y: number; s?: number; c: string }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M-2 -2 L-4 -9 L0 -7 L4 -9 L2 -2 L9 -4 L7 0 L9 4 L2 2 L4 9 L0 7 L-4 9 L-2 2 L-9 4 L-7 0 L-9 -4z"
    fill={c}
  />
);
const Wheel = ({ x, y, r = 4.5, c }: { x: number; y: number; r?: number; c: string }) => (
  <>
    <circle cx={x} cy={y} r={r} fill="none" stroke={c} strokeWidth="1.6" />
    {[0, 45, 90, 135].map((a) => (
      <path key={a} d={`M${x - r} ${y} H${x + r}`} stroke={c} strokeWidth="1.1" transform={`rotate(${a} ${x} ${y})`} />
    ))}
  </>
);
const Ermine = ({ x, y, c = sable }: { x: number; y: number; c?: string }) => (
  <>
    <path d={`M${x} ${y - 2} L${x - 1.6} ${y + 3} L${x + 1.6} ${y + 3}z`} fill={c} />
    <circle cx={x} cy={y - 3} r="0.9" fill={c} />
    <circle cx={x - 1.6} cy={y - 1.6} r="0.8" fill={c} />
    <circle cx={x + 1.6} cy={y - 1.6} r="0.8" fill={c} />
  </>
);
const ErmineField = ({ bg = argent, spot = sable }: { bg?: string; spot?: string }) => (
  <>
    <rect width="60" height="64" fill={bg} />
    {[12, 30, 48].flatMap((x, i) => [14, 32, 50].map((y, j) => <Ermine key={`${i}${j}`} x={x + (j % 2 ? 9 : 0)} y={y} c={spot} />))}
  </>
);
const Escallop = ({ x, y, c }: { x: number; y: number; c: string }) => (
  <path d={`M${x - 4} ${y} A4 4 0 0 1 ${x + 4} ${y} L${x} ${y + 4}z M${x} ${y + 4} V${y - 3.5} M${x - 2} ${y + 2} L${x - 2.8} ${y - 2.8} M${x + 2} ${y + 2} L${x + 2.8} ${y - 2.8}`} fill={c} stroke={sable} strokeWidth="0.6" />
);
const Key = ({ x, y, a = 0, c }: { x: number; y: number; a?: number; c: string }) => (
  <g transform={`rotate(${a} ${x} ${y})`}>
    <circle cx={x} cy={y - 8} r="2.6" fill="none" stroke={c} strokeWidth="1.5" />
    <path d={`M${x} ${y - 5.5} V${y + 8} M${x} ${y + 6} H${x + 3} M${x} ${y + 3} H${x + 3}`} stroke={c} strokeWidth="1.5" />
  </g>
);
const Plate = ({ x, y, r = 4, c = argent }: { x: number; y: number; r?: number; c?: string }) => (
  <circle cx={x} cy={y} r={r} fill={c} stroke={sable} strokeWidth="0.8" />
);
const Pear = ({ x, y, c }: { x: number; y: number; c: string }) => (
  <path d={`M${x} ${y - 4} C${x + 1.5} ${y - 2} ${x + 3.5} ${y} ${x + 3} ${y + 2.5} C${x + 2} ${y + 4.5} ${x - 2} ${y + 4.5} ${x - 3} ${y + 2.5} C${x - 3.5} ${y} ${x - 1.5} ${y - 2} ${x} ${y - 4}z`} fill={c} />
);
const Castle = ({ x, y, c }: { x: number; y: number; c: string }) => (
  <path d={`M${x - 6} ${y + 5} V${y - 2} H${x - 4} V${y - 5} H${x - 2} V${y - 2} H${x + 2} V${y - 5} H${x + 4} V${y - 2} H${x + 6} V${y + 5}z`} fill={c} stroke={sable} strokeWidth="0.7" />
);
const Mitre = ({ x, y, c }: { x: number; y: number; c: string }) => (
  <path d={`M${x - 4} ${y + 4} L${x - 4} ${y - 1} L${x} ${y - 6} L${x + 4} ${y - 1} L${x + 4} ${y + 4}z`} fill={c} stroke={sable} strokeWidth="0.6" />
);
const Tau = ({ x, y, c }: { x: number; y: number; c: string }) => <path d={`M${x - 4} ${y - 4} H${x + 4} V${y - 2} H${x + 1} V${y + 4} H${x - 1} V${y - 2} H${x - 4}z`} fill={c} />;

// ── The colleges ──────────────────────────────────────────────────────────

export const CRESTS: Record<string, CrestSpec> = {
  "All Souls": {
    field: or,
    colours: [gules, or],
    art: (
      <>
        <Chevron y={27} c={gules} w={8} />
        <Cinquefoil x={16} y={15} c={gules} />
        <Cinquefoil x={44} y={15} c={gules} />
        <Cinquefoil x={30} y={50} c={gules} />
      </>
    ),
  },
  Balliol: {
    field: azure,
    colours: [azure, gules],
    art: (
      <>
        <PerPale right={gules} />
        <LionRampant x={18} y={30} s={1.5} c={argent} />
        <path d="M36 12h12v16c0 8-6 13-6 13s-6-5-6-13z" fill="none" stroke={argent} strokeWidth="2.2" />
      </>
    ),
  },
  Blackfriars: {
    field: argent,
    colours: [sable, argent],
    art: (
      <>
        {[0, 2, 4, 6].map((i) => (
          <path key={i} d="M30 32 L30 -20 L70 -20z" fill={sable} transform={`rotate(${i * 45} 30 32)`} />
        ))}
        <Patonce x={30} y={32} s={1.6} c={gules} />
      </>
    ),
  },
  Brasenose: {
    field: argent,
    colours: [sable, or],
    art: (
      <>
        <rect x="22" y="0" width="16" height="64" fill={or} />
        <path d="M8 32 L15 22 L22 32" stroke={sable} strokeWidth="3" fill="none" />
        <Rose x={14} y={42} r={3.5} />
        <path d="M24 20h12v10c0 5-6 8-6 8s-6-3-6-8z" fill={gules} stroke={sable} strokeWidth="0.8" />
        <path d="M38 32 L45 22 L52 32" stroke={sable} strokeWidth="3" fill="none" />
        <Rose x={46} y={42} r={3.5} />
      </>
    ),
  },
  "Campion Hall": {
    field: argent,
    colours: [sable, argent],
    art: (
      <>
        <Cross c={sable} w={12} />
        <Plate x={30} y={30} r={6} />
        <Crosslet x={30} y={12} c={gules} s={0.8} />
        <Plate x={17} y={30} r={3} />
        <Plate x={43} y={30} r={3} />
      </>
    ),
  },
  "Christ Church": {
    field: sable,
    colours: [sable, or],
    art: (
      <>
        <Cross c={argent} w={11} />
        <LionPassant x={30} y={36} s={0.8} c={gules} />
        <Head x={16} y={27} c={azure} />
        <Head x={44} y={27} c={azure} />
        <Head x={16} y={48} c={azure} />
        <Head x={44} y={48} c={azure} />
        <Chief c={or} h={17} />
        <Rose x={30} y={9} r={4} />
        <Bird x={16} y={10} c={sable} />
        <Bird x={44} y={10} c={sable} />
      </>
    ),
  },
  "Corpus Christi": {
    field: argent,
    colours: [azure, sable],
    art: (
      <>
        <rect x="0" y="0" width="21" height="64" fill={azure} />
        <rect x="39" y="0" width="21" height="64" fill={sable} />
        <Bird x={14} y={30} s={1.3} c={or} />
        <path d="M24 22h12v10c0 5-6 8-6 8s-6-3-6-8z" fill={gules} stroke={sable} strokeWidth="0.8" />
        <path d="M40 34 L46 26 L52 34" stroke={or} strokeWidth="2.5" fill="none" />
        <Plate x={46} y={18} r={2.5} />
        <Plate x={46} y={44} r={2.5} />
      </>
    ),
  },
  Exeter: {
    field: argent,
    colours: [sable, argent],
    art: (
      <>
        <path d="M0 18 q6 -4 12 0 t12 0 t12 0 t12 0 t12 0" stroke={sable} strokeWidth="6" fill="none" transform="rotate(35 30 32) translate(0 4)" />
        <path d="M0 30 q6 -4 12 0 t12 0 t12 0 t12 0 t12 0" stroke={sable} strokeWidth="6" fill="none" transform="rotate(35 30 32) translate(0 10)" />
        <Bordure c={sable} w={6} />
        {[
          [11, 9], [30, 7], [49, 9], [9, 26], [51, 26], [14, 46], [46, 46], [30, 57],
        ].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="1.6" fill={or} />
        ))}
      </>
    ),
  },
  "Green Templeton": {
    field: or,
    colours: [vert, or],
    art: (
      <>
        <Flaunches c={vert} />
        <path d="M30 10 V54" stroke={sable} strokeWidth="2.6" />
        <path d="M27 18 C33 20 33 24 27 26 C33 28 33 32 27 34 C33 36 33 40 27 42" stroke={azure} strokeWidth="2" fill="none" />
        <circle cx="8" cy="32" r="3" fill={or} />
        <circle cx="52" cy="32" r="3" fill={or} />
      </>
    ),
  },
  "Harris Manchester": {
    field: gules,
    colours: [gules, argent],
    art: (
      <>
        <path d="M18 56 L42 24 M42 56 L18 24" stroke={or} strokeWidth="3" />
        <path d="M18 24 c-2 -4 2 -6 2 -9 c2 3 2 6 -2 9z M42 24 c2 -4 -2 -6 -2 -9 c-2 3 -2 6 2 9z" fill={or} />
        <Chief c={argent} h={17} />
        <Rose x={13} y={9} r={3.5} />
        <Rose x={47} y={9} r={3.5} />
        <Book x={30} y={9} w={13} edge={sable} />
      </>
    ),
  },
  Hertford: {
    field: gules,
    colours: [gules, argent],
    art: (
      <>
        <path d="M24 36 C24 30 27 28 30 28 C33 28 36 30 36 36 L33 44 H27z" fill={argent} />
        <path d="M26 30 C20 26 18 20 20 12 M22 22 L16 18 M34 30 C40 26 42 20 40 12 M38 22 L44 18" stroke={argent} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M30 12 V26 M26 16 H34" stroke={or} strokeWidth="2.4" />
      </>
    ),
  },
  Jesus: {
    field: vert,
    colours: [vert, argent],
    art: (
      <>
        <Stag x={20} y={18} s={1.2} c={argent} />
        <Stag x={40} y={18} s={1.2} c={argent} />
        <Stag x={30} y={42} s={1.4} c={argent} />
      </>
    ),
  },
  Keble: {
    field: argent,
    colours: [azure, gules],
    art: (
      <>
        <Chevron y={34} c={gules} w={8} />
        <Chief c={azure} h={17} />
        <Star x={16} y={9} c={or} />
        <Star x={30} y={9} c={or} />
        <Star x={44} y={9} c={or} />
      </>
    ),
  },
  Kellogg: {
    field: argent,
    colours: [azure, gules],
    art: (
      <>
        <path d="M30 0 L34 6 L26 12 L34 18 L26 24 L34 30 L26 36 L34 42 L26 48 L34 54 L30 64 H60 V0z" fill={azure} />
        <path d="M8 30 L17 20 L26 30" stroke={gules} strokeWidth="3" fill="none" />
        <Book x={17} y={42} w={11} page={azure} edge={argent} />
        <path d="M44 14 V50 M44 20 l-3 -3 M44 20 l3 -3 M44 27 l-3 -3 M44 27 l3 -3 M44 34 l-3 -3 M44 34 l3 -3" stroke={or} strokeWidth="2" fill="none" />
        <Bordure c={gules} w={4} />
      </>
    ),
  },
  "Lady Margaret Hall": {
    field: or,
    colours: [azure, or],
    art: (
      <>
        <Chevron y={30} c={azure} w={11} />
        <rect x="26" y="29" width="8" height="8" fill="none" stroke={or} strokeWidth="1.5" />
        <path d="M28 29v8 M32 29v8" stroke={or} strokeWidth="1" />
        <Head x={15} y={16} c={azure} />
        <Head x={45} y={16} c={azure} />
        <path d="M26 54 C26 46 34 46 34 54z M30 46 V44" fill={azure} stroke={azure} strokeWidth="1.5" />
      </>
    ),
  },
  Linacre: {
    field: sable,
    colours: [sable, or],
    art: (
      <>
        <Book x={30} y={32} w={22} />
        <text x="25" y="35" fontSize="6" textAnchor="middle" fill={sable} fontFamily="serif">α</text>
        <text x="35" y="35" fontSize="6" textAnchor="middle" fill={sable} fontFamily="serif">ω</text>
        <Escallop x={16} y={14} c={argent} />
        <Escallop x={44} y={14} c={argent} />
        <Escallop x={30} y={50} c={argent} />
      </>
    ),
  },
  Lincoln: {
    field: argent,
    colours: [azure, argent],
    art: (
      <>
        {[0, 2, 4].map((i) => (
          <rect key={i} x="0" y={i * 10.7 + 10.7} width="21" height="10.7" fill={azure} />
        ))}
        <path d="M24 20h12v10c0 5-6 8-6 8s-6-3-6-8z" fill={gules} stroke={sable} strokeWidth="0.8" />
        <rect x="39" y="0" width="21" height="64" fill={vert} />
        <Stag x={49} y={22} s={0.9} c={or} />
        <Stag x={49} y={40} s={0.9} c={or} />
      </>
    ),
  },
  Magdalen: {
    field: argent,
    colours: [sable, argent],
    art: (
      <>
        {[0, 1, 2, 3, 4, 5, 6].flatMap((i) =>
          [0, 1, 2, 3, 4].map((j) => (
            <path key={`${i}${j}`} d={`M${i * 10} ${j * 14 + 14} l5 7 -5 7 -5 -7z`} fill={(i + j) % 2 ? sable : argent} />
          )),
        )}
        <Chief c={sable} h={17} />
        <Lily x={17} y={11} />
        <Lily x={30} y={11} />
        <Lily x={43} y={11} />
      </>
    ),
  },
  Mansfield: {
    field: gules,
    colours: [gules, or],
    art: (
      <>
        <Book x={30} y={32} w={22} edge={or} />
        <Crosslet x={16} y={14} c={or} />
        <Crosslet x={44} y={14} c={or} />
        <Crosslet x={30} y={52} c={or} />
      </>
    ),
  },
  Merton: {
    field: or,
    colours: [azure, gules],
    art: (
      <>
        <Chevron y={16} left={azure} right={gules} w={6} />
        <Chevron y={30} left={gules} right={azure} w={6} />
        <Chevron y={44} left={azure} right={gules} w={6} />
      </>
    ),
  },
  "New College": {
    field: argent,
    colours: [sable, gules],
    art: (
      <>
        <Chevron y={24} c={sable} w={5} />
        <Chevron y={36} c={sable} w={5} />
        <Rose x={16} y={14} />
        <Rose x={44} y={14} />
        <Rose x={30} y={52} />
      </>
    ),
  },
  Nuffield: {
    field: argent,
    colours: [or, sable],
    art: (
      <>
        <ErmineField />
        <Fess c={or} y={25} h={13} />
        <path d="M30 27 V36 M22 29 H38 M22 29 L20 34 H24z M38 29 L36 34 H40z" stroke={sable} strokeWidth="1.2" fill="none" />
        <Rose x={17} y={14} r={4} />
        <Rose x={43} y={14} r={4} />
        <Pear x={18} y={47} c={sable} />
        <Pear x={30} y={51} c={sable} />
        <Pear x={42} y={47} c={sable} />
      </>
    ),
  },
  Oriel: {
    field: gules,
    colours: [gules, or],
    art: (
      <>
        <LionPassant x={30} y={16} s={1.1} c={or} />
        <LionPassant x={30} y={31} s={1.1} c={or} />
        <LionPassant x={30} y={46} s={1.1} c={or} />
        <Bordure c={argent} w={4} />
      </>
    ),
  },
  Pembroke: {
    field: azure,
    colours: [azure, gules],
    art: (
      <>
        <PerPale right={gules} />
        <LionRampant x={19} y={30} s={1.1} c={argent} />
        <LionRampant x={41} y={30} s={1.1} c={argent} />
        <LionRampant x={30} y={48} s={1.1} c={argent} />
        <rect x="0" y="0" width="30" height="16" fill={argent} />
        <rect x="30" y="0" width="30" height="16" fill={or} />
        <Rose x={18} y={8} r={3.5} />
        <path d="M42 12 V6 M42 6 c-3 -1 -3 -4 0 -4 c3 0 3 3 0 4z" stroke={vert} fill={purpure} strokeWidth="1.2" />
      </>
    ),
  },
  "Queen's": {
    field: argent,
    colours: [gules, argent],
    art: (
      <>
        <Eagle x={18} y={18} s={1.3} c={gules} />
        <Eagle x={42} y={18} s={1.3} c={gules} />
        <Eagle x={30} y={42} s={1.5} c={gules} />
        <Star x={18} y={18} r={1.6} n={6} c={or} />
      </>
    ),
  },
  "Regent's Park": {
    field: argent,
    colours: [gules, azure],
    art: (
      <>
        <Cross c={gules} w={13} />
        <Book x={30} y={34} w={13} page={or} edge={or} />
        <path d="M0 14 q7.5 -4 15 0 t15 0 t15 0 t15 0 V0 H0z" fill={azure} />
        <path d="M22 7 c3 -3 8 -3 10 0 l3 -2 v4 l-3 -2 c-2 3 -7 3 -10 0z" fill={or} />
      </>
    ),
  },
  Reuben: {
    field: argent,
    colours: [vert, azure],
    art: (
      <>
        <Flaunches c={vert} />
        <circle cx="30" cy="16" r="4" fill="none" stroke={azure} strokeWidth="2" />
        <circle cx="30" cy="30" r="4" fill="none" stroke={azure} strokeWidth="2" />
        <Ermine x={24} y={45} c={azure} />
        <Ermine x={36} y={45} c={azure} />
        <Ermine x={7} y={32} c={or} />
        <Ermine x={53} y={32} c={or} />
      </>
    ),
  },
  Somerville: {
    field: argent,
    colours: [gules, sable],
    art: (
      <>
        <Star x={30} y={42} c={gules} r={5.5} />
        <Star x={19} y={30} c={gules} r={5.5} />
        <Star x={41} y={30} c={gules} r={5.5} />
        {[
          [14, 12], [30, 12], [46, 12], [12, 46], [48, 46], [30, 56],
        ].map(([x, y]) => (
          <Crosslet key={`${x}${y}`} x={x} y={y} c={sable} s={0.75} />
        ))}
      </>
    ),
  },
  "St Anne's": {
    field: gules,
    colours: [gules, argent],
    art: (
      <>
        <Chevron y={30} c={argent} w={11} />
        <Bird x={18} y={40} s={0.7} c={sable} />
        <Bird x={30} y={32} s={0.7} c={sable} />
        <Bird x={42} y={40} s={0.7} c={sable} />
        <Head x={15} y={16} c={argent} />
        <Head x={45} y={16} c={argent} />
        <path d="M30 42 V58 M26 46 H34" stroke={argent} strokeWidth="2" />
        <circle cx="30" cy="52" r="3.5" fill="none" stroke={vert} strokeWidth="1.5" />
      </>
    ),
  },
  "St Antony's": {
    field: or,
    colours: [gules, or],
    art: (
      <>
        <Chevron y={30} c={gules} w={10} />
        <Star x={19} y={39} r={3} c={or} />
        <Star x={30} y={32} r={3} c={or} />
        <Star x={41} y={39} r={3} c={or} />
        <Tau x={16} y={15} c={gules} />
        <Tau x={44} y={15} c={gules} />
        <Tau x={30} y={52} c={gules} />
      </>
    ),
  },
  "St Catherine's": {
    field: sable,
    colours: [sable, or],
    art: (
      <>
        <Saltire c={argent} w={10} />
        <Ermine x={30} y={31} />
        <Wheel x={30} y={12} c={or} />
        <Wheel x={13} y={31} c={or} />
        <Wheel x={47} y={31} c={or} />
        <Wheel x={30} y={50} c={or} />
      </>
    ),
  },
  "St Cross": {
    field: argent,
    colours: [purpure, argent],
    art: (
      <>
        {/* A quarter (top left) in purple, with the cross turning white where it crosses it. */}
        <rect x="0" y="0" width="30" height="30" fill={purpure} />
        <rect x="26" y="0" width="8" height="64" fill={purpure} />
        <rect x="0" y="26" width="60" height="8" fill={purpure} />
        <rect x="26" y="0" width="4" height="30" fill={argent} />
        <rect x="0" y="26" width="30" height="4" fill={argent} />
        <rect x="22" y="6" width="16" height="4" fill={purpure} />
        <rect x="22" y="52" width="16" height="4" fill={purpure} />
        <rect x="8" y="22" width="4" height="16" fill={purpure} />
        <rect x="48" y="22" width="4" height="16" fill={purpure} />
      </>
    ),
  },
  "St Edmund Hall": {
    field: or,
    colours: [gules, or],
    art: (
      <>
        <Patonce x={30} y={31} s={2.4} c={gules} />
        <Bird x={15} y={15} c={sable} />
        <Bird x={45} y={15} c={sable} />
        <Bird x={15} y={46} c={sable} />
        <Bird x={45} y={46} c={sable} />
      </>
    ),
  },
  "St Hilda's": {
    field: azure,
    colours: [azure, or],
    art: (
      <>
        <Fess c={or} y={25} h={13} />
        <Star x={17} y={31.5} r={4} n={6} c={gules} />
        <Star x={30} y={31.5} r={4} n={6} c={gules} />
        <Star x={43} y={31.5} r={4} n={6} c={gules} />
        <Head x={18} y={14} c={argent} />
        <Head x={42} y={14} c={argent} />
        <path d="M22 50 C22 44 38 44 38 50 C38 55 26 55 26 50 C26 47 34 47 34 50" stroke={argent} strokeWidth="2.2" fill="none" />
      </>
    ),
  },
  "St Hugh's": {
    field: azure,
    colours: [azure, or],
    art: (
      <>
        <Saltire c={argent} w={10} />
        <Ermine x={30} y={31} />
        <Fleur x={30} y={12} c={or} />
        <Fleur x={13} y={31} c={or} />
        <Fleur x={47} y={31} c={or} />
        <Fleur x={30} y={50} c={or} />
      </>
    ),
  },
  "St John's": {
    field: gules,
    colours: [gules, sable],
    art: (
      <>
        <Bordure c={sable} w={6} />
        {[
          [11, 9], [49, 9], [9, 30], [51, 30], [14, 48], [46, 48], [30, 57], [30, 7],
        ].map(([x, y]) => (
          <Star key={`${x}${y}`} x={x} y={y} r={2} n={6} c={or} />
        ))}
        <rect x="6" y="4" width="22" height="22" fill={argent} />
        <Ermine x={11} y={10} />
        <LionRampant x={18} y={16} s={0.9} c={sable} />
        <circle cx="40" cy="18" r="5" fill="none" stroke={or} strokeWidth="2.2" />
      </>
    ),
  },
  "St Peter's": {
    field: vert,
    colours: [vert, or],
    art: (
      <>
        <PerPale right={argent} />
        <Key x={18} y={30} a={40} c={or} />
        <Key x={18} y={30} a={-40} c={or} />
        <Castle x={18} y={44} c={argent} />
        <path d="M41 16 V50 M34 28 H48" stroke={gules} strokeWidth="3" />
        <Mitre x={41} y={29} c={or} />
        <Bird x={35} y={18} s={0.6} />
        <Bird x={48} y={18} s={0.6} />
        <Bordure c={or} w={3.5} />
      </>
    ),
  },
  Trinity: {
    field: or,
    colours: [azure, or],
    art: (
      <>
        <PerPale right={azure} />
        <Chevron y={30} left={azure} right={or} w={10} />
        <Head x={16} y={16} c={azure} />
        <Head x={44} y={16} c={or} />
        <Head x={30} y={50} c={azure} />
      </>
    ),
  },
  University: {
    field: azure,
    colours: [azure, or],
    art: (
      <>
        <Patonce x={30} y={31} s={2.4} c={or} />
        <Bird x={15} y={15} c={or} />
        <Bird x={45} y={15} c={or} />
        <Bird x={15} y={46} c={or} />
        <Bird x={45} y={46} c={or} />
      </>
    ),
  },
  Wadham: {
    field: gules,
    colours: [gules, argent],
    art: (
      <>
        <path d="M30 0 V64" stroke={sable} strokeWidth="0.8" />
        <path d="M4 34 L16 22 L28 34" stroke={argent} strokeWidth="3.5" fill="none" />
        <Rose x={10} y={14} r={3} c={argent} />
        <Rose x={22} y={14} r={3} c={argent} />
        <Rose x={16} y={46} r={3} c={argent} />
        <path d="M30 6 L60 52" stroke={or} strokeWidth="6" />
        <Escallop x={52} y={18} c={argent} />
        <Escallop x={38} y={46} c={argent} />
      </>
    ),
  },
  Wolfson: {
    field: gules,
    colours: [gules, or],
    art: (
      <>
        <PerPale right={or} />
        <Chevron y={30} left={or} right={gules} w={10} />
        <Rose x={16} y={16} r={4} c={or} />
        <Rose x={44} y={16} r={4} c={gules} />
        <Pear x={24} y={50} c={or} />
        <Pear x={36} y={50} c={gules} />
      </>
    ),
  },
  Worcester: {
    field: argent,
    colours: [gules, argent],
    art: (
      <>
        <Chevron y={22} c={gules} w={5} />
        <Chevron y={34} c={gules} w={5} />
        <Bird x={15} y={12} />
        <Bird x={30} y={10} />
        <Bird x={45} y={12} />
        <Bird x={20} y={44} />
        <Bird x={40} y={44} />
        <Bird x={30} y={55} />
      </>
    ),
  },
  "Wycliffe Hall": {
    field: gules,
    colours: [gules, azure],
    art: (
      <>
        <Book x={30} y={32} w={22} />
        <Chief c={azure} h={16} />
        <Crosslet x={16} y={8} c={argent} s={0.8} />
        <Crosslet x={30} y={8} c={argent} s={0.8} />
        <Crosslet x={44} y={8} c={argent} s={0.8} />
        <Star x={30} y={51} r={4} n={6} c={or} />
      </>
    ),
  },
};
