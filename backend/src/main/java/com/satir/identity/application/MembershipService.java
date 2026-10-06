package com.satir.identity.application;

import com.satir.identity.domain.UserAccount;
import com.satir.identity.infrastructure.AccountRepository;
import com.satir.delivery.application.MailGateway;
import com.satir.platform.ApiException;
import com.satir.platform.SecretCipher;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.ZoneId;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MembershipService {
    private final com.satir.identity.infrastructure.MembershipRepository repository; private final com.satir.delivery.application.JobQueue jobs; private final AccountRepository accounts; private final PasswordEncoder passwords; private final MailGateway mail; private final SecretCipher cipher; private final Clock clock; private final MemberWriteGuard guard;private final java.util.List<com.satir.platform.AccountDataRemoval> removals;
    public MembershipService(com.satir.identity.infrastructure.MembershipRepository repository,com.satir.delivery.application.JobQueue jobs,AccountRepository accounts,PasswordEncoder passwords,MailGateway mail,SecretCipher cipher,Clock clock,MemberWriteGuard guard,java.util.List<com.satir.platform.AccountDataRemoval> removals) { this.repository=repository;this.jobs=jobs;this.accounts=accounts;this.passwords=passwords;this.mail=mail;this.cipher=cipher;this.clock=clock;this.guard=guard;this.removals=removals; }
    public void requireDelivery() { if(!mail.configured()) throw new ApiException(503,"MAIL_NOT_CONFIGURED");if(!cipher.configured()) throw new ApiException(503,"TOKEN_ENCRYPTION_NOT_CONFIGURED"); }
    @Transactional public void register(String name,String email,String password,String confirmation) {
        requireDelivery();validatePassword(password,confirmation);
        String normalized=AccountService.normalize(email);
        // The conflict-safe insert avoids leaking a simultaneous duplicate registration.
        var id=UUID.randomUUID();
        if(!repository.createMember(id,name.trim(),normalized,clock.instant(),passwords.encode(password)))return;
        issue(id,"VERIFY",Duration.ofHours(24));
    }
    @Transactional public void requestToken(String email,String purpose) {
        requireDelivery();var account=accounts.byEmail(AccountService.normalize(email));
        account.filter(a -> purpose.equals("RESET")||!a.active()).ifPresent(a -> {if(repository.lockLive(a.id()))issue(a.id(),purpose,purpose.equals("VERIFY")?Duration.ofHours(24):Duration.ofMinutes(30));});
    }
    private UUID issue(UUID userId,String purpose,Duration lifetime) {
        byte[] random=new byte[32];new SecureRandom().nextBytes(random);String raw=Base64.getUrlEncoder().withoutPadding().encodeToString(random);var id=UUID.randomUUID();
        repository.createToken(id,userId,purpose,hash(raw),clock.instant().plus(lifetime),cipher.encrypt(raw,id.toString()));
        jobs.enqueue("ACCOUNT_TOKEN",id,"token:"+id);return id;
    }
    @Transactional public void confirm(String raw,String purpose,String password,String confirmation) {
        if(purpose.equals("RESET"))validatePassword(password,confirmation);
        var token=repository.lockToken(hash(raw),purpose,clock.instant()).orElseThrow(() -> new ApiException(422,"INVALID_TOKEN"));
        var user=token.userId();
        if(purpose.equals("VERIFY"))repository.activate(user);
        else if(purpose.equals("EMAIL_CHANGE")){String target=cipher.decrypt(repository.targetEmail(token.id()).orElseThrow(()->new ApiException(422,"INVALID_TOKEN")),token.id()+":email");try{repository.changeEmail(user,target);}catch(org.springframework.dao.DuplicateKeyException e){throw new ApiException(409,"EMAIL_UNAVAILABLE");}repository.consumeTokens(user,"VERIFY",clock.instant());repository.consumeTokens(user,"RESET",clock.instant());repository.revokeSessions(user);}
        else {repository.replacePassword(user,passwords.encode(password),clock.instant());repository.revokeSessions(user);}
        repository.consumeTokens(user,purpose,clock.instant());
    }
    @Transactional public UserAccount profile(UUID id,long version,String name,String avatar,Boolean publicationEmail,String timeZone) {
        guard.acquire(id);
        if(name!=null&&(name.isBlank()||name.length()>80))throw new ApiException(422,"VALIDATION_FAILED");
        if(avatar!=null&&!java.util.Set.of("initials","round","glasses","curly","reader","robot").contains(avatar)&&!avatar.matches("portrait-(0[1-9]|[1-4][0-9]|5[0-4])"))throw new ApiException(422,"INVALID_AVATAR");
        if(timeZone!=null) {try { ZoneId.of(timeZone); }catch(java.time.DateTimeException e){throw new ApiException(422,"INVALID_TIME_ZONE");}}
        if(!repository.updateProfile(id,version,name==null?null:name.trim(),avatar,publicationEmail,timeZone))throw new ApiException(412,"STALE_VERSION");
        return accounts.byId(id).orElseThrow(() -> new ApiException(401,"SESSION_EXPIRED"));
    }
    @Transactional public void changePassword(UUID user,String password,String confirmation){guard.acquire(user);validatePassword(password,confirmation);repository.replacePassword(user,passwords.encode(password),clock.instant());repository.consumeTokens(user,"RESET",clock.instant());repository.revokeSessions(user);}
    @Transactional public void requestEmailChange(UUID user,String email){requireDelivery();guard.acquire(user);String normalized=AccountService.normalize(email);if(accounts.byEmail(normalized).isPresent())return;repository.consumeTokens(user,"EMAIL_CHANGE",clock.instant());UUID token=issue(user,"EMAIL_CHANGE",Duration.ofHours(24));repository.targetEmail(token,cipher.encrypt(normalized,token+":email"));}
    @Transactional public void deleteAccount(UUID user,String confirmation){guard.acquire(user);var account=accounts.byId(user).orElseThrow(()->new ApiException(401,"SESSION_EXPIRED"));if(account.owner())throw new ApiException(409,"OWNER_DELETE_REQUIRES_MIGRATION");if(!"DELETE".equals(confirmation))throw new ApiException(422,"INVALID_CONFIRMATION");for(var removal:removals)removal.removeFor(user);repository.delete(user,clock.instant());}
    public static void validatePassword(String password,String confirmation) {
        if(password==null||password.length()<12||password.length()>128||!password.equals(confirmation))throw new ApiException(422,"INVALID_PASSWORD");
    }
    public static String hash(String value) {
        if(value==null||value.length()>512)throw new ApiException(422,"INVALID_TOKEN");
        try {return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}
        catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException("SHA-256 unavailable");}
    }
}
