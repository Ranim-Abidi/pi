import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PartenaireService } from '../../services/partenaire.service';
import { OffrePartenaireService } from '../../services/offre-partenaire.service';

@Component({
    selector: 'app-partenaire-list',
    standalone: false,
    templateUrl: './partenaire-list.component.html',
    styleUrls: ['./partenaire-list.component.scss']
})
export class PartenaireListComponent implements OnInit {

    partenaires: any[] = [];
    searchTerm: string = '';

    isModifPopupOpen = false;
    partenaireModif: any = {
        id: 0,
        nom: '',
        email: '',
        telephone: '',
        type: 'ENTREPRISE'
    };

    isOffrePopupOpen = false;
    newOffre: any = {
        titre: '',
        description: '',
        type: 'EMPLOI',
        partenaire: { id: 0 }
    };
    partenaireSelectionne: any = null;

    constructor(
        private partenaireService: PartenaireService,
        private offreService: OffrePartenaireService,
        private router: Router
    ) {}

    ngOnInit() {
        this.loadPartenaires();
    }

    loadPartenaires() {
        this.partenaireService.getAll().subscribe({
            next: (data: any[]) => this.partenaires = data,
            error: (err: any) => console.error(err)
        });
    }

    get filteredPartenaires(): any[] {
        if (!this.searchTerm.trim()) return this.partenaires;
        const term = this.searchTerm.toLowerCase().trim();
        return this.partenaires.filter(p =>
            p.nom?.toLowerCase().includes(term) ||
            p.email?.toLowerCase().includes(term) ||
            p.telephone?.toLowerCase().includes(term) ||
            p.type?.toLowerCase().includes(term)
        );
    }

    modifier(p: any) {
        this.partenaireModif = {
            id: p.id,
            nom: p.nom,
            email: p.email,
            telephone: p.telephone,
            type: p.type
        };
        this.isModifPopupOpen = true;
    }

    closeModifPopup() {
        this.isModifPopupOpen = false;
    }

    saveModif() {
        this.partenaireService.update(
            this.partenaireModif.id,
            this.partenaireModif
        ).subscribe({
            next: () => {
                alert('✅ Partenaire modifié !');
                this.closeModifPopup();
                this.loadPartenaires();
            },
            error: (err: any) => {
                console.error(err);
                alert('❌ Erreur lors de la modification');
            }
        });
    }

    supprimer(id: number) {
        if (confirm('Voulez-vous supprimer ce partenaire ?')) {
            this.partenaireService.delete(id).subscribe({
                next: () => {
                    alert('✅ Partenaire supprimé !');
                    this.loadPartenaires();
                },
                error: (err: any) => {
                    console.error(err);
                    alert('❌ Erreur : ' + err.status);
                }
            });
        }
    }

    ajouterOffre(p: any) {
        this.partenaireSelectionne = p;
        this.newOffre = {
            titre: '',
            description: '',
            type: 'EMPLOI',
            partenaire: { id: p.id }
        };
        this.isOffrePopupOpen = true;
    }

    closeOffrePopup() {
        this.isOffrePopupOpen = false;
        this.partenaireSelectionne = null;
    }

    saveOffre() {
        this.offreService.create(this.newOffre).subscribe({
            next: () => {
                alert('✅ Offre créée avec succès !');
                this.closeOffrePopup();
            },
            error: (err: any) => {
                console.error(err);
                alert('❌ Erreur lors de la création');
            }
        });
    }

    voirOffres(id: number) {
        this.router.navigate(['/admin-dashboard/partenaires', id, 'offres']);
    }
}