import React from "react";

const badgeStyles = {
  Excellent: { background: "#dcfce7", color: "#166534" },
  Good: { background: "#fef3c7", color: "#92400e" },
  Fair: { background: "#e5e7eb", color: "#374151" },
};

export default function MatchScore({ score, label, name }) {
  const safeScore = Math.max(0, Math.min(100, Number(score || 0)));
  const tone = badgeStyles[label] || badgeStyles.Fair;

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 14,
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <strong>{name}</strong>
        <span style={{ ...tone, borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>
          {label}
        </span>
      </div>
      <div style={{ height: 10, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            width: `${safeScore}%`,
            height: "100%",
            background: "#2563eb",
            transition: "width 0.25s ease",
          }}
        />
      </div>
      <div style={{ marginTop: 8, color: "#475569", fontSize: 13 }}>{safeScore.toFixed(2)}%</div>
    </div>
  );
}
