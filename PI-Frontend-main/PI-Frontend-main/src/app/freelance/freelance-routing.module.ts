import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FreelanceHomeComponent } from './freelance-home.component';
import { FreelanceProjectsComponent } from './freelance-projects.component';
import { FreelanceProjectDetailsComponent } from './freelance-project-details.component';
import { ClientDashboardComponent } from './client-dashboard.component';
import { PostMissionComponent } from './post-mission.component';
import { MesCandidaturesComponent } from './mes-candidatures.component';
import { FreelanceSchedulerComponent } from './freelance-scheduler.component';
import { FreelanceWorkspaceComponent } from './freelance-workspace.component';
import { FreelanceRoleGuard } from './guards/freelance-role.guard';

const routes: Routes = [
  { path: 'dashboard', redirectTo: '', pathMatch: 'full' },
  { path: '', component: FreelanceHomeComponent },
  { path: 'projects', component: FreelanceProjectsComponent },
  { path: 'projects/:id', component: FreelanceProjectDetailsComponent },
  { path: 'mes-candidatures', component: MesCandidaturesComponent },
  { path: 'scheduler', component: FreelanceSchedulerComponent },
  {
    path: 'client',
    canActivate: [FreelanceRoleGuard],
    children: [
      { path: '', component: ClientDashboardComponent },
      { path: 'post', component: PostMissionComponent },
    ]
  },
  { path: 'workspace', component: FreelanceWorkspaceComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FreelanceRoutingModule {}