import json
from typing import Generator

import requests


OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "mistral"
SYSTEM_PROMPT = (
    "You are a senior freelancer writing a job proposal. Max 200 words, "
    "3 paragraphs. Paragraph 1: show you understand the client problem. "
    "Paragraph 2: your approach and matching skills. Paragraph 3: timeline, "
    "availability, confident CTA. Tone: professional but human, no buzzwords."
)


def _build_prompt(job_description, freelancer_skills, experience_years, timeline_days):
    return (
        f"System: {SYSTEM_PROMPT}\n\n"
        f"Job description:\n{job_description}\n\n"
        f"My skills: {freelancer_skills}\n"
        f"My experience: {experience_years} years\n"
        f"Estimated timeline: {timeline_days} days\n\n"
        "Write the proposal now."
    )


def generate_proposal(job_description, freelancer_skills, experience_years, timeline_days) -> str:
    prompt = _build_prompt(job_description, freelancer_skills, experience_years, timeline_days)
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
    }
    response = requests.post(OLLAMA_URL, json=payload, timeout=180)
    response.raise_for_status()
    data = response.json()
    proposal = str(data.get("response", "")).strip()

    if len(proposal.split()) < 60:
        raise ValueError("Generated proposal is too short (< 60 words).")
    return proposal


def stream_proposal(job_description, skills, experience, timeline) -> Generator[str, None, None]:
    prompt = _build_prompt(job_description, skills, experience, timeline)
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": True,
    }

    with requests.post(OLLAMA_URL, json=payload, stream=True, timeout=240) as response:
        response.raise_for_status()
        for line in response.iter_lines(decode_unicode=True):
            if not line:
                continue
            try:
                chunk = json.loads(line)
            except json.JSONDecodeError:
                continue

            token = chunk.get("response", "")
            if token:
                yield token

            if chunk.get("done"):
                break
