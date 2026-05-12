import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../api.service';

@Component({ selector: 'app-rd-applicants', standalone: false, templateUrl: './rd-applicants.component.html', styleUrls: ['./rd-applicants.component.scss'] })
export class RdApplicantsComponent implements OnInit {
	loading = false;
	errorMessage = '';
	offres: any[] = [];
	candidatures: any[] = [];
	selectedOffreId = 'ALL';

	constructor(private apiService: ApiService) { }

	ngOnInit(): void {
		this.chargerDonnees();
	}

	chargerDonnees(): void {
		this.loading = true;
		this.errorMessage = '';

		this.apiService.getMesOffresEmploi().subscribe({
			next: (offres) => {
				this.offres = offres || [];
				const ids = new Set(this.offres.map((offre: any) => offre.id));

				this.apiService.getAllCandidaturesForRecruteur().subscribe({
					next: (allCandidatures) => {
						this.candidatures = (allCandidatures || []).filter((c: any) => c?.offreId && ids.has(c.offreId));
						this.loading = false;
					},
					error: (err) => {
						console.error(err);
						this.errorMessage = 'Impossible de charger les candidatures.';
						this.loading = false;
					}
				});
			},
			error: (err) => {
				console.error(err);
				this.errorMessage = 'Impossible de charger vos offres.';
				this.loading = false;
			}
		});
	}

	get candidaturesFiltrees(): any[] {
		if (this.selectedOffreId === 'ALL') {
			return this.candidatures;
		}
		const offreId = Number(this.selectedOffreId);
		return this.candidatures.filter((c: any) => c.offreId === offreId);
	}

	getTitreOffre(offreId: number): string {
		const offre = this.offres.find((item: any) => item.id === offreId);
		return offre?.titre || '-';
	}

	formatDate(value: any): string {
		if (!value) {
			return '-';
		}
		return new Date(value).toLocaleDateString('fr-FR');
	}
}
