package com.satir.identity.application;

import com.satir.identity.domain.UserAccount;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Clock;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.stereotype.Service;

@Service
public class BrowserSessions {
    private final Clock clock;private final SecurityContextRepository contexts;
    public BrowserSessions(Clock clock,SecurityContextRepository contexts){this.clock=clock;this.contexts=contexts;}
    public void establish(UserAccount user,boolean reauthenticated,HttpServletRequest request,HttpServletResponse response){
        request.getSession(true);request.changeSessionId();var session=request.getSession();
        // Reauthentication must not extend the existing absolute lifetime.
        if(!reauthenticated||session.getAttribute("authenticatedAt")==null)session.setAttribute("authenticatedAt",clock.millis());
        session.setAttribute("authenticationGeneration",user.authenticationGeneration());session.setMaxInactiveInterval(user.owner()?1800:604800);
        if(reauthenticated)session.setAttribute("reauthenticatedAt",clock.millis());else session.removeAttribute("reauthenticatedAt");
        var authorities=new java.util.ArrayList<SimpleGrantedAuthority>();authorities.add(new SimpleGrantedAuthority("ROLE_"+user.role()));if(user.active())authorities.add(new SimpleGrantedAuthority("VERIFIED"));
        var context=SecurityContextHolder.createEmptyContext();context.setAuthentication(new UsernamePasswordAuthenticationToken(user.id().toString(),null,authorities));SecurityContextHolder.setContext(context);contexts.saveContext(context,request,response);
        new HttpSessionCsrfTokenRepository().saveToken(null,request,response);
    }
}
