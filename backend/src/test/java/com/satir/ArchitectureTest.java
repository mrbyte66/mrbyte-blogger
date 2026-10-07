package com.satir;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

/** Module and layer boundaries from architecture §2 (T2). */
@AnalyzeClasses(packages = "com.satir", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    @ArchTest
    static final ArchRule modulesAreFreeOfCycles = slices().matching("com.satir.(*)..").should().beFreeOfCycles();

    @ArchTest
    static final ArchRule platformDependsOnNoBusinessModule = noClasses()
            .that().resideInAPackage("com.satir.platform..")
            .should().dependOnClassesThat().resideInAnyPackage(
                    "com.satir.identity..", "com.satir.editorial..", "com.satir.site..", "com.satir.media..",
                    "com.satir.library..", "com.satir.reading..", "com.satir.engagement..", "com.satir.delivery..");

    @ArchTest
    static final ArchRule domainIsIndependentOfOuterLayers = noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAnyPackage("..api..", "..application..", "..infrastructure..",
                    "org.springframework..", "jakarta.persistence..");

    @ArchTest
    static final ArchRule apiDoesNotReachPersistence = noClasses()
            .that().resideInAPackage("com.satir.*.api..")
            .should().dependOnClassesThat().resideInAPackage("com.satir.*.infrastructure..");

    @ArchTest
    static final ArchRule identityPersistenceIsPrivateToIdentity = noClasses()
            .that().resideOutsideOfPackage("com.satir.identity..")
            .should().dependOnClassesThat().resideInAPackage("com.satir.identity.infrastructure..");
}
