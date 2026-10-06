package com.satir.editorial.api;
import com.satir.editorial.application.ArticleService;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/studio/article-stats")
public class ArticleStatsController {
 private final ArticleService articles;
 public ArticleStatsController(ArticleService articles){this.articles=articles;}
 @GetMapping public Object list(@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="20")int size){return articles.ownerStats(page,size);}
}
