package com.satir;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

@AnalyzeClasses(packages="com.satir",importOptions=ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {
    @ArchTest static final ArchRule domainIsIndependent=noClasses().that().resideInAPackage("..domain..")
        .should().dependOnClassesThat().resideInAnyPackage("org.springframework..","jakarta.servlet..","..api..","..infrastructure..");
    @ArchTest static final ArchRule controllersDoNotUseSql=noClasses().that().resideInAPackage("..api..")
        .should().dependOnClassesThat().resideInAnyPackage("org.springframework.jdbc..","..infrastructure..");
    @ArchTest static final ArchRule modulesAreAcyclic=com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices().matching("com.satir.(*)..").should().beFreeOfCycles();
    @ArchTest static void foreignRepositoriesAreNotUsed(com.tngtech.archunit.core.domain.JavaClasses classes){
        var modules=java.util.List.of("identity","editorial","library","reading","engagement","delivery","site","media","platform");
        for(String module:modules){String[] foreign=modules.stream().filter(m->!m.equals(module)).map(m->"com.satir."+m+".infrastructure..").toArray(String[]::new);
            noClasses().that().resideInAPackage("com.satir."+module+"..").should().dependOnClassesThat().resideInAnyPackage(foreign).check(classes);
        }
    }
}
