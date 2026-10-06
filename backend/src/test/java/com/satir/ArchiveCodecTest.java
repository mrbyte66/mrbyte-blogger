package com.satir;
import com.satir.site.application.*;
import com.satir.site.domain.ThemeDocument;
import com.satir.platform.ApiException;
import java.io.*;
import java.time.Instant;
import java.util.*;
import java.util.zip.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class ArchiveCodecTest {
 private final ArchiveCodec codec=new ArchiveCodec(new tools.jackson.databind.ObjectMapper());
 private ArchiveManifest manifest(){return new ArchiveManifest(1,Instant.parse("2026-10-05T00:00:00Z"),List.of(),List.of(),List.of(),new ThemeDocument(1,"Theme","SATIR","mint","modern","paper","reading","airy",List.of()),List.of());}
 @Test void minimalDomainArchiveRoundTripsWithoutAccountData(){var encoded=codec.encode(manifest(),Map.of());var decoded=codec.decode(encoded);assertThat(decoded.manifest().schemaVersion()).isEqualTo(1);assertThat(decoded.media()).isEmpty();}
 @Test void rejectsTraversalUnexpectedFilesAndDirectories()throws Exception {for(String name:List.of("../manifest.json","/manifest.json",".env","script.sh","media/")){var out=new ByteArrayOutputStream();try(var zip=new ZipOutputStream(out)){zip.putNextEntry(new ZipEntry(name));zip.write("untrusted".getBytes());zip.closeEntry();}assertThatThrownBy(()->codec.decode(out.toByteArray())).isInstanceOf(ApiException.class);}}
 @Test void verifiesDeclaredMediaHashes(){UUID id=UUID.randomUUID();String path="media/"+id+".png";var m=new ArchiveManifest(1,manifest().exportedAt(),List.of(),List.of(),List.of(),manifest().theme(),List.of(new ArchiveManifest.Media(id,path,"invalid",null)));assertThatThrownBy(()->codec.decode(codec.encode(m,Map.of(path,new byte[]{1,2})))).isInstanceOf(ApiException.class);}
 @Test void rejectsUnixSymlink()throws Exception{var out=new ByteArrayOutputStream();try(var zip=new org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream(out)){var entry=new org.apache.commons.compress.archivers.zip.ZipArchiveEntry("manifest.json");entry.setUnixMode(0120777);zip.putArchiveEntry(entry);zip.write("/etc/passwd".getBytes());zip.closeArchiveEntry();}assertThatThrownBy(()->codec.decode(out.toByteArray())).isInstanceOf(ApiException.class);}
 @Test void rejectsUnlistedMedia()throws Exception{UUID id=UUID.randomUUID();var out=new ByteArrayOutputStream();try(var zip=new ZipOutputStream(out)){zip.putNextEntry(new ZipEntry("manifest.json"));zip.write(new tools.jackson.databind.ObjectMapper().writeValueAsBytes(manifest()));zip.closeEntry();zip.putNextEntry(new ZipEntry("media/"+id+".png"));zip.write(new byte[]{1});zip.closeEntry();}assertThatThrownBy(()->codec.decode(out.toByteArray())).isInstanceOf(ApiException.class);}
}
