from sentence_transformers import SentenceTransformer, util


model = SentenceTransformer("all-MiniLM-L6-v2")


def _score_label(score: float) -> str:
    if score >= 75.0:
        return "Excellent"
    if score >= 50.0:
        return "Good"
    return "Fair"


def _to_positive_percent(similarity: float) -> float:
    # Cosine similarity is in [-1, 1]. Convert to [0, 100].
    return float(((similarity + 1.0) / 2.0) * 100.0)


def rank_freelancers(job, freelancers):
    job_skills = job.get("skills", "")
    job_description = job.get("description", "")

    job_skills_vec = model.encode(job_skills, convert_to_tensor=True)
    job_desc_vec = model.encode(job_description, convert_to_tensor=True)

    ranked = []
    for freelancer in freelancers:
        f_name = freelancer.get("name", "Unknown")
        f_skills = freelancer.get("skills", "")
        f_experience = freelancer.get("experience", "")
        f_reviews = freelancer.get("reviews", "")

        f_skills_vec = model.encode(f_skills, convert_to_tensor=True)
        f_exp_vec = model.encode(f_experience, convert_to_tensor=True)
        f_reviews_vec = model.encode(f_reviews, convert_to_tensor=True)

        skills_sim = float(util.cos_sim(job_skills_vec, f_skills_vec).item())
        exp_sim = float(util.cos_sim(job_desc_vec, f_exp_vec).item())
        reviews_sim = float(util.cos_sim(job_desc_vec, f_reviews_vec).item())

        weighted_similarity = (
            (skills_sim * 0.50)
            + (exp_sim * 0.30)
            + (reviews_sim * 0.20)
        )
        score = _to_positive_percent(weighted_similarity)
        score = round(score, 2)

        ranked.append(
            {
                "name": f_name,
                "score": score,
                "label": _score_label(score),
            }
        )

    ranked.sort(key=lambda x: x["score"], reverse=True)
    return ranked
