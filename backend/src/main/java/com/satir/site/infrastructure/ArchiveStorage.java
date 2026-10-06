package com.satir.site.infrastructure;
import com.satir.platform.ApiException;
import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
@Component
public class ArchiveStorage {
 private final Path root;
 public ArchiveStorage(@Value("${satir.archive-root:./var/archives}")String directory){root=Path.of(directory).toAbsolutePath().normalize();if(java.util.stream.StreamSupport.stream(root.spliterator(),false).anyMatch(p->p.toString().equals("public")))throw new IllegalStateException("Archive directory must be private");}
 private Path path(UUID id)throws IOException{for(Path p=root;p!=null;p=p.getParent())if(Files.isSymbolicLink(p))throw new IOException("Unsafe directory");Files.createDirectories(root);return root.resolve(id+".zip");}
 public void write(UUID id,byte[] bytes){try{Path target=path(id);Path temp=Files.createTempFile(root,".archive-",".tmp");try{Files.write(temp,bytes);Files.move(temp,target,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);}finally{Files.deleteIfExists(temp);}}catch(IOException e){throw new ApiException(503,"ARCHIVE_STORAGE_UNAVAILABLE");}}
 public Path read(UUID id){try{Path target=path(id);if(!Files.isRegularFile(target,LinkOption.NOFOLLOW_LINKS))throw new IOException("Missing archive");return target;}catch(IOException e){throw new ApiException(503,"ARCHIVE_STORAGE_UNAVAILABLE");}}
 public byte[] bytes(UUID id){try{return Files.readAllBytes(read(id));}catch(IOException e){throw new ApiException(503,"ARCHIVE_STORAGE_UNAVAILABLE");}}
 public void delete(UUID id){try{Files.deleteIfExists(path(id));}catch(IOException e){throw new ApiException(503,"ARCHIVE_STORAGE_UNAVAILABLE");}}
}
