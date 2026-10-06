package com.satir.platform;

import org.flywaydb.core.Flyway;
/** Separate process: never starts HTTP, sessions, scheduling or delivery workers. */
public final class MigrationCommand {
    public static void main(String[] args) {
        Flyway.configure().dataSource(required("DB_URL"),required("DB_USER"),required("DB_PASSWORD"))
            .locations("classpath:db/migration").cleanDisabled(true).load().migrate();
    }
    private static String required(String key) {
        var value=System.getenv(key);
        if(value==null||value.isBlank()) {
            var file=System.getenv(key+"_FILE");
            if(file!=null&&!file.isBlank())try{value=java.nio.file.Files.readString(java.nio.file.Path.of(file)).trim();}catch(java.io.IOException e){throw new IllegalStateException(key+" secret file could not be read");}
        }
        if(value==null||value.isBlank())throw new IllegalStateException(key+" is required");return value;
    }
}
