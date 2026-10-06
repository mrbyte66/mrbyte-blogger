package com.satir.editorial.infrastructure;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Always acquire before any editorial row lock, inside the command transaction. */
@Repository
public class EditorialWriteLock {
    private final JdbcClient jdbc;
    public EditorialWriteLock(JdbcClient jdbc) { this.jdbc=jdbc; }
    public void acquire() { jdbc.sql("select id from editorial_write_lock where id=1 for update").query(Integer.class).single(); }
}
