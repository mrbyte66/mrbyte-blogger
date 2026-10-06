package com.satir.identity.api;
import com.satir.identity.domain.UserAccount;
import java.util.UUID;
public record ProfileResponse(UUID id,String name,String email,boolean verified,String avatar,String role,Preferences preferences,long version) {
    public record Preferences(boolean publicationEmail,String timeZone) {}
    public static ProfileResponse from(UserAccount a) { return new ProfileResponse(a.id(),a.name(),a.email(),a.active(),a.avatar(),a.role().toLowerCase(java.util.Locale.ROOT),new Preferences(a.publicationEmail(),a.timeZone()),a.version()); }
}
