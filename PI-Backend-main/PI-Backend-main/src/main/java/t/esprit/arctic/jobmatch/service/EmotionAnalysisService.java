package t.esprit.arctic.jobmatch.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.dto.EmotionAnalysisDTO;
import t.esprit.arctic.jobmatch.dto.EmotionFrameDTO;
import t.esprit.arctic.jobmatch.dto.ProcessEmotionFrameRequest;
import t.esprit.arctic.jobmatch.entity.EmotionAnalysis;
import t.esprit.arctic.jobmatch.entity.EmotionFrame;
import t.esprit.arctic.jobmatch.entity.Entretien;
import t.esprit.arctic.jobmatch.repository.EmotionAnalysisRepository;
import t.esprit.arctic.jobmatch.repository.EmotionFrameRepository;
import t.esprit.arctic.jobmatch.repository.EntretienRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class EmotionAnalysisService {

    @Autowired
    private EmotionAnalysisRepository emotionAnalysisRepository;

    @Autowired
    private EmotionFrameRepository emotionFrameRepository;

    @Autowired
    private EntretienRepository entretienRepository;

    /**
     * Start emotion analysis for an interview
     */
    @Transactional
    public EmotionAnalysisDTO startEmotionAnalysis(Long entretienId) {
        return convertToDTO(getOrCreateAnalysis(entretienId, true));
    }

    /**
     * Process a single emotion frame
     */
    @Transactional
    public EmotionFrameDTO processEmotionFrame(Long entretienId, ProcessEmotionFrameRequest request) {
        EmotionAnalysis analysis = emotionAnalysisRepository.findByEntretienId(entretienId)
                .orElseThrow(() -> new RuntimeException("Emotion analysis not found"));

        EmotionFrame frame = new EmotionFrame();
        frame.setEmotionAnalysis(analysis);
        frame.setFrameNumber(request.getFrameNumber());
        frame.setTimestampSeconds(request.getTimestampSeconds());

        // Facial emotions
        frame.setJoy(request.getJoy());
        frame.setAnger(request.getAnger());
        frame.setSadness(request.getSadness());
        frame.setSurprise(request.getSurprise());
        frame.setFear(request.getFear());
        frame.setNeutral(request.getNeutral());
        frame.setFaceDetected(request.getFaceDetected() != null ? request.getFaceDetected() : Boolean.FALSE);

        // Voice analysis
        frame.setVoiceStress(request.getVoiceStress());
        frame.setVoiceConfidence(request.getVoiceConfidence());
        frame.setPitch(request.getPitch());
        frame.setVolumeLevel(request.getVolumeLevel());
        frame.setNotes(request.getNotes());

        EmotionFrame saved = emotionFrameRepository.save(frame);

        // Update aggregates
        updateEmotionAnalysisAggregates(analysis.getId());

        return convertFrameToDTO(saved);
    }

    /**
     * Update aggregated emotion scores
     */
    @Transactional
    public void updateEmotionAnalysisAggregates(Long analysisId) {
        EmotionAnalysis analysis = emotionAnalysisRepository.findById(analysisId)
                .orElseThrow(() -> new RuntimeException("Emotion analysis not found"));

        List<EmotionFrame> frames = emotionFrameRepository
                .findByEmotionAnalysisIdOrderByFrameNumberAsc(analysisId);

        if (frames.isEmpty()) {
            // Keep aggregates explicit when no frame is available yet.
            analysis.setAverageJoy(0.0);
            analysis.setAverageAnger(0.0);
            analysis.setAverageSadness(0.0);
            analysis.setAverageSurprise(0.0);
            analysis.setAverageFear(0.0);
            analysis.setAverageNeutral(100.0);
            analysis.setAverageStressLevel(0.0);
            analysis.setAverageConfidence(0.0);
            analysis.setAveragePitchVariation(0.0);
            analysis.setDominantEmotion("neutral");
            analysis.setEngagementScore(0.0);
            analysis.setProcessedFrames(0);
            analysis.setTotalFrames(0);
            emotionAnalysisRepository.save(analysis);
            return;
        }

        // Calculate averages for facial emotions
        double avgJoy = frames.stream()
                .filter(f -> f.getJoy() != null)
                .mapToDouble(EmotionFrame::getJoy)
                .average()
                .orElse(0.0);

        double avgAnger = frames.stream()
                .filter(f -> f.getAnger() != null)
                .mapToDouble(EmotionFrame::getAnger)
                .average()
                .orElse(0.0);

        double avgSadness = frames.stream()
                .filter(f -> f.getSadness() != null)
                .mapToDouble(EmotionFrame::getSadness)
                .average()
                .orElse(0.0);

        double avgSurprise = frames.stream()
                .filter(f -> f.getSurprise() != null)
                .mapToDouble(EmotionFrame::getSurprise)
                .average()
                .orElse(0.0);

        double avgFear = frames.stream()
                .filter(f -> f.getFear() != null)
                .mapToDouble(EmotionFrame::getFear)
                .average()
                .orElse(0.0);

        double avgNeutral = frames.stream()
                .filter(f -> f.getNeutral() != null)
                .mapToDouble(EmotionFrame::getNeutral)
                .average()
                .orElse(0.0);

        // Calculate averages for voice analysis
        double avgStressLevel = frames.stream()
                .filter(f -> f.getVoiceStress() != null)
                .mapToDouble(EmotionFrame::getVoiceStress)
                .average()
                .orElse(0.0);

        double avgConfidence = frames.stream()
                .filter(f -> f.getVoiceConfidence() != null)
                .mapToDouble(EmotionFrame::getVoiceConfidence)
                .average()
                .orElse(0.0);

        double avgPitchVariation = frames.stream()
                .filter(f -> f.getPitch() != null)
                .mapToDouble(EmotionFrame::getPitch)
                .average()
                .orElse(0.0);

        // Determine dominant emotion
        String dominantEmotion = determineDominantEmotion(avgJoy, avgAnger, avgSadness, avgSurprise, avgFear);

        // Calculate engagement score (combination of confidence and positive emotions)
        double engagementScore = (avgConfidence * 0.4 + avgJoy * 0.3 + (100 - avgStressLevel) * 0.3);

        // Update analysis
        analysis.setAverageJoy(avgJoy);
        analysis.setAverageAnger(avgAnger);
        analysis.setAverageSadness(avgSadness);
        analysis.setAverageSurprise(avgSurprise);
        analysis.setAverageFear(avgFear);
        analysis.setAverageNeutral(avgNeutral);
        analysis.setAverageStressLevel(avgStressLevel);
        analysis.setAverageConfidence(avgConfidence);
        analysis.setAveragePitchVariation(avgPitchVariation);
        analysis.setDominantEmotion(dominantEmotion);
        analysis.setEngagementScore(engagementScore);
        analysis.setProcessedFrames(frames.size());
        analysis.setTotalFrames(frames.size());

        emotionAnalysisRepository.save(analysis);
    }

    /**
     * Complete the emotion analysis
     */
    @Transactional
    public EmotionAnalysisDTO completeEmotionAnalysis(Long entretienId) {
        EmotionAnalysis analysis = emotionAnalysisRepository.findByEntretienId(entretienId)
                .orElseThrow(() -> new RuntimeException("Emotion analysis not found"));

        // Recompute before completion to avoid null aggregate values.
        updateEmotionAnalysisAggregates(analysis.getId());
        analysis = emotionAnalysisRepository.findById(analysis.getId())
            .orElseThrow(() -> new RuntimeException("Emotion analysis not found"));

        analysis.setStatus("COMPLETED");
        analysis.setCompletedAt(LocalDateTime.now());

        // Generate overall assessment
        String assessment = generateOverallAssessment(analysis);
        analysis.setOverallAssessment(assessment);

        EmotionAnalysis saved = emotionAnalysisRepository.save(analysis);
        return convertToDTO(saved);
    }

    /**
     * Get analysis results for an interview
     */
    public EmotionAnalysisDTO getEmotionAnalysis(Long entretienId) {
        return convertToDTO(getOrCreateAnalysis(entretienId, false));
    }

    /**
     * Get all frames for an analysis
     */
    public List<EmotionFrameDTO> getEmotionFrames(Long entretienId) {
        EmotionAnalysis analysis = getOrCreateAnalysis(entretienId, false);

        return emotionFrameRepository.findByEmotionAnalysisIdOrderByFrameNumberAsc(analysis.getId())
                .stream()
                .map(this::convertFrameToDTO)
                .collect(Collectors.toList());
    }

    private EmotionAnalysis getOrCreateAnalysis(Long entretienId, boolean forceRunningStatus) {
        Entretien entretien = entretienRepository.findById(entretienId)
                .orElseThrow(() -> new RuntimeException("Entretien non trouvé"));

        Optional<EmotionAnalysis> existing = emotionAnalysisRepository.findByEntretienId(entretienId);
        if (existing.isPresent()) {
            EmotionAnalysis analysis = existing.get();
            if (forceRunningStatus && (analysis.getStatus() == null || !"RUNNING".equalsIgnoreCase(analysis.getStatus()))) {
                analysis.setStatus("RUNNING");
                emotionAnalysisRepository.save(analysis);
            }
            return analysis;
        }

        EmotionAnalysis analysis = new EmotionAnalysis();
        analysis.setEntretien(entretien);
        analysis.setStatus("RUNNING");
        analysis.setTotalFrames(0);
        analysis.setProcessedFrames(0);
        analysis.setAverageJoy(0.0);
        analysis.setAverageAnger(0.0);
        analysis.setAverageSadness(0.0);
        analysis.setAverageSurprise(0.0);
        analysis.setAverageFear(0.0);
        analysis.setAverageNeutral(100.0);
        analysis.setAverageStressLevel(0.0);
        analysis.setAverageConfidence(0.0);
        analysis.setAveragePitchVariation(0.0);
        analysis.setDominantEmotion("neutral");
        analysis.setEngagementScore(0.0);

        return emotionAnalysisRepository.save(analysis);
    }

    /**
     * Determine the dominant emotion from scores
     */
    private String determineDominantEmotion(double joy, double anger, double sadness, double surprise, double fear) {
        double maxScore = Math.max(Math.max(Math.max(Math.max(joy, anger), sadness), surprise), fear);

        if (maxScore < 20) {
            return "neutral";
        }

        if (joy == maxScore) return "joy";
        if (anger == maxScore) return "anger";
        if (sadness == maxScore) return "sadness";
        if (surprise == maxScore) return "surprise";
        if (fear == maxScore) return "fear";

        return "neutral";
    }

    /**
     * Generate an overall assessment text
     */
    private String generateOverallAssessment(EmotionAnalysis analysis) {
        StringBuilder assessment = new StringBuilder();

        double avgJoy = nz(analysis.getAverageJoy());
        double avgNeutral = nz(analysis.getAverageNeutral());
        double avgAnger = nz(analysis.getAverageAnger());
        double avgConfidence = nz(analysis.getAverageConfidence());
        double avgStress = nz(analysis.getAverageStressLevel());
        double engagement = nz(analysis.getEngagementScore());

        // Facial expression assessment
        assessment.append("Expressions faciales: ");
        if (avgJoy > 40) {
            assessment.append("Candidat généralement positif et souriant. ");
        } else if (avgNeutral > 50) {
            assessment.append("Candidat a maintenu une expression neutre. ");
        }

        if (avgAnger > 30) {
            assessment.append("Moments de frustration ou d'impatience observés. ");
        }

        // Voice assessment
        assessment.append("\nTon de voix: ");
        if (avgConfidence > 70) {
            assessment.append("Confiance élevée dans les réponses. ");
        } else if (avgConfidence < 40) {
            assessment.append("Manque de confiance notéable. ");
        }

        if (avgStress > 60) {
            assessment.append("Niveau de stress élevé détecté. ");
        }

        // Engagement assessment
        assessment.append("\nEngagement global: ");
        if (engagement > 70) {
            assessment.append("Très engagé et impliqué.");
        } else if (engagement > 50) {
            assessment.append("Engagé de manière modérée.");
        } else {
            assessment.append("Engagement faible.");
        }

        return assessment.toString();
    }

    /**
     * Convert entity to DTO
     */
    private EmotionAnalysisDTO convertToDTO(EmotionAnalysis analysis) {
        EmotionAnalysisDTO dto = EmotionAnalysisDTO.builder()
                .id(analysis.getId())
                .entretienId(analysis.getEntretien().getId())
                .status(analysis.getStatus())
                .totalFrames(analysis.getTotalFrames())
                .processedFrames(analysis.getProcessedFrames())
                .averageJoy(analysis.getAverageJoy())
                .averageAnger(analysis.getAverageAnger())
                .averageSadness(analysis.getAverageSadness())
                .averageSurprise(analysis.getAverageSurprise())
                .averageFear(analysis.getAverageFear())
                .averageNeutral(analysis.getAverageNeutral())
                .averageStressLevel(analysis.getAverageStressLevel())
                .averageConfidence(analysis.getAverageConfidence())
                .averagePitchVariation(analysis.getAveragePitchVariation())
                .speakingRate(analysis.getSpeakingRate())
                .silenceDuration(analysis.getSilenceDuration())
                .dominantEmotion(analysis.getDominantEmotion())
                .engagementScore(analysis.getEngagementScore())
                .overallAssessment(analysis.getOverallAssessment())
                .createdAt(analysis.getCreatedAt())
                .completedAt(analysis.getCompletedAt())
                .build();

        return dto;
    }

    private double nz(Double value) {
        return value != null ? value : 0.0;
    }

    /**
     * Convert frame entity to DTO
     */
    private EmotionFrameDTO convertFrameToDTO(EmotionFrame frame) {
        return EmotionFrameDTO.builder()
                .id(frame.getId())
                .frameNumber(frame.getFrameNumber())
                .timestampSeconds(frame.getTimestampSeconds())
                .joy(frame.getJoy())
                .anger(frame.getAnger())
                .sadness(frame.getSadness())
                .surprise(frame.getSurprise())
                .fear(frame.getFear())
                .neutral(frame.getNeutral())
                .faceDetected(frame.getFaceDetected())
                .voiceStress(frame.getVoiceStress())
                .voiceConfidence(frame.getVoiceConfidence())
                .pitch(frame.getPitch())
                .volumeLevel(frame.getVolumeLevel())
                .notes(frame.getNotes())
                .createdAt(frame.getCreatedAt())
                .build();
    }
}
