import { FreelanceHomeComponent } from "./freelance-home.component";
import { FreelanceProjectsComponent } from "./freelance-projects.component";
import { FreelanceProjectDetailsComponent } from "./freelance-project-details.component";
import { FreelanceRoutingModule } from "./freelance-routing.module";
import { ClientDashboardComponent } from "./client-dashboard.component";
import { PostMissionComponent } from "./post-mission.component";
import { MesCandidaturesComponent } from "./mes-candidatures.component";
import { FreelanceSchedulerComponent } from "./freelance-scheduler.component";
import { FreelanceWorkspaceComponent } from "./freelance-workspace.component";
import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { NgApexchartsModule } from "ng-apexcharts";
import { SharedModule } from "../shared/shared.module";

@NgModule({
  declarations: [
    FreelanceHomeComponent,
    FreelanceProjectsComponent,
    FreelanceProjectDetailsComponent,
    ClientDashboardComponent,
    PostMissionComponent,
    MesCandidaturesComponent,
    FreelanceSchedulerComponent,
    FreelanceWorkspaceComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    FreelanceRoutingModule,
    NgApexchartsModule,
    SharedModule
  ]
})
export class FreelanceModule {}