package com.satir.platform;

public final class ApiException extends RuntimeException {
    private final int status;
    private final String code;
    private final Long retryAfter;
    public ApiException(int status,String code){this(status,code,null);}
    public ApiException(int status,String code,Long retryAfter){super(code);this.status=status;this.code=code;this.retryAfter=retryAfter;}
    public Long retryAfter(){return retryAfter;}
    public int status() { return status; }
    public String code() { return code; }
}
