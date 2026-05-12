import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { EvenementService } from '../../services/evenement-service';
import { jwtDecode } from 'jwt-decode';

@Component({
    selector: 'app-evenement-edit',
    standalone: false,
    templateUrl: './evenement-edit.component.html',
    styleUrls: ['./evenement-edit.component.scss']
})
export class EvenementEditComponent implements OnInit {
    evenement: any = {};
    success = false;
    error = false;
    id!: number;
    organisateurId!: number;

    constructor(
        private service: EvenementService,
        private route: ActivatedRoute,
        private router: Router
    ) {}

    ngOnInit() {
        const token = localStorage.getItem('token');
        if (token) {
            const decoded: any = jwtDecode(token);
            this.organisateurId = decoded?.id;
        }

        this.id = Number(this.route.snapshot.paramMap.get('id'));
        this.service.getById(this.id).subscribe({
            next: (data) => {
                this.evenement = data;
                // ⚠️ datetime-local attend "yyyy-MM-ddTHH:mm", on coupe les secondes
                if (data.dateHeure) {
                    this.evenement.dateHeure = data.dateHeure.substring(0, 16); // ← nouveau
                }
            },
            error: (err) => console.error('Erreur chargement:', err)
        });
    }

    modifier(form: NgForm) {
        if (form.valid) {
            // On construit un payload propre, sans l'objet organisateur complet qui peut causer des 500
            const payload: any = {
                titre: this.evenement.titre,
                dateHeure: this.evenement.dateHeure.includes(':') && this.evenement.dateHeure.length === 16 
                           ? this.evenement.dateHeure + ':00' 
                           : this.evenement.dateHeure,
                lieu: this.evenement.lieu,
                type: this.evenement.type,
                organisateurId: this.evenement.organisateurId || this.evenement.organisateur?.id || this.organisateurId
            };

            console.log('Sending PUT payload:', payload);

            this.service.modifier(this.id, payload).subscribe({
                next: (res) => {
                    console.log('Événement modifié ✅', res);
                    this.success = true;
                    this.error = false;
                    setTimeout(() => {
                        this.router.navigate(['/evenement-dashboard/liste']);
                    }, 2000);
                },
                error: (err) => {
                    console.error('Erreur modification ❌', err);
                    this.error = true;
                    this.success = false;
                }
            });
        }
    }

    annuler() {
        this.router.navigate(['/evenement-dashboard/liste']);
    }
}