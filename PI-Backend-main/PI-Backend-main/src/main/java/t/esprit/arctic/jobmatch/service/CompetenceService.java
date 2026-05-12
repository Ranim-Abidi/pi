package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.entity.Competence;
import t.esprit.arctic.jobmatch.repository.CompetenceRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CompetenceService {

    private final CompetenceRepository repository;

    public Competence create(Competence competence) {
        return repository.save(competence);
    }

    public List<Competence> getAll() {
        return repository.findAll();
    }

    public Competence getById(Long id) {
        return repository.findById(id).orElseThrow(() -> 
            new RuntimeException("Competence not found with id: " + id));
    }

    public Competence update(Long id, Competence competenceDetails) {
        Competence competence = getById(id);
        competence.setNom(competenceDetails.getNom());
        competence.setNiveau(competenceDetails.getNiveau());
        competence.setType(competenceDetails.getType());
        return repository.save(competence);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}

