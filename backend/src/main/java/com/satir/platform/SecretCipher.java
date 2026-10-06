package com.satir.platform;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class SecretCipher {
    private final byte[] key;
    public SecretCipher(@Value("${TOKEN_ENCRYPTION_KEY:}") String value) {
        try { key=value.isBlank()?null:Base64.getDecoder().decode(value); }
        catch(IllegalArgumentException e) { throw new IllegalStateException("TOKEN_ENCRYPTION_KEY must be base64"); }
        if(key!=null&&key.length!=32) throw new IllegalStateException("TOKEN_ENCRYPTION_KEY must encode 32 bytes");
    }
    public boolean configured() { return key!=null; }
    public byte[] encrypt(String text,String context) {
        if(key==null) throw new ApiException(503,"TOKEN_ENCRYPTION_NOT_CONFIGURED");
        try {
            byte[] nonce=new byte[12];new SecureRandom().nextBytes(nonce);
            var cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,nonce));cipher.updateAAD(context.getBytes(StandardCharsets.UTF_8));
            byte[] encrypted=cipher.doFinal(text.getBytes(StandardCharsets.UTF_8));return ByteBuffer.allocate(12+encrypted.length).put(nonce).put(encrypted).array();
        } catch(java.security.GeneralSecurityException e) { throw new IllegalStateException("Encryption unavailable"); }
    }
    public String decrypt(byte[] data,String context) {
        try { var buffer=ByteBuffer.wrap(data);byte[] nonce=new byte[12];buffer.get(nonce);byte[] encrypted=new byte[buffer.remaining()];buffer.get(encrypted);
            var cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,nonce));cipher.updateAAD(context.getBytes(StandardCharsets.UTF_8));
            return new String(cipher.doFinal(encrypted),StandardCharsets.UTF_8);
        } catch(java.security.GeneralSecurityException|RuntimeException e) { throw new IllegalStateException("Encrypted delivery secret unavailable"); }
    }
}
