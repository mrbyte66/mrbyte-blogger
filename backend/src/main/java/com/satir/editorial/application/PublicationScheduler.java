package com.satir.editorial.application;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
@Component
public class PublicationScheduler {
    private final ArticleService service;
    public PublicationScheduler(ArticleService service){this.service=service;}
    @Scheduled(fixedDelayString="${satir.publication-delay-ms:15000}")public void runDue(){for(var id:service.due())try{service.publishDue(id);}catch(RuntimeException e){org.slf4j.LoggerFactory.getLogger(PublicationScheduler.class).warn("PUBLICATION_FAILED articleId={}",id);}}
}
