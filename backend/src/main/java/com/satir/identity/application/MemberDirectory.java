package com.satir.identity.application;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.identity.infrastructure.MembershipRepository;
import com.satir.platform.api.PageResponse;

/**
 * Owner's limited member list (API contract §8): identity fields only. Libraries, notes, history and
 * claps are never part of this view. Deleted (tombstoned) accounts are not listed.
 */
@Service
public class MemberDirectory {

    public record MemberView(UUID id, String name, String email, String status, Instant createdAt) {
    }

    private final MembershipRepository members;

    MemberDirectory(MembershipRepository members) {
        this.members = members;
    }

    @Transactional(readOnly = true)
    public PageResponse<MemberView> members(String q, int page, int size) {
        PageResponse.checkBounds(page, size);
        String query = PageResponse.query(q);
        var result = members.memberPage(query, page, size);
        return PageResponse.of(result.items().stream()
                .map(m -> new MemberView(m.id(), m.name(), m.email(), m.status().toLowerCase(Locale.ROOT), m.createdAt()))
                .toList(), page, size, result.total(), "created_desc");
    }
}
