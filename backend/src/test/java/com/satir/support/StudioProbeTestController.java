package com.satir.support;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Test-only endpoint under the Studio prefix, used to verify the OWNER-only rule before the real
 * Studio endpoints exist. Lives in test sources, so it is never part of the application.
 */
@RestController
class StudioProbeTestController {

    @GetMapping("/api/v1/studio/test-probe")
    Map<String, Boolean> probe() {
        return Map.of("studio", true);
    }
}
