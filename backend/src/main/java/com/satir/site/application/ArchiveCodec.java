package com.satir.site.application;
import com.satir.platform.ApiException;
import java.io.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.*;
import org.apache.commons.compress.archivers.zip.ZipFile;
import org.apache.commons.compress.utils.SeekableInMemoryByteChannel;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
/** Bounded, allowlisted ZIP reader. Never extracts client paths to the filesystem. */
@Component
public class ArchiveCodec {
 public static final int MAX_COMPRESSED=100*1024*1024, MAX_EXPANDED=200*1024*1024;
 private final ObjectMapper mapper;
 public ArchiveCodec(ObjectMapper mapper){this.mapper=mapper;}
 public record Decoded(ArchiveManifest manifest,Map<String,byte[]> media){}
 public Decoded decode(byte[] bytes){
  if(bytes.length>MAX_COMPRESSED)throw new ApiException(413,"ARCHIVE_TOO_LARGE");
  var entries=new LinkedHashMap<String,byte[]>();long expanded=0;
  try(var channel=new SeekableInMemoryByteChannel(bytes);var zip=ZipFile.builder().setSeekableByteChannel(channel).get()){
   var all=zip.getEntries();while(all.hasMoreElements()){
    var entry=all.nextElement();String name=entry.getName();
    if(entries.size()>=1001||entry.isDirectory()||entry.isUnixSymlink()||!zip.canReadEntryData(entry)||!(name.equals("manifest.json")||name.matches("media/[a-f0-9-]{36}\\.png"))||entries.containsKey(name))invalid();
    long bound=name.equals("manifest.json")?16L*1024*1024:20L*1024*1024;
    if(entry.getSize()<0||entry.getSize()>bound||expanded+entry.getSize()>MAX_EXPANDED)invalid();
    byte[] data;try(var in=zip.getInputStream(entry)){data=in.readNBytes((int)bound+1);}
    if(data.length>bound||data.length!=entry.getSize())invalid();expanded+=data.length;
    if(expanded>MAX_EXPANDED)invalid();entries.put(name,data);
   }
   byte[] json=entries.remove("manifest.json");if(json==null)invalid();var manifest=mapper.readValue(json,ArchiveManifest.class);
   if(manifest.schemaVersion()!=1||manifest.exportedAt()==null||manifest.media()==null||manifest.media().size()>1000)invalid();
   var names=new HashSet<String>();var ids=new HashSet<UUID>();for(var item:manifest.media()){
    if(item==null||item.id()==null||!ids.add(item.id())||!item.path().equals("media/"+item.id()+".png")||!names.add(item.path())||!entries.containsKey(item.path())||!hash(entries.get(item.path())).equals(item.sha256()))invalid();
   }
   if(!names.equals(entries.keySet()))invalid();return new Decoded(manifest,entries);
  }catch(ApiException e){throw e;}catch(Exception e){throw new ApiException(422,"INVALID_ARCHIVE");}
 }
 public byte[] encode(ArchiveManifest manifest,Map<String,byte[]> files){
  try{var out=new ByteArrayOutputStream();long expanded=0;try(var zip=new ZipOutputStream(out)){
   byte[] json=mapper.writeValueAsBytes(manifest);expanded+=json.length;if(json.length>16*1024*1024)throw new ApiException(413,"ARCHIVE_TOO_LARGE");put(zip,"manifest.json",json);
   for(var item:manifest.media()){byte[] file=files.get(item.path());expanded+=file.length;if(expanded>MAX_EXPANDED)throw new ApiException(413,"ARCHIVE_TOO_LARGE");put(zip,item.path(),file);if(out.size()>MAX_COMPRESSED)throw new ApiException(413,"ARCHIVE_TOO_LARGE");}
  }if(out.size()>MAX_COMPRESSED)throw new ApiException(413,"ARCHIVE_TOO_LARGE");return out.toByteArray();}catch(IOException e){throw new IllegalStateException("Archive encoding failed",e);}
 }
 private void put(ZipOutputStream out,String name,byte[] bytes)throws IOException{out.putNextEntry(new ZipEntry(name));out.write(bytes);out.closeEntry();}
 public static String hash(byte[] bytes){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));}catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
 private static void invalid(){throw new ApiException(422,"INVALID_ARCHIVE");}
}
