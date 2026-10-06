package com.satir.platform;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
/** Container probe without curl or external Java dependencies. */
public final class HealthProbe {
    public static void main(String[] args)throws Exception{
        var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:8080/actuator/health/readiness")).timeout(Duration.ofSeconds(3)).GET().build();
        int status=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build().send(request,HttpResponse.BodyHandlers.discarding()).statusCode();
        if(status!=200)System.exit(1);
    }
}
