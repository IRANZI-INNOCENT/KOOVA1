import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#176B4D",
          color: "#F4B183",
          fontSize: 108,
          fontWeight: 700,
          fontFamily:
            "Segoe UI, system-ui, -apple-system, sans-serif",
        }}
      >
        K
      </div>
    ),
    {
      ...size,
    },
  );
}
