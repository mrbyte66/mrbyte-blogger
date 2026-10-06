package com.satir.identity.application;

import com.satir.identity.infrastructure.MembershipRepository;
import com.satir.platform.ApiException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberWriteGuard {
    private final MembershipRepository repository;
    public MemberWriteGuard(MembershipRepository repository){this.repository=repository;}
    @Transactional(propagation=Propagation.MANDATORY)
    public void acquire(UUID user){if(!repository.lockActive(user))throw new ApiException(401,"SESSION_EXPIRED");}
}
