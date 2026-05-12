import React, { useState } from "react";

export default function ProposalGenerator() {
  const [jobDescription, setJobDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [experienceYears, setExperienceYears] = useState(3);
  const [timelineDays, setTimelineDays] = useState(7);
  const [proposal, setProposal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    setProposal("");
    try {
      const response = await fetch("/api/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_description: jobDescription,
          skills,
          experience_years: Number(experienceYears),
          timeline_days: Number(timelineDays),
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to generate proposal.");
      }
      const data = await response.json();
      setProposal(data.proposal || "");
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const copyProposal = async () => {
    if (!proposal) return;
    await navigator.clipboard.writeText(proposal);
  };

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, background: "#fff" }}>
      <h3 style={{ marginTop: 0 }}>AI Proposal Generator</h3>
      <textarea
        placeholder="Job description"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        rows={5}
        style={{ width: "100%", marginBottom: 10 }}
      />
      <input
        placeholder="Skills (comma separated)"
        value={skills}
        onChange={(e) => setSkills(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
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
          value={timelineDays}
          onChange={(e) => setTimelineDays(e.target.value)}
          placeholder="Timeline days"
        />
      </div>
      <button onClick={generate} disabled={loading}>
        {loading ? "Generating..." : "Generate"}
      </button>
      {error ? <div style={{ color: "#b91c1c", marginTop: 10 }}>{error}</div> : null}
      <div style={{ marginTop: 12 }}>
        <textarea readOnly rows={8} value={proposal} style={{ width: "100%" }} />
        <button onClick={copyProposal} disabled={!proposal} style={{ marginTop: 8 }}>
          Copy
        </button>
      </div>
    </div>
  );
}
