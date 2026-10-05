package com.satir.platform;

import static org.assertj.core.api.Assertions.assertThat;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.satir.support.IntegrationTest;

class MigrationIntegrationTest extends IntegrationTest {

    @Autowired
    Flyway flyway;

    @Test
    void allMigrationsAreAppliedAndValid() {
        MigrationInfo[] applied = flyway.info().applied();

        assertThat(applied).isNotEmpty();
        assertThat(applied).allSatisfy(info -> assertThat(info.getState().isApplied()).isTrue());
        assertThat(flyway.info().pending()).isEmpty();
        flyway.validate();
    }

    @Test
    void turkishCollationIsAvailableForCatalogOrdering() {
        // Studio/catalog title ordering relies on ICU Turkish collation (architecture §3).
        assertThat(jdbc.sql("SELECT count(*) FROM pg_collation WHERE collname = 'tr-TR-x-icu'").query(Long.class).single())
                .isEqualTo(1);
        assertThat(jdbc.sql("SELECT string_agg(w, ',' ORDER BY w COLLATE \"tr-TR-x-icu\") FROM unnest(ARRAY['çam','dal','cam']) AS w")
                .query(String.class).single()).isEqualTo("cam,çam,dal");
    }
}
