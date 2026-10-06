package com.satir.identity.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.satir.identity.application.MemberDirectory;
import com.satir.platform.api.PageResponse;

/** Owner-only member list (API contract §8); /studio/** is restricted to OWNER by the security config. */
@RestController
@RequestMapping("/api/v1/studio/members")
class StudioMemberController {

    private final MemberDirectory directory;

    StudioMemberController(MemberDirectory directory) {
        this.directory = directory;
    }

    @GetMapping
    PageResponse<MemberDirectory.MemberView> members(@RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return directory.members(q, page, size);
    }
}
