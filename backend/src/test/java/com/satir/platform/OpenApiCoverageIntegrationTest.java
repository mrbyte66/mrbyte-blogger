package com.satir.platform;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import java.util.TreeSet;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import com.satir.support.IntegrationTest;
import com.satir.support.OpenApiContract;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.parser.OpenAPIV3Parser;

/** docs/openapi.yaml describes exactly the API the application serves: nothing missing, nothing stale. */
class OpenApiCoverageIntegrationTest extends IntegrationTest {

    private static final String BASE = "/api/v1";

    @Autowired
    @Qualifier("requestMappingHandlerMapping")
    private RequestMappingHandlerMapping mappings;

    @Test
    void everyServedOperationIsDocumentedAndViceVersa() {
        Set<String> served = new TreeSet<>();
        mappings.getHandlerMethods().forEach((info, handler) -> info.getPatternValues().stream()
                .filter(path -> !handler.getBeanType().getPackageName().equals(IntegrationTest.class.getPackageName()))
                .filter(path -> path.startsWith(BASE + "/"))
                .forEach(path -> info.getMethodsCondition().getMethods()
                        .forEach(method -> served.add(method.name() + " " + path.substring(BASE.length())))));

        OpenAPI spec = new OpenAPIV3Parser().readContents(OpenApiContract.specText()).getOpenAPI();
        Set<String> documented = new TreeSet<>();
        spec.getPaths().forEach((path, item) -> item.readOperationsMap()
                .keySet().forEach(method -> documented.add(method.name() + " " + path)));

        assertThat(spec.getServers().getFirst().getUrl()).isEqualTo(BASE);
        assertThat(served).as("served by the application").isNotEmpty();
        assertThat(documented).as("documented in docs/openapi.yaml").containsExactlyInAnyOrderElementsOf(served);
    }
}
