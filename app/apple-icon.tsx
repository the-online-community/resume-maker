import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "white",
          borderRadius: 32,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          fill="none"
          width="140"
          height="140"
        >
          <rect
            x="4"
            y="3"
            width="20"
            height="26"
            rx="2"
            stroke="black"
            strokeWidth="2.5"
            fill="white"
          />
          <line x1="9" y1="10" x2="19" y2="10" stroke="black" strokeWidth="2" strokeLinecap="round" />
          <line x1="9" y1="15" x2="19" y2="15" stroke="black" strokeWidth="2" strokeLinecap="round" />
          <line x1="9" y1="20" x2="15" y2="20" stroke="black" strokeWidth="2" strokeLinecap="round" />
          <path d="M26 22l-2 4-2-4 2-4z" fill="black" />
          <path d="M22 26l4-2-4-2 4 2z" fill="black" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
