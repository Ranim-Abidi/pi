package t.esprit.arctic.jobmatch.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import t.esprit.arctic.jobmatch.dto.OffreStatistiquesDTO;
import t.esprit.arctic.jobmatch.repository.OffreEmploiRepository;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class OffreStatistiquesServiceTest {

    @Mock
    private OffreEmploiRepository offreEmploiRepository;

    @InjectMocks
    private OffreStatistiquesService offreStatistiquesService;

    private List<OffreStatistiquesDTO> mockOffres;

    @BeforeEach
    void setUp() {
        // Données de test
        mockOffres = Arrays.asList(
            new OffreStatistiquesDTO(
                1L, "Java Developer", "TechCorp", "Ali Bouali", "ali@techcorp.com",
                15L, 3L, "2026-04-15", "80", "CDI"
            ),
            new OffreStatistiquesDTO(
                2L, "React Developer", "WebStudio", "Fatima Ben", "fatima@webstudio.com",
                8L, 2L, "2026-04-14", "70", "CDI"
            ),
            new OffreStatistiquesDTO(
                3L, "Data Scientist", "DataCo", "Mohamed Ahmed", "m.ahmed@dataco.com",
                5L, 1L, "2026-04-13", "90", "CDI"
            )
        );
    }

    @Test
    void testGetOffresAvecStatistiques() {
        // Arrange
        when(offreEmploiRepository.findOffresAvecStatistiques())
            .thenReturn(mockOffres);

        // Act
        List<OffreStatistiquesDTO> result = offreStatistiquesService.getOffresAvecStatistiques();

        // Assert
        assertNotNull(result);
        assertEquals(3, result.size());
        assertEquals("Java Developer", result.get(0).getTitrOffre());
        assertEquals(15L, result.get(0).getNombreCandidatures());
        verify(offreEmploiRepository, times(1)).findOffresAvecStatistiques();
    }

    @Test
    void testGetOffresRecruteurAvecStats() {
        // Arrange
        Long recruteurId = 1L;
        List<OffreStatistiquesDTO> offreRecruteur = Arrays.asList(mockOffres.get(0));
        
        when(offreEmploiRepository.findOffresParRecruteurAvecStats(recruteurId))
            .thenReturn(offreRecruteur);

        // Act
        List<OffreStatistiquesDTO> result = offreStatistiquesService.getOffresRecruteurAvecStats(recruteurId);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Ali Bouali", result.get(0).getRecruteurNom());
        verify(offreEmploiRepository, times(1)).findOffresParRecruteurAvecStats(recruteurId);
    }

    @Test
    void testGetOffresBySalaryRange() {
        // Arrange
        int salaryMin = 70;
        int salaryMax = 90;
        long minCandidatures = 0;
        
        List<OffreStatistiquesDTO> salaryOffres = Arrays.asList(
            mockOffres.get(1), mockOffres.get(2)
        );
        
        when(offreEmploiRepository.findOffresBySalaryRangeWithCandidatures(
            salaryMin, salaryMax, minCandidatures
        )).thenReturn(salaryOffres);

        // Act
        List<OffreStatistiquesDTO> result = offreStatistiquesService.getOffresBySalaryRange(
            salaryMin, salaryMax, minCandidatures
        );

        // Assert
        assertNotNull(result);
        assertEquals(2, result.size());
        assertTrue(result.stream().allMatch(o -> 
            Integer.parseInt(o.getSalaire()) >= salaryMin && 
            Integer.parseInt(o.getSalaire()) <= salaryMax
        ));
    }

    @Test
    void testGetTopOffresByCandidatures() {
        // Arrange
        int limit = 2;
        when(offreEmploiRepository.findOffresAvecStatistiques())
            .thenReturn(mockOffres);

        // Act
        List<OffreStatistiquesDTO> result = offreStatistiquesService.getTopOffresByCandidatures(limit);

        // Assert
        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals(15L, result.get(0).getNombreCandidatures()); // Plus haute
        assertEquals(8L, result.get(1).getNombreCandidatures());
    }

    @Test
    void testHandleEmptyResult() {
        // Arrange
        when(offreEmploiRepository.findOffresAvecStatistiques())
            .thenReturn(Arrays.asList());

        // Act
        List<OffreStatistiquesDTO> result = offreStatistiquesService.getOffresAvecStatistiques();

        // Assert
        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testHandleNullResult() {
        // Arrange
        when(offreEmploiRepository.findOffresAvecStatistiques())
            .thenThrow(new RuntimeException("Database error"));

        // Act & Assert
        assertThrows(RuntimeException.class, () -> {
            offreStatistiquesService.getOffresAvecStatistiques();
        });
    }

    @Test
    void testAcceptanceRateCalculation() {
        // Test du calcul du taux d'acceptation
        OffreStatistiquesDTO offre = mockOffres.get(0);
        long totalCandidatures = offre.getNombreCandidatures(); // 15
        long accepted = offre.getNombreCandidaturesAcceptees(); // 3
        
        double acceptanceRate = (double) accepted / totalCandidatures * 100;
        
        assertEquals(20.0, acceptanceRate);
    }
}
