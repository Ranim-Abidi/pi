import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { formationsRoutes } from './formations.routes';
import { SharedModule } from '../shared/shared.module';

import { FormationsListComponent } from './formations-list/formations-list.component';
import { FormationDetailComponent } from './formation-detail/formation-detail.component';
import { FeedbackCandidatComponent } from './feedback-candidat/feedback-candidat.component';
import { FormationPlayerComponent } from './formation-player/formation-player.component';
import { SafePipe } from './pipes/safe.pipe';
import { FormationEcriteComponent } from './formation-ecrite/formation-ecrite.component';
import { FormationVideoComponent } from './formation-video/formation-video.component';
import { ChatbotFormationComponent } from './chatbot-formation/chatbot-formation.component';
import { ParcoursDetailComponent } from './parcours-detail/parcours-detail.component';
import { QuizNiveauComponent } from './quiz-niveau/quiz-niveau.component';
import { MacroFeedbackComponent } from './macro-feedback/macro-feedback.component';


@NgModule({
  declarations: [
    FormationsListComponent,
    FormationDetailComponent,
    FeedbackCandidatComponent,
    FormationPlayerComponent,
    SafePipe,
    FormationEcriteComponent,
    FormationVideoComponent,
    ChatbotFormationComponent,
    ParcoursDetailComponent,
    QuizNiveauComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    MacroFeedbackComponent,
    RouterModule.forChild(formationsRoutes)
  ]
})
export class FormationsModule {}