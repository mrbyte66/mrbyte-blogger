package com.satir.identity.api;
import com.satir.identity.application.AccountService;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/studio/members")
public class MembersController {
 private final AccountService accounts;
 public MembersController(AccountService accounts){this.accounts=accounts;}
 @GetMapping public Object list(@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="20")int size,@RequestParam(required=false)String q){return accounts.members(page,size,q);}
}
