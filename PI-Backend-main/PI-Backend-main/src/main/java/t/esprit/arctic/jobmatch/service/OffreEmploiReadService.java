package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.dto.OffreEmploiPublicDto;
import t.esprit.arctic.jobmatch.entity.OffreEmploi;
import t.esprit.arctic.jobmatch.repository.OffreEmploiRepository;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OffreEmploiReadService {

    private final OffreEmploiRepository offreEmploiRepository;

    /**
     * Charge et mappe les offres dans la même transaction lecture : aucune lazy hors session (OIV=false).
     */
    @Transactional(readOnly = true)
    public List<OffreEmploiPublicDto> listPublicOffresSorted() {
        List<OffreEmploi> offres = offreEmploiRepository.findAll();
        offres.sort(Comparator.comparing(OffreEmploi::getDatePublication,
                Comparator.nullsLast(Comparator.reverseOrder())));
        return offres.stream()
                .map(OffreEmploiPublicDto::fromEntity)
                .collect(Collectors.toList());
    }
}
