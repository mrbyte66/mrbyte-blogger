package com.satir.identity;

import com.satir.SatirApplication;
import com.satir.identity.application.AccountService;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;

/** Interactive one-shot command. No password argument, environment variable or log output. */
public final class OwnerBootstrap {
    public static void main(String[] args) {
        var console=System.console(); if(console==null) throw new IllegalStateException("Run bootstrap in an interactive terminal");
        String username=console.readLine("Owner username: "); String email=console.readLine("Verified owner email: "); String name=console.readLine("Display name: ");
        char[] password=console.readPassword("Password (12–128 characters): ");
        var application=new SpringApplication(SatirApplication.class); application.setWebApplicationType(WebApplicationType.NONE); application.addInitializers(context -> context.getEnvironment().getPropertySources().addFirst(new org.springframework.core.env.MapPropertySource("bootstrap-safety",java.util.Map.of("satir.workers-enabled",false))));
        try(var context=application.run(args)) { context.getBean(AccountService.class).bootstrap(username,email,name,new String(password)); console.printf("Owner created. No existing account was replaced.%n"); }
        finally { java.util.Arrays.fill(password,'\0'); }
    }
}
