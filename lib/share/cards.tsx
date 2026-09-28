/* Share-card layouts for next/og (Satori): flexbox and inline styles only. */
import type { ReactNode } from "react";
import { excerpt, formatShareDate } from "./format";

export const CARD_SIZE = { width: 1080, height: 1920 } as const;

const C = {
  sand: "#f2ecdd",
  paper: "#ffffff",
  ink: "#1b1a12",
  muted: "#565039",
  accent: "#b8524c",
  wash: "#edbfba",
};
const DISPLAY = "Schoolbell";
const BODY = "Space Grotesk";

const FORMAL_TYPE_LABEL: Record<string, string> = {
  social: "Social",
  matchmaking: "Matchmaking",
  networking: "Networking",
};

function Frame({
  footer,
  children,
}: {
  footer: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: C.sand,
        color: C.ink,
        fontFamily: BODY,
        // Instagram overlays ~250px at the top and bottom of a story.
        padding: "220px 80px 230px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          fontFamily: DISPLAY,
          fontSize: 64,
          letterSpacing: 8,
          marginBottom: 40,
        }}
      >
        OXFORMALS
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: C.paper,
            border: `5px solid ${C.ink}`,
            borderRadius: 56,
            padding: "60px 64px",
            boxShadow: `14px 14px 0 ${C.ink}`,
          }}
        >
          {children}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 48 }}>
        <div
          style={{
            display: "flex",
            backgroundColor: C.accent,
            color: "#ffffff",
            borderRadius: 999,
            padding: "26px 56px",
            fontSize: 44,
            fontWeight: 700,
          }}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignSelf: "flex-start",
        backgroundColor: C.wash,
        color: C.ink,
        borderRadius: 999,
        padding: "12px 30px",
        fontSize: 34,
        fontWeight: 700,
      }}
    >
      {children}
    </div>
  );
}

export function ListingCard(props: {
  college: string;
  dateTime: string;
  seatsAvailable: number;
  formalType: string;
  hostFirstName: string;
}) {
  const seats =
    props.seatsAvailable <= 0
      ? "Full"
      : `${props.seatsAvailable} seat${props.seatsAvailable === 1 ? "" : "s"} left`;
  return (
    <Frame footer="Swap a seat on oxformals.com">
      <Pill>{FORMAL_TYPE_LABEL[props.formalType] ?? "Social"} formal</Pill>
      <div
        style={{
          display: "flex",
          fontFamily: DISPLAY,
          fontSize: props.college.length > 14 ? 120 : 150,
          lineHeight: 1,
          marginTop: 40,
        }}
      >
        {props.college}
      </div>
      <div style={{ display: "flex", fontSize: 56, marginTop: 36 }}>
        {formatShareDate(props.dateTime)}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 56,
          fontWeight: 700,
          color: C.accent,
          marginTop: 20,
        }}
      >
        {seats}
      </div>
      <div style={{ display: "flex", fontSize: 40, color: C.muted, marginTop: 48 }}>
        Hosted by {props.hostFirstName}
      </div>
    </Frame>
  );
}

const STAR_PATH =
  "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";

function Stars({ value }: { value: number }) {
  const size = 84;
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <div
            key={i}
            style={{ display: "flex", position: "relative", width: size, height: size }}
          >
            <svg width={size} height={size} viewBox="0 0 24 24">
              <path d={STAR_PATH} fill={C.wash} />
            </svg>
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: 0,
                left: 0,
                width: size * fill,
                height: size,
                overflow: "hidden",
              }}
            >
              <svg width={size} height={size} viewBox="0 0 24 24">
                <path d={STAR_PATH} fill={C.accent} />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ReviewCard(props: {
  college: string;
  overall: number;
  comment: string | null;
  authorFirstName: string | null;
  photoUrl: string | null;
}) {
  return (
    <Frame footer="Rated on oxformals.com">
      {props.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={props.photoUrl}
          alt=""
          width={822}
          height={440}
          style={{
            width: 822,
            height: 440,
            objectFit: "cover",
            borderRadius: 32,
            border: `4px solid ${C.ink}`,
            marginBottom: 40,
          }}
        />
      ) : null}
      <div
        style={{
          display: "flex",
          fontFamily: DISPLAY,
          fontSize: props.college.length > 14 ? 92 : 112,
          lineHeight: 1,
        }}
      >
        {props.college}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 32 }}>
        <Stars value={props.overall} />
        <div style={{ display: "flex", fontSize: 52, fontWeight: 700 }}>
          {props.overall.toFixed(1)}
        </div>
      </div>
      {props.comment ? (
        <div
          style={{
            display: "flex",
            fontSize: 42,
            lineHeight: 1.35,
            marginTop: 32,
          }}
        >
          “{excerpt(props.comment, props.photoUrl ? 90 : 200)}”
        </div>
      ) : null}
      <div style={{ display: "flex", fontSize: 40, color: C.muted, marginTop: 36 }}>
        — {props.authorFirstName ?? "Anonymous"}
      </div>
    </Frame>
  );
}
