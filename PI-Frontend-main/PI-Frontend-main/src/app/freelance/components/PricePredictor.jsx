import React, { useState } from "react";

export default function PricePredictor() {
  const [skill, setSkill] = useState("React");
  const [experienceYears, setExperienceYears] = useState(3);
  const [rating, setRating] = useState(4.5);
  const [location, setLocation] = useState("Remote");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const predict = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill,
          experience_years: Number(experienceYears),
          rating: Number(rating),
          location,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to predict price.");
      }
      const data = await response.json();
      setResult(data);
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, background: "#fff" }}>
      <h3 style={{ marginTop: 0 }}>Price Predictor</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Skill" />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
        <input
          type="number"
          min="0"
          value={experienceYears}
          onChange={(e) => setExperienceYears(e.target.value)}
          placeholder="Experience years"
        />
        <input
          type="number"
          min="1"
          max="5"
          step="0.1"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          placeholder="Rating (1-5)"
        />
      </div>
      <button onClick={predict} disabled={loading} style={{ marginTop: 10 }}>
        {loading ? "Predicting..." : "Predict"}
      </button>
      {error ? <div style={{ color: "#b91c1c", marginTop: 10 }}>{error}</div> : null}
      {result ? (
        <div
          style={{
            marginTop: 12,
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 12,
            background: "#f8fafc",
            fontWeight: 600,
          }}
        >
          Low: ${result.min} / Mid: ${result.mid} / High: ${result.max}
        </div>
      ) : null}
    </div>
  );
}
