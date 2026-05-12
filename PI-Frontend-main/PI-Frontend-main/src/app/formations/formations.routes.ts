import { Routes } from '@angular/router';
import { FormationsListComponent } from './formations-list/formations-list.component';
import { FormationDetailComponent } from './formation-detail/formation-detail.component';
import { FormationEcriteComponent } from './formation-ecrite/formation-ecrite.component';
import { FormationVideoComponent } from './formation-video/formation-video.component';
import { ParcoursDetailComponent } from './parcours-detail/parcours-detail.component';
import { QuizNiveauComponent } from './quiz-niveau/quiz-niveau.component';

export const formationsRoutes: Routes = [
  { path: '', component: FormationsListComponent },

  // Parcours multi-niveaux (AVANT les routes :id)
  { path: 'parcours/:id',                       component: ParcoursDetailComponent },
  { path: 'parcours/:parcoursId/quiz/:niveau',  component: QuizNiveauComponent },
  { path: 'parcours/:id/feedback',              loadComponent: () => import('./macro-feedback/macro-feedback.component').then(m => m.MacroFeedbackComponent) },

  { path: ':id/video',  component: FormationVideoComponent  },
  { path: ':id/ecrite', component: FormationEcriteComponent },

  { path: ':id', component: FormationDetailComponent },
];