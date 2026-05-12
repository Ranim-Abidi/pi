describe('Offre Statistiques Component - E2E Tests', () => {
  const baseUrl = 'http://localhost:4200';
  const apiBaseUrl = 'http://localhost:8080/api/offres-stats';

  beforeEach(() => {
    cy.visit(`${baseUrl}/recruiter-dashboard`);
  });

  it('should display statistiques component', () => {
    cy.get('app-offre-statistiques').should('exist');
    cy.get('h1').should('contain', 'Statistiques des Offres');
  });

  it('should load all offres on page load', () => {
    cy.intercept('GET', `${apiBaseUrl}/all`, { fixture: 'offres.json' }).as('getAllOffres');
    cy.visit(`${baseUrl}/recruiter-dashboard`);
    cy.wait('@getAllOffres');
    cy.get('.offres-table tbody tr').should('have.length', 3);
  });

  it('should filter offres by recruiter', () => {
    cy.intercept('GET', `${apiBaseUrl}/recruiter/1`, { fixture: 'offres-recruiter.json' }).as('getRecruiterOffres');
    
    cy.get('input[placeholder="ID recruteur"]').type('1');
    cy.get('button').contains('Offres du recruteur').click();
    cy.wait('@getRecruiterOffres');
    
    cy.get('.offres-table tbody tr').should('have.length', 2);
  });

  it('should filter offres by salary range', () => {
    cy.intercept('GET', `${apiBaseUrl}/salary*`, { fixture: 'offres-salary.json' }).as('getSalaryOffres');
    
    cy.get('input[placeholder="Min"]').clear().type('50');
    cy.get('input[placeholder="Max"]').clear().type('150');
    cy.get('button').contains('Filtrer par salaire').click();
    cy.wait('@getSalaryOffres');
    
    cy.get('.offres-table tbody tr').should('have.length', 2);
  });

  it('should load top offres', () => {
    cy.intercept('GET', `${apiBaseUrl}/top*`, { fixture: 'offres-top.json' }).as('getTopOffres');
    
    cy.get('button').contains('Top offres').click();
    cy.wait('@getTopOffres');
    
    cy.get('.offres-table tbody tr').should('have.length', 5);
  });

  it('should display error message on API failure', () => {
    cy.intercept('GET', `${apiBaseUrl}/all`, { statusCode: 500 }).as('failedRequest');
    cy.visit(`${baseUrl}/recruiter-dashboard`);
    cy.wait('@failedRequest');
    
    cy.get('.error-message').should('be.visible');
    cy.get('.error-message').should('contain', 'Erreur');
  });

  it('should show loading state while fetching data', () => {
    cy.intercept('GET', `${apiBaseUrl}/all`, (req) => {
      req.reply((res) => {
        res.delay(1000);
      });
    }).as('delayedRequest');
    
    cy.visit(`${baseUrl}/recruiter-dashboard`);
    cy.get('.loader').should('be.visible');
    cy.wait('@delayedRequest');
    cy.get('.loader').should('not.exist');
  });

  it('should display correct acceptance rate', () => {
    cy.intercept('GET', `${apiBaseUrl}/all`, { fixture: 'offres-with-rates.json' }).as('getAllOffres');
    cy.visit(`${baseUrl}/recruiter-dashboard`);
    cy.wait('@getAllOffres');
    
    cy.get('.stat-percentage').first().should('contain', '%');
  });

  it('should apply correct CSS class based on candidatures count', () => {
    cy.intercept('GET', `${apiBaseUrl}/all`, { fixture: 'offres-varying-counts.json' }).as('getAllOffres');
    cy.visit(`${baseUrl}/recruiter-dashboard`);
    cy.wait('@getAllOffres');
    
    cy.get('tr.candidatures-high').should('exist');
    cy.get('tr.candidatures-low').should('exist');
  });

  it('should display empty message when no results', () => {
    cy.intercept('GET', `${apiBaseUrl}/salary*`, { body: [] }).as('emptyRequest');
    
    cy.get('input[placeholder="Min"]').clear().type('1000');
    cy.get('input[placeholder="Max"]').clear().type('2000');
    cy.get('button').contains('Filtrer par salaire').click();
    cy.wait('@emptyRequest');
    
    cy.get('.empty-message').should('be.visible');
    cy.get('.empty-message').should('contain', 'Aucune offre trouvée');
  });

  it('should validate recruiter ID requirement', () => {
    cy.get('input[placeholder="ID recruteur"]').clear();
    cy.get('button').contains('Offres du recruteur').click();
    
    cy.get('.error-message').should('be.visible');
  });

  it('should properly format dates in table', () => {
    cy.intercept('GET', `${apiBaseUrl}/all`, { fixture: 'offres.json' }).as('getAllOffres');
    cy.visit(`${baseUrl}/recruiter-dashboard`);
    cy.wait('@getAllOffres');
    
    cy.get('td').contains(/\d{2}\/\d{2}\/\d{4}/).should('exist');
  });

  it('should handle filter button clicks correctly', () => {
    cy.get('button.filter-btn').should('have.length.greaterThan', 3);
    cy.get('button.filter-btn').first().click();
    cy.get('button.filter-btn.active').should('exist');
  });

  it('should maintain state during filter changes', () => {
    cy.intercept('GET', `${apiBaseUrl}/all`, { fixture: 'offres.json' }).as('getAllOffres');
    cy.visit(`${baseUrl}/recruiter-dashboard`);
    cy.wait('@getAllOffres');
    
    const initialCount = 3;
    cy.get('.offres-table tbody tr').should('have.length', initialCount);
    
    cy.get('input[placeholder="ID recruteur"]').type('1');
    cy.intercept('GET', `${apiBaseUrl}/recruiter/1`, { fixture: 'offres-recruiter.json' }).as('getRecruiterOffres');
    cy.get('button').contains('Offres du recruteur').click();
    cy.wait('@getRecruiterOffres');
    
    cy.get('.offres-table tbody tr').should('have.length', 2);
  });
});
