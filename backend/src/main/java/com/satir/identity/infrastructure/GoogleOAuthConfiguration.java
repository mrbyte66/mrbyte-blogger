package com.satir.identity.infrastructure;

import com.satir.identity.application.*;
import com.satir.platform.ApiException;
import jakarta.servlet.http.*;
import java.time.Clock;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.client.registration.*;
import org.springframework.security.oauth2.client.web.*;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Component;

@Component
public class GoogleOAuthConfiguration implements GoogleProviderSettings {
    private final ClientRegistrationRepository registrations;private final GoogleAccounts accounts;private final BrowserSessions sessions;private final Clock clock;
    public GoogleOAuthConfiguration(@Value("${GOOGLE_CLIENT_ID:}")String id,@Value("${GOOGLE_CLIENT_SECRET:}")String secret,@Value("${satir.public-origin}")String origin,GoogleAccounts accounts,BrowserSessions sessions,Clock clock,org.springframework.beans.factory.ObjectProvider<ClientRegistrationRepository> configuredRegistrations){
        this.accounts=accounts;this.sessions=sessions;this.clock=clock;
        if(id.isBlank()!=secret.isBlank())throw new IllegalStateException("Configure both Google client credentials");
        registrations=configuredRegistrations.getIfAvailable(()->id.isBlank()?null:new InMemoryClientRegistrationRepository(org.springframework.security.config.oauth2.client.CommonOAuth2Provider.GOOGLE.getBuilder("google").clientId(id).clientSecret(secret).scope("openid","email","profile").redirectUri(origin.replaceAll("/$","")+"/api/v1/auth/google/callback").build()));
    }
    public boolean configured(){return registrations!=null;}
    public void configure(HttpSecurity http)throws Exception{
        if(!configured())return;
        var delegate=new DefaultOAuth2AuthorizationRequestResolver(registrations,"/api/v1/auth/google/authorize");delegate.setAuthorizationRequestCustomizer(OAuth2AuthorizationRequestCustomizers.withPkce());
        var resolver=new OAuth2AuthorizationRequestResolver(){
            public org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest resolve(HttpServletRequest request){return customize(request,delegate.resolve(request));}
            public org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest resolve(HttpServletRequest request,String id){return customize(request,delegate.resolve(request,id));}
            private org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest customize(HttpServletRequest request,org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest value){
                if(value==null)return null;var session=request.getSession(false);if(session==null||session.getAttribute("googleAttempt")==null)return null;
                var builder=org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest.from(value);
                if("reauth".equals(session.getAttribute("googlePurpose")))builder.additionalParameters(params->{params.put("max_age","0");params.put("prompt","login");});
                return builder.build();
            }
        };
        // Authorization tokens are needed only for identity verification, never stored as a provider session.
        var discardTokens=new OAuth2AuthorizedClientRepository(){
            public <T extends org.springframework.security.oauth2.client.OAuth2AuthorizedClient>T loadAuthorizedClient(String id,org.springframework.security.core.Authentication auth,HttpServletRequest request){return null;}
            public void saveAuthorizedClient(org.springframework.security.oauth2.client.OAuth2AuthorizedClient client,org.springframework.security.core.Authentication auth,HttpServletRequest request,HttpServletResponse response){}
            public void removeAuthorizedClient(String id,org.springframework.security.core.Authentication auth,HttpServletRequest request,HttpServletResponse response){}
        };
        http.oauth2Login(o->o.clientRegistrationRepository(registrations).authorizedClientRepository(discardTokens).loginPage("/api/v1/auth/google/unavailable")
            .authorizationEndpoint(a->a.authorizationRequestResolver(resolver)).redirectionEndpoint(r->r.baseUri("/api/v1/auth/google/callback"))
            .successHandler((request,response,authentication)->{
                try {
                    var session=request.getSession(false);Object id=session==null?null:session.getAttribute("googleAttempt");if(!(id instanceof UUID attempt))throw new ApiException(422,"INVALID_OAUTH_STATE");
                    String bound=(String)session.getAttribute("googleBoundUser");String purpose=(String)session.getAttribute("googlePurpose");long started=(Long)session.getAttribute("googleStartedAt");
                    var principal=(OidcUser)authentication.getPrincipal();
                    if("reauth".equals(purpose)&&(principal.getIdToken().getAuthenticatedAt()==null||principal.getIdToken().getAuthenticatedAt().toEpochMilli()<started-1000))throw new ApiException(422,"GOOGLE_REAUTH_REQUIRED");
                    if("link".equals(purpose)){Object at=session.getAttribute("reauthenticatedAt");if(!(at instanceof Long time)||clock.millis()-time>=300000)throw new ApiException(403,"REAUTHENTICATION_REQUIRED");}
                    var result=accounts.complete(attempt,bound==null||bound.isEmpty()?null:UUID.fromString(bound),principal.getSubject(),principal.getEmail(),principal.getEmailVerified(),principal.getFullName());
                    session.removeAttribute("googleAttempt");session.removeAttribute("googleBoundUser");session.removeAttribute("googlePurpose");session.removeAttribute("googleStartedAt");
                    sessions.establish(result.account(),result.reauthenticated(),request,response);response.setStatus(303);response.setHeader("Location",result.returnTo());
                }catch(Exception e){failure(request,response);}
            }).failureHandler((request,response,error)->failure(request,response)));
    }
    private void failure(HttpServletRequest request,HttpServletResponse response){
        if(request.getSession(false)!=null)request.getSession(false).invalidate();org.springframework.security.core.context.SecurityContextHolder.clearContext();response.setStatus(303);response.setHeader("Location","/giris?error=google");
    }
}
