package com.satir.site.domain;

import com.satir.platform.ApiException;
import java.util.*;

public record ThemeDocument(int schemaVersion,String name,String siteName,String accent,String typography,String surface,String width,String spacing,List<Map<String,Object>> blocks) {
    public void validate(boolean applying){
        if(schemaVersion!=1||name==null||name.isBlank()||name.length()>80||siteName==null||siteName.isBlank()||siteName.length()>40||accent==null||!accent.matches("#[0-9a-fA-F]{6}|mint|violet|amber"))invalid();
        choice(typography,"modern","editorial","mono");choice(surface,"paper","night","warm");choice(width,"reading","wide");choice(spacing,"airy","compact");if(blocks==null||blocks.size()>9)invalid();
        var ids=new HashSet<String>();var kinds=new HashSet<String>();int leads=0;
        for(int position=0;position<blocks.size();position++){
            var b=blocks.get(position);if(b==null||!(b.get("id") instanceof String id)||!id.matches("[a-zA-Z0-9-]{1,80}")||!ids.add(id))invalid();
            if(!(b.get("kind") instanceof String kind)||!kinds.add(kind))invalid();String kind=b.get("kind").toString();
            Set<String> fields=switch(kind){
                case "header"->Set.of("id","kind");case "intro"->Set.of("id","kind","title","description","eyebrow","layout");
                case "scene"->Set.of("id","kind","title","emphasis","description","featuredArticleId","showFeaturedArticle","featuredSeriesId","showFeaturedSeries");
                case "articles"->Set.of("id","kind","title","categoryId","display","loading");case "series"->Set.of("id","kind","title","display");
                case "quote"->Set.of("id","kind","text","attribution","display");case "about"->Set.of("id","kind","title","text");case "projects"->Set.of("id","kind","title");case "footer"->Set.of("id","kind","text");default->throw new ApiException(422,"INVALID_THEME");};
            if(!b.keySet().equals(fields))invalid();
            switch(kind){
                case "header"->{if(position!=0)invalid();}
                case "footer"->{if(position!=blocks.size()-1)invalid();text(b,"text",160);}
                case "intro"->{text(b,"title",160);text(b,"description",2000);text(b,"eyebrow",120);choice(b.get("layout"),"statement","centered","split");leads++;lead(position);}
                case "scene"->{text(b,"title",160);text(b,"emphasis",160);text(b,"description",2000);uuid(b.get("featuredArticleId"));uuid(b.get("featuredSeriesId"));bool(b,"showFeaturedArticle");bool(b,"showFeaturedSeries");leads++;lead(position);}
                case "articles"->{text(b,"title",160);uuid(b.get("categoryId"));choice(b.get("display"),"rows","cards");choice(b.get("loading"),"all","progressive");}
                case "series"->{text(b,"title",160);choice(b.get("display"),"cards","list");}
                case "quote"->{text(b,"text",2000);text(b,"attribution",120);choice(b.get("display"),"band","card");}
                case "about"->{text(b,"title",160);text(b,"text",2000);}
                case "projects"->text(b,"title",160);
                default->{}
            }
        }
        if(leads>1||applying&&kinds.stream().noneMatch(k->!Set.of("header","footer").contains(k)))invalid();
    }
    private void lead(int position){if(position!=(blocks.getFirst().get("kind").equals("header")?1:0))invalid();}
    private static void text(Map<String,Object> block,String name,int max){if(!(block.get(name) instanceof String s)||s.length()>max)invalid();}
    private static void bool(Map<String,Object> b,String name){if(!(b.get(name) instanceof Boolean))invalid();}
    private static void uuid(Object id){if(id==null)return;try{UUID.fromString(id.toString());}catch(IllegalArgumentException e){invalid();}}
    private static void choice(Object value,String... options){if(value==null||!Set.of(options).contains(value))invalid();}
    private static void invalid(){throw new ApiException(422,"INVALID_THEME");}
}
