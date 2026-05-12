import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OffreStatistiquesComponent } from './offre-statistiques.component';
import { OffreStatistiquesService, OffreStatistiques } from '../../services/offre-statistiques.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

describe('OffreStatistiquesComponent', () => {
  let component: OffreStatistiquesComponent;
  let fixture: ComponentFixture<OffreStatistiquesComponent>;
  let service: OffreStatistiquesService;
  let httpMock: HttpTestingController;

  const mockOffres: OffreStatistiques[] = [
    {
      offreId: 1,
      titrOffre: 'Java Developer',
      entreprise: 'TechCorp',
      recruteurNom: 'Ali Bouali',
      recruteurEmail: 'ali@techcorp.com',
      nombreCandidatures: 15,
      nombreCandidaturesAcceptees: 3,
      derniereCandidatureDate: '2026-04-15',
      salaire: '80',
      typeContrat: 'CDI'
    },
    {
      offreId: 2,
      titrOffre: 'React Developer',
      entreprise: 'WebStudio',
      recruteurNom: 'Fatima Ben',
      recruteurEmail: 'fatima@webstudio.com',
      nombreCandidatures: 8,
      nombreCandidaturesAcceptees: 2,
      derniereCandidatureDate: '2026-04-14',
      salaire: '70',
      typeContrat: 'CDI'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OffreStatistiquesComponent, CommonModule, FormsModule],
      providers: [OffreStatistiquesService]
    }).compileComponents();

    fixture = TestBed.createComponent(OffreStatistiquesComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(OffreStatistiquesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Vérifier qu'il n'y a pas de requêtes HTTP en attente
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load all offres on init', () => {
    // Act
    component.ngOnInit();

    // Assert
    const req = httpMock.expectOne('/api/offres-stats/all');
    expect(req.request.method).toBe('GET');
    
    req.flush(mockOffres);
    
    expect(component.offres.length).toBe(2);
    expect(component.filteredOffres.length).toBe(2);
    expect(component.isLoading).toBeFalse();
  });

  it('should load recruiter offres', () => {
    // Arrange
    component.recruteurId = 1;

    // Act
    component.loadRecruteurOffres();

    // Assert
    const req = httpMock.expectOne('/api/offres-stats/recruiter/1');
    expect(req.request.method).toBe('GET');
    
    req.flush([mockOffres[0]]);
    
    expect(component.filteredOffres.length).toBe(1);
    expect(component.filteredOffres[0].recruteurNom).toBe('Ali Bouali');
  });

  it('should filter by salary range', () => {
    // Arrange
    component.salaryMin = 70;
    component.salaryMax = 80;
    component.minCandidatures = 0;

    // Act
    component.loadSalaryRangeOffres();

    // Assert
    const req = httpMock.expectOne(
      '/api/offres-stats/salary?min=70&max=80&minCandidatures=0'
    );
    expect(req.request.method).toBe('GET');
    
    req.flush(mockOffres);
    
    expect(component.filteredOffres.length).toBe(2);
  });

  it('should load top offres', () => {
    // Arrange
    component.topLimit = 5;

    // Act
    component.loadTopOffres();

    // Assert
    const req = httpMock.expectOne('/api/offres-stats/top?limit=5');
    expect(req.request.method).toBe('GET');
    
    req.flush(mockOffres);
    
    expect(component.filteredOffres.length).toBe(2);
  });

  it('should format date correctly', () => {
    // Act & Assert
    const formatted = component.formatDate('2026-04-15');
    expect(formatted).toContain('2026');
  });

  it('should calculate acceptance rate correctly', () => {
    // Arrange
    const total = 15;
    const accepted = 3;

    // Act
    const rate = component.getAcceptanceRate(accepted, total);

    // Assert
    expect(rate).toBe('20%');
  });

  it('should assign correct CSS class based on candidatures count', () => {
    // Act & Assert
    expect(component.getCandidaturesClass(0)).toBe('candidatures-none');
    expect(component.getCandidaturesClass(3)).toBe('candidatures-low');
    expect(component.getCandidaturesClass(10)).toBe('candidatures-medium');
    expect(component.getCandidaturesClass(20)).toBe('candidatures-high');
  });

  it('should handle error when loading offres', () => {
    // Act
    component.ngOnInit();

    // Assert
    const req = httpMock.expectOne('/api/offres-stats/all');
    req.error(new ErrorEvent('Network error'));
    
    expect(component.errorMessage).toBeTruthy();
    expect(component.isLoading).toBeFalse();
  });

  it('should display error message when recruiter ID is missing', () => {
    // Arrange
    component.recruteurId = null;

    // Act
    component.loadRecruteurOffres();

    // Assert
    expect(component.errorMessage).toContain('recruteur');
  });

  it('should unsubscribe on destroy', () => {
    // Arrange
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');

    // Act
    component.ngOnDestroy();

    // Assert
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
