import random
from datetime import datetime, timedelta

import mysql.connector as mc


def main(n: int = 30) -> None:
    conn = mc.connect(
        host="127.0.0.1",
        port=3306,
        user="root",
        password="",
        database="jobmatch_db",
    )
    try:
        cur = conn.cursor()

        roles = [
            ("Developpeur Full Stack", ["Angular", "Spring Boot", "SQL"]),
            ("Developpeur Frontend", ["Angular", "TypeScript", "CSS"]),
            ("Developpeur Backend", ["Java", "Spring", "MySQL"]),
            ("Data Scientist", ["Python", "Pandas", "ML"]),
            ("DevOps Engineer", ["Docker", "Kubernetes", "CI/CD"]),
            ("Mobile Developer", ["Flutter", "Dart", "Firebase"]),
            ("QA Engineer", ["Testing", "Selenium", "Jira"]),
            ("UI/UX Designer", ["Figma", "UX", "Design System"]),
        ]

        companies = ["Matchy Khedma", "TechNova", "DataWave", "Cloudify", "FinEdge", "HealthSoft"]
        locations = ["Tunis", "Ariana", "Ben Arous", "Sousse", "Sfax"]
        contracts = ["CDI", "CDD", "STAGE", "FREELANCE"]

        bands = {
            "STAGE": (600, 1200),
            "CDD": (1500, 2800),
            "CDI": (1800, 4200),
            "FREELANCE": (2200, 5000),
        }

        now = datetime.now()
        rows_inserted = 0

        for _ in range(n):
            titre, skills = random.choice(roles)
            entreprise = random.choice(companies)
            location = random.choice(locations)
            type_contrat = random.choice(contracts)
            smin, smax = bands[type_contrat]
            low = random.randrange(smin, smax - 200, 50)
            high = random.randrange(low + 200, smax, 50)
            salary = f"{low}-{high} TND"

            desc = (
                f"Nous recrutons un(e) {titre} pour travailler sur des projets. "
                f"Competences: {', '.join(skills)}. Localisation: {location}."
            )
            date_pub = now - timedelta(days=random.randint(0, 60))
            date_lim = now + timedelta(days=random.randint(10, 90))
            statut = "ACTIVE"

            cur.execute(
                """
                INSERT INTO offres_emploi
                  (date_publication, date_limite, description, entreprise, image, location, salary, statut, titre, type_contrat, recruteur_id)
                VALUES
                  (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (date_pub, date_lim, desc, entreprise, None, location, salary, statut, titre, type_contrat, None),
            )
            oid = cur.lastrowid

            for sk in skills[:3]:
                cur.execute(
                    "INSERT INTO offre_competences (offre_id, competence) VALUES (%s,%s)",
                    (oid, sk),
                )

            rows_inserted += 1

        conn.commit()

        cur.execute("SELECT COUNT(*) FROM offres_emploi WHERE salary IS NOT NULL AND salary <> ''")
        offers_with_salary = cur.fetchone()[0]

        print("inserted_offers", rows_inserted)
        print("offers_with_salary", offers_with_salary)
    finally:
        conn.close()


if __name__ == "__main__":
    import sys

    n = 30
    if len(sys.argv) >= 2:
        try:
            n = int(sys.argv[1])
        except Exception:
            n = 30

    main(n)

