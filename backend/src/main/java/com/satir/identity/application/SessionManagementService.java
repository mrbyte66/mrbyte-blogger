package com.satir.identity.application;

import com.satir.identity.infrastructure.SessionManagementRepository;
import com.satir.platform.ApiException;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class SessionManagementService {
    private final SessionManagementRepository repository;private final Clock clock;private final AccountService accounts;
    public SessionManagementService(SessionManagementRepository repository,Clock clock,AccountService accounts){this.repository=repository;this.clock=clock;this.accounts=accounts;}
    public List<SessionManagementRepository.SessionView> list(UUID user,String currentId){return repository.list(user,currentId);}
    @Transactional public boolean delete(UUID user,UUID id,String currentId){
        var target=repository.list(user,currentId).stream().filter(s->s.id().equals(id)).findFirst().orElseThrow(()->new ApiException(404,"NOT_FOUND"));
        repository.delete(user,id);return target.current();
    }
    @Transactional public void revokeOthers(UUID user,String currentId){repository.revokeOthers(user,currentId);}
    public long reauthenticate(UUID user,String password){
        var account=accounts.require(user);if(!account.active())throw new ApiException(403,"EMAIL_VERIFICATION_REQUIRED");var verified=accounts.authenticate(account.email(),password);
        if(!verified.id().equals(user))throw new ApiException(401,"INVALID_CREDENTIALS");return clock.millis();
    }
}
