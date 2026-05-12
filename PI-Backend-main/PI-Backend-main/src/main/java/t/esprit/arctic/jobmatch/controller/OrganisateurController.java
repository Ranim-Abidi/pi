package t.esprit.arctic.jobmatch.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/organisateur")
public class OrganisateurController {

    @GetMapping("/test")
    public String test() {
        return "ORGANISATEUR OK";
    }
}

