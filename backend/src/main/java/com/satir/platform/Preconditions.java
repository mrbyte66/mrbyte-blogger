package com.satir.platform;

public final class Preconditions {
    private Preconditions(){}
    public static long version(String value) {
        if(value==null)throw new ApiException(428,"PRECONDITION_REQUIRED");
        if(!value.matches("\"[0-9]{1,18}\""))throw new ApiException(422,"INVALID_VERSION");
        return Long.parseLong(value.substring(1,value.length()-1));
    }
}
