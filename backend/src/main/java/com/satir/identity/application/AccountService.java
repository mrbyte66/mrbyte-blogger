package com.satir.identity.application;

import com.satir.identity.domain.UserAccount;
import com.satir.identity.infrastructure.AccountRepository;
import com.satir.platform.ApiException;
import java.time.Clock;
import java.util.Locale;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {
    private final AccountRepository accounts;
    private final PasswordEncoder encoder;
    private final Clock clock;
    private final String dummyHash;
    public AccountService(AccountRepository accounts, PasswordEncoder encoder, Clock clock) {
        this.accounts=accounts; this.encoder=encoder; this.clock=clock;
        this.dummyHash=encoder.encode(UUID.randomUUID().toString());
    }
    @Transactional
    public UserAccount authenticate(String identifier, String password) {
        var candidate=accounts.lockedByIdentifier(normalize(identifier));
        String hash=candidate.flatMap(a -> accounts.password(a.id())).orElse(dummyHash);
        boolean valid=encoder.matches(password,hash);
        if (!valid || candidate.isEmpty()) throw new ApiException(401,"INVALID_CREDENTIALS");
        return candidate.get();
    }
    public UserAccount require(UUID id) { return accounts.byId(id).orElseThrow(() -> new ApiException(401,"SESSION_EXPIRED")); }
    public static String normalize(String value) { return value.trim().toLowerCase(Locale.ROOT); }
    @Transactional
    public UserAccount bootstrap(String username,String email,String name,String password) {
        if (accounts.ownerExists()) throw new ApiException(409,"OWNER_ALREADY_EXISTS");
        if (username==null || !username.matches("[a-z0-9_-]{3,80}") || email==null || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+") || email.length()>254 || name==null || name.isBlank() || name.length()>80 || password==null || password.length()<12 || password.length()>128)
            throw new ApiException(422,"VALIDATION_FAILED");
        var account=new UserAccount(UUID.randomUUID(),name.trim(),normalize(email),username,"OWNER","ACTIVE","initials",clock.instant(),0,true,"Europe/Istanbul",0);
        accounts.create(account,encoder.encode(password),clock.instant());
        return account;
    }
    public Object members(int page,int size,String q){if(page<0||page>1000||size<1||size>50)throw new ApiException(422,"INVALID_PAGINATION");if(q!=null){q=q.trim();if(q.isEmpty()||q.length()>100)throw new ApiException(422,"INVALID_QUERY");}return accounts.members(page,size,q);}
}
