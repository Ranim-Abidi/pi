package t.esprit.arctic.jobmatch.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.dto.ChoixDTO;
import t.esprit.arctic.jobmatch.service.ChoixService;

import java.util.List;

@RestController
@RequestMapping("/api/choix")
public class ChoixController {

    @Autowired
    private ChoixService choixService;

    @PostMapping("/question/{questionId}")
    public ResponseEntity<ChoixDTO> addChoix(
            @PathVariable Long questionId,
            @RequestBody ChoixDTO choixDTO) {
        return ResponseEntity.ok(choixService.addChoix(questionId, choixDTO));
    }

    @GetMapping("/question/{questionId}")
    public ResponseEntity<List<ChoixDTO>> getChoixByQuestion(@PathVariable Long questionId) {
        return ResponseEntity.ok(choixService.getChoixByQuestion(questionId));
    }
}

