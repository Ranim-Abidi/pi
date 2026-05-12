package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import t.esprit.arctic.jobmatch.dto.OffreSalairePredictionRequestDTO;
import t.esprit.arctic.jobmatch.service.OffreSalairePredictionService;

import java.util.Map;

@RestController
@RequestMapping("/api/predict-salary")
@RequiredArgsConstructor
public class SalaryPredictionController {

    private final OffreSalairePredictionService offreSalairePredictionService;

    @PostMapping
    public ResponseEntity<?> predictSalaire(@Valid @RequestBody OffreSalairePredictionRequestDTO dto) {
        String predictedSalary = offreSalairePredictionService.predictSalaire(
            dto.getTitre(),
            dto.getDescription(),
            dto.getEntreprise(),
            dto.getLocation(),
            dto.getTypeContrat(),
            dto.getCompetences()
        );
        return ResponseEntity.ok(Map.of("predicted_salary", predictedSalary));
    }
}

