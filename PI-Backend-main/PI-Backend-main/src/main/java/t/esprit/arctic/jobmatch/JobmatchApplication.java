package t.esprit.arctic.jobmatch;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;


@SpringBootApplication
@EnableScheduling
public class JobmatchApplication {

    public static void main(String[] args) {
        SpringApplication.run(JobmatchApplication.class, args);
    }

}
