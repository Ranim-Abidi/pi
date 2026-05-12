import { Routes } from '@angular/router';
import { AdDashboardComponent } from './admin-dashboard/ad-dashboard/ad-dashboard.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { CandidatsListComponent } from './admin-dashboard/candidats-list/candidats-list.component';
import { CandidatureListComponent } from './admin-dashboard/candidature-list/candidature-list.component';
import { EntretienListComponent } from './admin-dashboard/entretien-list/entretien-list.component';
import { EvenementListAdminComponent } from './admin-dashboard/evenement-list-admin/evenement-list-admin.component';
import { FeedbackAdminComponent } from './admin-dashboard/feedback-admin/feedback-admin.component';
import { FormationCreateComponent } from './admin-dashboard/formation-create/formation-create.component';
import { FormationEditComponent } from './admin-dashboard/formation-edit/formation-edit.component';
import { FormationParticipantsComponent } from './admin-dashboard/formation-participants/formation-participants.component';
import { FormationsAdminComponent } from './admin-dashboard/formations-admin/formations-admin.component';
import { OffreListComponent } from './admin-dashboard/offre-list/offre-list.component';
import { ParcoursCreateComponent } from './admin-dashboard/parcours-create/parcours-create.component';
import { ParcoursFeedbackAdminComponent } from './admin-dashboard/parcours-feedback-admin/parcours-feedback-admin.component';
import { PartenaireListComponent } from './admin-dashboard/partenaire-list/partenaire-list.component';
import { CDashboardComponent } from './candidates-dashboard/c-dashboard/c-dashboard.component';
import { CandidatesDashboardComponent } from './candidates-dashboard/candidates-dashboard.component';
import { CdAlertJobsComponent } from './candidates-dashboard/cd-alert-jobs/cd-alert-jobs.component';
import { CdAppliedJobsComponent } from './candidates-dashboard/cd-applied-jobs/cd-applied-jobs.component';
import { CdBookmarksComponent } from './candidates-dashboard/cd-bookmarks/cd-bookmarks.component';
import { CdChangePasswordComponent } from './candidates-dashboard/cd-change-password/cd-change-password.component';
import { CdDocumentsComponent } from './candidates-dashboard/cd-documents/cd-documents.component';
import { CdMessageComponent } from './candidates-dashboard/cd-message/cd-message.component';
import { CdNewsComponent } from './candidates-dashboard/cd-news/cd-news.component';
import { CdProfileComponent } from './candidates-dashboard/cd-profile/cd-profile.component';
import { EvenementCandidatComponent } from './candidates-dashboard/evenement-candidat/evenement-candidat.component';
import { ChatEvenementComponent } from './candidates-dashboard/evenement-candidat/evenement-chat/evenement-chat.component';
import { MaCalendarComponent } from './candidates-dashboard/evenement-candidat/ma-calendar/ma-calendar.component';
import { MesParticipationsComponent } from './candidates-dashboard/evenement-candidat/mes-participations/mes-participations.component';
import { MesFormationsComponent } from './candidates-dashboard/mes-formations/mes-formations.component';
import { OffreCandidatComponent } from './candidates-dashboard/offre-candidat/offre-candidat.component';
import { PartenaireCandidatComponent } from './candidates-dashboard/partenaire-candidat/partenaire-candidat.component';
import { NotFoundComponent } from './common/not-found/not-found.component';
import { EDashboardComponent } from './employers-dashboard/e-dashboard/e-dashboard.component';
import { EdAllApplicantsComponent } from './employers-dashboard/ed-all-applicants/ed-all-applicants.component';
import { EdChangePasswordComponent } from './employers-dashboard/ed-change-password/ed-change-password.component';
import { EdCompanyProfileComponent } from './employers-dashboard/ed-company-profile/ed-company-profile.component';
import { EdManageJobsComponent } from './employers-dashboard/ed-manage-jobs/ed-manage-jobs.component';
import { EdMessageComponent } from './employers-dashboard/ed-message/ed-message.component';
import { EdPostANewJobComponent } from './employers-dashboard/ed-post-a-new-job/ed-post-a-new-job.component';
import { EdResumesComponent } from './employers-dashboard/ed-resumes/ed-resumes.component';
import { EmployersDashboardComponent } from './employers-dashboard/employers-dashboard.component';
import { EvenementCalendrierComponent } from './evenement-dashboard/evenement-calendar/evenement-calendar.component';
import { EvenementChatComponent } from './evenement-dashboard/evenement-chat/evenement-chat.component';
import { EvenementDashboardComponent } from './evenement-dashboard/evenement-dashboard.component';
import { EvenementDemandesComponent } from './evenement-dashboard/evenement-demandes/evenement-demandes.component';
import { EvenementDetailComponent } from './evenement-dashboard/evenement-detail/evenement-detail.component';
import { EvenementEditComponent } from './evenement-dashboard/evenement-edit/evenement-edit.component';
import { EvenementFeedbacksComponent } from './evenement-dashboard/evenement-feedback/evenement-feedbacks.component';
import { EvenementFormComponent } from './evenement-dashboard/evenement-form/evenement-form';
import { EvenementListComponent } from './evenement-dashboard/evenement-list/evenement-list.component';
import { EvenementTemplateComponent } from './evenement-dashboard/evenement-template/evenement-template.component';
import { VerifyCertificatComponent } from './formations/verify-certificat/verify-certificat.component';
import { recruteurChildGuard, recruteurGuard, adminGuard, adminChildGuard } from './guards/recruteur.guard';
import { BlogDetailsPageComponent } from './pages/blog-details-page/blog-details-page.component';
import { BlogPageComponent } from './pages/blog-page/blog-page.component';
import { CandidateEntretiensPageComponent } from './pages/candidate-entretiens-page/candidate-entretiens-page.component';
import { CandidatesPageComponent } from './pages/candidates-page/candidates-page.component';
import { CategoriesPageComponent } from './pages/categories-page/categories-page.component';
import { ContactPageComponent } from './pages/contact-page/contact-page.component';
import { EmployerDetailsPageComponent } from './pages/employer-details-page/employer-details-page.component';
import { FaqPageComponent } from './pages/faq-page/faq-page.component';
import { HomeDemoOneComponent } from './pages/home-demo-one/home-demo-one.component';
import { HomeDemoTwoComponent } from './pages/home-demo-two/home-demo-two.component';
import { JobDetailsPageComponent } from './pages/job-details-page/job-details-page.component';
import { JobsGridPageComponent } from './pages/jobs-grid-page/jobs-grid-page.component';
import { PrivacyPolicyPageComponent } from './pages/privacy-policy-page/privacy-policy-page.component';
import { PublicTestPassPageComponent } from './pages/public-test-pass-page/public-test-pass-page.component';
import { TermsConditionsPageComponent } from './pages/terms-conditions-page/terms-conditions-page.component';
import { VideoInterviewRoomPageComponent } from './pages/video-interview-room-page/video-interview-room-page.component';
import { OffreRechercheAvanceeComponent } from './recruiter-dashboard/offre-recherche-avancee/offre-recherche-avancee.component';
import { OffreStatistiquesComponent } from './recruiter-dashboard/offre-statistiques/offre-statistiques.component';
import { RdAddQuestions } from './recruiter-dashboard/rd-add-questions/rd-add-questions';
import { RdApplicantsComponent } from './recruiter-dashboard/rd-applicants/rd-applicants.component';
import { RdCandidaturesListComponent } from './recruiter-dashboard/rd-candidatures-list/rd-candidatures-list.component';
import { RdChangePasswordComponent } from './recruiter-dashboard/rd-change-password/rd-change-password.component';
import { RdDashboardComponent } from './recruiter-dashboard/rd-dashboard/rd-dashboard.component';
import { RdInterviews } from './recruiter-dashboard/rd-interviews/rd-interviews';
import { RdManageJobsComponent } from './recruiter-dashboard/rd-manage-jobs/rd-manage-jobs.component';
import { RdMessagesComponent } from './recruiter-dashboard/rd-messages/rd-messages.component';
import { RdPostJobComponent } from './recruiter-dashboard/rd-post-job/rd-post-job.component';
import { RdProfileComponent } from './recruiter-dashboard/rd-profile/rd-profile.component';
import { RecruiterDashboardComponent } from './recruiter-dashboard/recruiter-dashboard.component';

export const routes: Routes = [
    { path: '', component: HomeDemoOneComponent },
    { path: 'index-1', component: HomeDemoOneComponent },
    { path: 'login', component: HomeDemoOneComponent },
    { path: 'verify-certificat/:code', component: VerifyCertificatComponent },
    { path: 'index-2', component: HomeDemoTwoComponent },
    { path: 'job-details/:id', component: JobDetailsPageComponent },
    { path: 'job-details', component: JobDetailsPageComponent },
    { path: 'jobs-grid', component: JobsGridPageComponent },
    { path: 'categories', component: CategoriesPageComponent },
    { path: 'candidates', component: CandidatesPageComponent },
    { path: 'employer-details', component: EmployerDetailsPageComponent },
    { path: 'faq', component: FaqPageComponent },
    { path: 'privacy-policy', component: PrivacyPolicyPageComponent },
    { path: 'terms-conditions', component: TermsConditionsPageComponent },
    { path: 'blog', component: BlogPageComponent },
    { path: 'blog-details', component: BlogDetailsPageComponent },
    { path: 'contact', component: ContactPageComponent },
    { path: 'partenaires', component: PartenaireListComponent },
    { path: 'partenaires/:id/offres', component: OffreListComponent },
    { path: 'candidate-entretiens', component: CandidateEntretiensPageComponent },
    { path: 'entretiens/video/:id', component: VideoInterviewRoomPageComponent },
    { path: 'entretiens/test/:id', component: PublicTestPassPageComponent },

    {
        path: 'dashboard',
        component: EmployersDashboardComponent,
        children: [
            { path: '', component: EDashboardComponent },
            { path: 'company-profile', component: EdCompanyProfileComponent },
            { path: 'post-a-new-job', component: EdPostANewJobComponent },
            { path: 'manage-jobs', component: EdManageJobsComponent },
            { path: 'all-applicants', component: EdAllApplicantsComponent },
            { path: 'resumes', component: EdResumesComponent },
            { path: 'message', component: EdMessageComponent },
            { path: 'change-password', component: EdChangePasswordComponent },
        ]
    },

    {
        path: 'candidates-dashboard',
        component: CandidatesDashboardComponent,
        children: [
            { path: '', component: CDashboardComponent },
            { path: 'my-profile', component: CdProfileComponent },
            { path: 'documents', component: CdDocumentsComponent },
            { path: 'bookmarks', component: CdBookmarksComponent },
            { path: 'applied-jobs', component: CdAppliedJobsComponent },
            { path: 'alert-jobs', component: CdAlertJobsComponent },
            { path: 'news', component: CdNewsComponent },
            { path: 'message', component: CdMessageComponent },
            { path: 'change-password', component: CdChangePasswordComponent },
            { path: 'mes-formations', component: MesFormationsComponent },
            { path: 'partenaires', component: PartenaireCandidatComponent },
            { path: 'partenaires/:id/offres', component: OffreCandidatComponent },
            { path: 'evenements', component: EvenementCandidatComponent },
            { path: 'chat/:evenementId', component: ChatEvenementComponent },
            { path: 'ma-calendar', component: MaCalendarComponent },
            { path: 'mes-participations', component: MesParticipationsComponent },
        ]
    },

    {
        path: 'recruiter-dashboard',
        component: RecruiterDashboardComponent,
        canActivate: [recruteurGuard],
        canActivateChild: [recruteurChildGuard],
        children: [
            { path: '', component: RdDashboardComponent },
            { path: 'post-job', component: RdPostJobComponent },
            { path: 'manage-jobs', component: RdManageJobsComponent },
            { path: 'applicants', component: RdApplicantsComponent },
            { path: 'messages', component: RdMessagesComponent },
            { path: 'profile', component: RdProfileComponent },
            { path: 'change-password', component: RdChangePasswordComponent },
            { path: 'interviews', component: RdInterviews },
            { path: 'interviews/add-questions/:id', component: RdAddQuestions },
            { path: 'candidatures', component: RdCandidaturesListComponent },
            { path: 'offre-statistiques', component: OffreStatistiquesComponent },
            { path: 'offre-recherche-avancee', component: OffreRechercheAvanceeComponent },
        ]
    },

    {
        path: 'formations',
        loadChildren: () =>
            import('./formations/formations.module').then(m => m.FormationsModule)
    },

    {
        path: 'freelance',
        loadChildren: () =>
            import('./freelance/freelance.module').then(m => m.FreelanceModule)
    },

    {
        path: 'evenement-dashboard',
        component: EvenementDashboardComponent,
        children: [
            { path: '', component: EvenementTemplateComponent },
            { path: 'ajouter', component: EvenementFormComponent },
            { path: 'liste', component: EvenementListComponent },
            { path: 'modifier/:id', component: EvenementEditComponent },
            { path: 'detail/:id', component: EvenementDetailComponent },
            { path: 'demandes', component: EvenementDemandesComponent },
            { path: 'calendrier', component: EvenementCalendrierComponent },
            { path: 'feedbacks', component: EvenementFeedbacksComponent },
            { path: 'chats', component: EvenementChatComponent },
            { path: 'chat/:evenementId', component: ChatEvenementComponent },
        ]
    },

    {
        path: 'admin-dashboard',
        component: AdminDashboardComponent,
        canActivate: [adminGuard],
        canActivateChild: [adminChildGuard],
        children: [
            { path: '', component: AdDashboardComponent },
            { path: 'partenaires', component: PartenaireListComponent },
            { path: 'partenaires/:id/offres', component: OffreListComponent },
            { path: 'entrietiens', redirectTo: 'entretiens', pathMatch: 'full' },
            { path: 'entretiens', component: EntretienListComponent },
            { path: 'candidatures', component: CandidatureListComponent },
            { path: 'evenements', component: EvenementListAdminComponent },
            { path: 'candidats', component: CandidatsListComponent },
            { path: 'formations', component: FormationsAdminComponent },
            { path: 'formations/create', component: FormationCreateComponent },
            { path: 'formations/edit/:id', component: FormationEditComponent },
            { path: 'formations/:id/participants', component: FormationParticipantsComponent },
            { path: 'formations/:id/feedbacks', component: FeedbackAdminComponent },
            { path: 'formations/:id/macro-feedbacks', component: ParcoursFeedbackAdminComponent },
            { path: 'parcours/create', component: ParcoursCreateComponent },
            { path: 'parcours/:id/edit', component: ParcoursCreateComponent },
            { path: 'parcours/:id/macro-feedbacks', component: ParcoursFeedbackAdminComponent },
        ]
    },

    { path: '**', component: NotFoundComponent },
];