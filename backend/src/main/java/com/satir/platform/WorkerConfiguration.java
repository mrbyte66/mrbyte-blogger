package com.satir.platform;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
@Configuration
@EnableScheduling
@ConditionalOnProperty(name="satir.workers-enabled",havingValue="true",matchIfMissing=true)
public class WorkerConfiguration {}
