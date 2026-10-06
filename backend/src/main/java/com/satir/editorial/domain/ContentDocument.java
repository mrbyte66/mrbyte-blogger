package com.satir.editorial.domain;

import com.satir.platform.ApiException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public record ContentDocument(int schemaVersion,List<Map<String,Object>> blocks) {
    public void validate(){
        if(schemaVersion!=1||blocks==null||blocks.size()>500)invalid();
        var ids=new java.util.HashSet<UUID>();
        for(var block:blocks){
            if(block==null)invalid();
            try{if(!ids.add(UUID.fromString(String.valueOf(block.get("id")))))invalid();}catch(IllegalArgumentException e){invalid();}
            String type=String.valueOf(block.get("type"));
            Set<String> allowed=switch(type){
                case "paragraph"->Set.of("id","type","text");case "heading"->Set.of("id","type","text","level");case "quote"->Set.of("id","type","text","attribution");case "code"->Set.of("id","type","text","language","caption");case "image"->Set.of("id","type","assetId","alt","caption");case "table"->Set.of("id","type","caption","columns","rows");default->throw new ApiException(422,"INVALID_DOCUMENT");
            };
            if(!allowed.containsAll(block.keySet()))invalid();
            switch(type){
                case "paragraph"->text(block,"text",0,20000);
                case "heading"->{text(block,"text",1,300);if(!Set.of(2,3).contains(block.get("level")))invalid();}
                case "quote"->{text(block,"text",1,4000);text(block,"attribution",0,200);}
                case "code"->{text(block,"text",0,50000);text(block,"caption",0,300);if(!Set.of("plain","java","javascript","typescript","python","sql","bash","css","html","json","yaml","xml").contains(block.get("language")))invalid();}
                case "image"->{text(block,"alt",0,500);text(block,"caption",0,1000);try{UUID.fromString(String.valueOf(block.get("assetId")));}catch(IllegalArgumentException e){invalid();}}
                case "table"->{text(block,"caption",0,300);if(!(block.get("columns") instanceof List<?> columns)||columns.isEmpty()||columns.size()>20)invalid();
                    var columns=(List<?>)block.get("columns");for(var column:columns)if(!(column instanceof String t)||t.length()>200)invalid();
                    if(!(block.get("rows") instanceof List<?> rows)||rows.size()>200)invalid();
                    for(var item:(List<?>)block.get("rows")){if(!(item instanceof List<?> row)||row.size()!=columns.size())invalid();for(var cell:(List<?>)item)if(!(cell instanceof String t)||t.length()>2000)invalid();}}
                default->invalid();
            }
        }
    }
    public boolean hasProse(){return blocks.stream().anyMatch(b->"paragraph".equals(b.get("type"))&&b.get("text") instanceof String text&&!text.isBlank());}
    public String plainText(){return blocks.stream().filter(b->Set.of("paragraph","heading","quote").contains(b.get("type"))).map(b->String.valueOf(b.get("text"))).collect(java.util.stream.Collectors.joining(" "));}
    private static void text(Map<String,Object> block,String key,int min,int max){if(!(block.get(key) instanceof String s)||s.length()<min||s.length()>max)invalid();}
    private static void invalid(){throw new ApiException(422,"INVALID_DOCUMENT");}
}
