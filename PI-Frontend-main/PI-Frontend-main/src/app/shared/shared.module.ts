import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { NgxScrollTopModule } from 'ngx-scrolltop';

import { NavbarComponent } from '../common/navbar/navbar.component';
import { FooterComponent } from '../common/footer/footer.component';
import { SubscribeComponent } from '../common/subscribe/subscribe.component';
import { PartnersComponent } from '../common/partners/partners.component';
import { PopularJobsComponent } from '../common/popular-jobs/popular-jobs.component';
import { AboutUsComponent } from '../common/about-us/about-us.component';
import { CategoriesComponent } from '../common/categories/categories.component';
import { LeadingCompanyComponent } from '../common/leading-company/leading-company.component';
import { TestimonialsComponent } from '../common/testimonials/testimonials.component';
import { GetHiredByTopCompaniesComponent } from '../common/get-hired-by-top-companies/get-hired-by-top-companies.component';
import { HowJoveWorksComponent } from '../common/how-jove-works/how-jove-works.component';
import { DownloadAppComponent } from '../common/download-app/download-app.component';
import { FaqComponent } from '../common/faq/faq.component';
import { JobsByLocationComponent } from '../common/jobs-by-location/jobs-by-location.component';
import { TalentedExpertsComponent } from '../common/talented-experts/talented-experts.component';
import { BlogComponent } from '../common/blog/blog.component';
import { HometwoBannerComponent } from '../pages/home-demo-two/hometwo-banner/hometwo-banner.component';
import { HomethreeBannerComponent } from '../pages/home-demo-three/homethree-banner/homethree-banner.component';
import { HomeoneBannerComponent } from '../pages/home-demo-one/homeone-banner/homeone-banner.component';
import { CompaniesComponent } from '../common/companies/companies.component';
import { FeaturesComponent } from '../common/features/features.component';
import { FunfactsComponent } from '../common/funfacts/funfacts.component';

// Emotion Detector

// Recruiter Dashboard components
import { RdHeaderComponent } from '../recruiter-dashboard/rd-header/rd-header.component';
import { RdFooterComponent } from '../recruiter-dashboard/rd-footer/rd-footer.component';
import { RdSidebarComponent } from '../recruiter-dashboard/rd-sidebar/rd-sidebar.component';
import { WhyChooseUsComponent } from '../common/why-choose-us/why-choose-us.component';
import { RecommendationWidgetComponent } from '../recruiter-dashboard/recommendation-widget/recommendation-widget.component';

@NgModule({
  declarations: [
    NavbarComponent,
    FooterComponent,
    SubscribeComponent,
    PartnersComponent,
    PopularJobsComponent,
    AboutUsComponent,
    CategoriesComponent,
    LeadingCompanyComponent,
    TestimonialsComponent,
    GetHiredByTopCompaniesComponent,
    HowJoveWorksComponent,
    DownloadAppComponent,
    FaqComponent,
    JobsByLocationComponent,
    TalentedExpertsComponent,
    BlogComponent,
    HometwoBannerComponent,
    HomethreeBannerComponent,
    HomeoneBannerComponent,
    CompaniesComponent,
    FeaturesComponent,
    FunfactsComponent,
    RdHeaderComponent,
    RdFooterComponent,
    RdSidebarComponent,
    WhyChooseUsComponent,
    RecommendationWidgetComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NgxScrollTopModule
  ],
  exports: [
    NavbarComponent,
    FooterComponent,
    SubscribeComponent,
    PartnersComponent,
    PopularJobsComponent,
    AboutUsComponent,
    CategoriesComponent,
    LeadingCompanyComponent,
    TestimonialsComponent,
    GetHiredByTopCompaniesComponent,
    HowJoveWorksComponent,
    DownloadAppComponent,
    FaqComponent,
    JobsByLocationComponent,
    TalentedExpertsComponent,
    BlogComponent,
    HometwoBannerComponent,
    HomethreeBannerComponent,
    HomeoneBannerComponent,
    CompaniesComponent,
    FeaturesComponent,
    FunfactsComponent,
    RdHeaderComponent,
    RdFooterComponent,
    RdSidebarComponent,
    WhyChooseUsComponent,
    RecommendationWidgetComponent,
    NgxScrollTopModule,
    CommonModule,
    RouterModule,
    FormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedModule {}
