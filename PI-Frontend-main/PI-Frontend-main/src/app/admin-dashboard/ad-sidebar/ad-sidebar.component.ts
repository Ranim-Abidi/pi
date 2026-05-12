import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PartenaireService } from '../../services/partenaire.service';

@Component({
    selector: 'app-ad-sidebar',
    standalone: false,
    templateUrl: './ad-sidebar.component.html',
    styleUrls: ['./ad-sidebar.component.scss']
})
export class AdSidebarComponent {

    classApplied = false;
    isPopupOpen = false;
    partenaires: any[] = [];
    nomExiste = false;
    telephoneExiste = false;
    adminName: string = '';

    newPartenaire: any = {
        nom: '',
        email: '',
        telephone: '',
        type: 'ENTREPRISE',
        utilisateur: { id: 0 }
    };

    constructor(
    private router: Router,
    private partenaireService: PartenaireService
    ) {
    const stored = localStorage.getItem('userName') || 'Admin';
    this.adminName = stored.includes('@') ? stored.split('@')[0] : stored;
    }
    toggleClass() {
        this.classApplied = !this.classApplied;
    }

    getAdminIdFromToken(): number {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.id || payload.userId || 0;
            } catch (e) {
                return 0;
            }
        }
        return 0;
    }

    openCreatePartenaire() {
        const adminId = this.getAdminIdFromToken();
        this.newPartenaire.utilisateur.id = adminId;
        this.isPopupOpen = true;

        this.partenaireService.getAll().subscribe({
            next: (data: any[]) => this.partenaires = data,
            error: (err: any) => console.error(err)
        });
    }

    verifierNom() {
        this.nomExiste = this.partenaires.some(p =>
            p.nom?.toLowerCase().trim() === this.newPartenaire.nom?.toLowerCase().trim()
        );
    }

    verifierTelephone() {
        this.telephoneExiste = this.partenaires.some(p =>
            p.telephone?.trim() === this.newPartenaire.telephone?.trim()
        );
    }

    closeCreatePartenaire() {
        this.isPopupOpen = false;
        this.resetForm();
    }

    savePartenaire() {
        if (this.nomExiste || this.telephoneExiste) return;

        const adminId = this.getAdminIdFromToken();
        const partenaireToSend = {
            nom: this.newPartenaire.nom,
            email: this.newPartenaire.email,
            telephone: this.newPartenaire.telephone,
            type: this.newPartenaire.type,
            utilisateur: { id: adminId }
        };

        this.partenaireService.create(partenaireToSend).subscribe({
            next: () => {
                alert('✅ Partenaire créé !');
                this.closeCreatePartenaire();
                this.router.navigate(['/admin-dashboard/partenaires']);
            },
            error: (err: any) => {
                console.error('Erreur:', err);
                alert('❌ Erreur lors de la création');
            }
        });
    }

    resetForm() {
        this.newPartenaire = {
            nom: '',
            email: '',
            telephone: '',
            type: 'ENTREPRISE',
            utilisateur: { id: 0 }
        };
        this.nomExiste = false;
        this.telephoneExiste = false;
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        localStorage.removeItem('userRole');
        this.router.navigate(['/']);
    }
}