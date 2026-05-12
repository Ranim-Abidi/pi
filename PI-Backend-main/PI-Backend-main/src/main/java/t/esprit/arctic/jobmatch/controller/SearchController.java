package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import t.esprit.arctic.jobmatch.dto.UtilisateurSearchDto;
import t.esprit.arctic.jobmatch.service.SearchService;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping(path = {"/users/search", "/search/utilisateurs/nom"})
    public List<UtilisateurSearchDto> searchUsersByName(
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "nom", required = false) String nom
    ) {
        System.out.println("📨 SearchController received - name: " + name + ", nom: " + nom);
        
        String query = (name != null && !name.isBlank()) ? name : nom;
        System.out.println("🔎 Processing query: " + query);
        
        return searchService.searchUsersByName(query);
    }
}
