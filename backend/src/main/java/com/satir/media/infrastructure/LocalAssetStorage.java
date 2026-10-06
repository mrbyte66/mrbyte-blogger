package com.satir.media.infrastructure;

import com.satir.platform.ApiException;
import java.io.IOException;
import java.nio.file.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class LocalAssetStorage {
    private final Path root;
    public LocalAssetStorage(@Value("${satir.media-root}") String directory) {
        root=Path.of(directory).toAbsolutePath().normalize();
        if(root.getFileName()==null || java.util.stream.StreamSupport.stream(root.spliterator(),false).anyMatch(p->p.toString().equals("public")))
            throw new IllegalStateException("MEDIA_ROOT must be a private directory");
    }
    private Path path(String key) {
        if(!key.matches("[a-f0-9-]{36}\\.png")) throw new ApiException(404,"NOT_FOUND");
        return root.resolve(key);
    }
    private void checkRoot() throws IOException {
        for(Path ancestor=root;ancestor!=null;ancestor=ancestor.getParent())
            if(Files.isSymbolicLink(ancestor)) throw new IOException("Unsafe media directory");
    }
    public void write(String key,byte[] bytes) {
        Path temporary=null;
        try {
            checkRoot(); Files.createDirectories(root); checkRoot();
            temporary=Files.createTempFile(root,".upload-",".tmp");
            Files.write(temporary,bytes,StandardOpenOption.TRUNCATE_EXISTING);
            Files.move(temporary,path(key),StandardCopyOption.ATOMIC_MOVE);
        } catch(IOException e) { throw new ApiException(503,"MEDIA_STORAGE_UNAVAILABLE"); }
        finally { if(temporary!=null) try{Files.deleteIfExists(temporary);}catch(IOException ignored){/* Recovery scans remove abandoned temporary files. */} }
    }
    public Path read(String key) {
        Path file=path(key);
        try { checkRoot(); if(!Files.isRegularFile(file,LinkOption.NOFOLLOW_LINKS)) throw new IOException("Missing asset"); }
        catch(IOException e){throw new ApiException(503,"MEDIA_STORAGE_UNAVAILABLE");}
        return file;
    }
    public void delete(String key) {
        try { checkRoot(); Files.deleteIfExists(path(key)); }
        catch(IOException e){throw new ApiException(503,"MEDIA_STORAGE_UNAVAILABLE");}
    }
}
