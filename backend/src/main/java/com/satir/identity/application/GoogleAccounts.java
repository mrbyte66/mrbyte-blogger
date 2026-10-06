package com.satir.identity.application;

import com.satir.identity.infrastructure.AccountRepository;
import com.satir.identity.infrastructure.GoogleRepository;
import com.satir.identity.domain.UserAccount;
import com.satir.platform.ApiException;
import java.time.Clock;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GoogleAccounts {
    private final GoogleRepository repository;private final AccountRepository accounts;private final MemberWriteGuard guard;private final Clock clock;
    public GoogleAccounts(GoogleRepository repository,AccountRepository accounts,MemberWriteGuard guard,Clock clock){this.repository=repository;this.accounts=accounts;this.guard=guard;this.clock=clock;}
    @Transactional public UUID start(UUID user,String purpose,String returnTo){
        if(!Set.of("login","reauth","link").contains(purpose)||!Set.of("/","/hesap","/kaydedilenler").contains(returnTo))throw new ApiException(422,"INVALID_OAUTH_REQUEST");
        Long generation=null;
        if(!purpose.equals("login")){if(user==null)throw new ApiException(401,"SESSION_REQUIRED");guard.acquire(user);var account=accounts.byId(user).orElseThrow(()->new ApiException(401,"SESSION_REQUIRED"));if(account.owner())throw new ApiException(403,"OWNER_GOOGLE_DISABLED");generation=account.authenticationGeneration();}
        UUID id=UUID.randomUUID();repository.attempt(new GoogleRepository.Attempt(id,purpose.equals("login")?null:user,generation,purpose,returnTo,clock.instant().plusSeconds(600)));return id;
    }
    public record Result(UserAccount account,String returnTo,boolean reauthenticated){}
    /** Receives only claims already signature/issuer/audience/nonce validated by Spring OIDC login. */
    @Transactional public Result complete(UUID attemptId,UUID currentUser,String subject,String email,Boolean verified,String name){
        var attempt=repository.consume(attemptId,clock.instant());
        if(!Boolean.TRUE.equals(verified)||subject==null||subject.isBlank()||subject.length()>255||email==null||email.length()>254||!email.contains("@"))throw new ApiException(422,"GOOGLE_EMAIL_UNVERIFIED");
        email=AccountService.normalize(email);
        UUID linked=repository.user(subject).orElse(null);
        UUID user;
        if(!attempt.purpose().equals("login")){
            if(!Objects.equals(currentUser,attempt.user()))throw new ApiException(422,"INVALID_OAUTH_STATE");user=attempt.user();guard.acquire(user);
            var account=accounts.byId(user).orElseThrow(()->new ApiException(401,"SESSION_REQUIRED"));
            if(account.owner()||account.authenticationGeneration()!=attempt.generation())throw new ApiException(422,"INVALID_OAUTH_STATE");
            if(attempt.purpose().equals("reauth")){if(!user.equals(linked))throw new ApiException(409,"GOOGLE_ACCOUNT_MISMATCH");}
            else if(linked!=null&&!user.equals(linked))throw new ApiException(409,"GOOGLE_ALREADY_LINKED");
            else if(linked==null&&!repository.insert(user,subject,clock.instant()))throw new ApiException(409,"GOOGLE_ALREADY_LINKED");
        }else if(linked!=null){user=linked;guard.acquire(user);}
        else {
            if(accounts.byEmail(email).isPresent())throw new ApiException(409,"ACCOUNT_LINK_REQUIRED");
            user=UUID.randomUUID();String safeName=name==null||name.isBlank()?email.substring(0,email.indexOf('@')):name.strip();safeName=safeName.substring(0,Math.min(80,safeName.length()));
            if(!repository.createMember(user,email,safeName,clock.instant()))throw new ApiException(409,"ACCOUNT_LINK_REQUIRED");
            if(!repository.insert(user,subject,clock.instant()))throw new ApiException(409,"GOOGLE_ALREADY_LINKED");
        }
        var account=accounts.byId(user).filter(a->a.active()&&!a.owner()).orElseThrow(()->new ApiException(403,"GOOGLE_LOGIN_DENIED"));
        return new Result(account,attempt.returnTo(),!attempt.purpose().equals("login"));
    }
    public List<Map<String,Object>> connections(UUID user){return repository.connections(user);}
    @Transactional public void unlink(UUID user){guard.acquire(user);repository.unlink(user);}
}
