import { ImageResponse } from "next/og";
export const alt =
  "Importer depuis Alibaba en Afrique : 3 séances live, 10 000 FCFA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#0d1110",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        color: "#f5f6ee",
      }}
    >
      <div style={{ fontSize: 24, color: "#ffa351", marginBottom: 40 }}>
        IMPORT AFRIQUE · FORMATION PRATIQUE EN DIRECT
      </div>
      <div style={{ fontSize: 70, fontWeight: 700, lineHeight: 1.15 }}>
        Importez depuis Alibaba.
      </div>
      <div style={{ fontSize: 64, color: "#ffa351", marginTop: 12 }}>
        Développez votre business.
      </div>
      <div style={{ fontSize: 28, color: "#a9b4ad", marginTop: 44 }}>
        3 séances live · En français · 10 000 FCFA
      </div>
    </div>,
    size,
  );
}
