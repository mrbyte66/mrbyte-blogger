package com.satir.reading.domain;

import com.satir.platform.ApiException;
import java.util.*;
import java.util.function.Function;

public record AnnotationInput(String kind,UUID revisionId,List<Fragment> fragments,String note) {
    public record Fragment(String blockId,int start,int end,String quote,String before,String after){}
    public void validate(Function<String,String> anchorText){
        if(kind==null||!Set.of("highlight","underline","note").contains(kind)||revisionId==null||note==null||note.length()>4000||fragments==null||fragments.isEmpty()||fragments.size()>30||kind.equals("note")&&note.isBlank())invalid();
        int length=0;
        for(var fragment:fragments){
            if(fragment==null||fragment.blockId()==null||fragment.quote()==null||fragment.before()==null||fragment.after()==null||fragment.before().length()>48||fragment.after().length()>48)invalid();
            String text=anchorText.apply(fragment.blockId());if(text==null||fragment.start()<0||fragment.end()<=fragment.start()||fragment.end()>text.length())invalid();
            // Java String and browser Range offsets both use UTF-16 code units.
            if(!text.substring(fragment.start(),fragment.end()).equals(fragment.quote())||!text.substring(0,fragment.start()).endsWith(fragment.before())||!text.substring(fragment.end()).startsWith(fragment.after()))invalid();
            length+=fragment.quote().length();if(length>12000)invalid();
        }
    }
    private static void invalid(){throw new ApiException(422,"INVALID_ANNOTATION");}
}
