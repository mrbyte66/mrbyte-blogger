package com.satir.platform;

import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class CommandDataRemoval implements AccountDataRemoval {
    private final JdbcClient jdbc;
    public CommandDataRemoval(JdbcClient jdbc){this.jdbc=jdbc;}
    public void removeFor(UUID user){jdbc.sql("delete from idempotency_record where principal_key=?").param(user.toString()).update();}
}
