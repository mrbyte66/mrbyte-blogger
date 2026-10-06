package com.satir.media.infrastructure;
import com.satir.media.application.CoverProvider;
import com.satir.platform.ApiException;
import java.net.*;
import java.net.http.*;
import java.io.*;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
/** Fixed provider endpoints only; never a general URL downloader. No credentials in errors. */
@Component
public class PexelsCoverProvider implements CoverProvider {
 private final String provider,key;private final ObjectMapper mapper;
 private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build();
 public PexelsCoverProvider(@Value("${COVER_PROVIDER:}")String provider,@Value("${PEXELS_API_KEY:}")String key,ObjectMapper mapper){this.provider=provider;this.key=key;this.mapper=mapper;if(!provider.isBlank()&&!provider.equals("pexels"))throw new IllegalStateException("Unsupported cover provider");}
 public boolean configured(){return provider.equals("pexels")&&!key.isBlank();}
 public List<Photo> search(String query){
 if(!configured())throw new ApiException(503,"COVER_PROVIDER_UNAVAILABLE");
 try {
 URI search=URI.create("https://api.pexels.com/v1/search?orientation=landscape&per_page=3&query="+URLEncoder.encode(query,java.nio.charset.StandardCharsets.UTF_8));
 var data=mapper.readTree(get(search,"api.pexels.com",2*1024*1024,true));var photos=data.get("photos");if(photos==null||!photos.isArray())throw new IOException("Invalid provider result");var result=new ArrayList<Photo>();
 for(var photo:photos){if(result.size()>=3)break;String id=photo.path("id").asText(),source=photo.path("url").asText(),photographer=photo.path("photographer").asText();if(!id.matches("[0-9]{1,30}")||photographer.length()>200)throw new IOException("Invalid attribution");safe(URI.create(source),"www.pexels.com");URI image=URI.create(photo.path("src").path("landscape").asText());result.add(new Photo(id,source,photographer,"https://www.pexels.com/license/",get(image,"images.pexels.com",10*1024*1024,false)));}
 return result;
 }catch(Exception e){if(e instanceof InterruptedException)Thread.currentThread().interrupt();throw new ApiException(503,"COVER_PROVIDER_FAILED");}
 }
 static void safe(URI uri,String host)throws IOException {
 if(!"https".equals(uri.getScheme())||!host.equals(uri.getHost())||uri.getRawUserInfo()!=null||uri.getFragment()!=null||uri.getPort()!=-1&&uri.getPort()!=443)throw new IOException("Untrusted provider URL");
 }
 private byte[] get(URI uri,String host,int max,boolean authenticated)throws Exception {
 safe(uri,host);for(var address:InetAddress.getAllByName(host)){byte[] raw=address.getAddress();if(address.isAnyLocalAddress()||address.isLoopbackAddress()||address.isLinkLocalAddress()||address.isSiteLocalAddress()||address.isMulticastAddress()||raw.length==16&&(raw[0]&0xfe)==0xfc)throw new IOException("Private provider address");}
 var request=HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(15)).GET();if(authenticated)request.header("Authorization",key);
 var response=client.send(request.build(),HttpResponse.BodyHandlers.ofInputStream());try(var body=response.body()){if(response.statusCode()!=200)throw new IOException("Provider unavailable");byte[] bytes=body.readNBytes(max+1);if(bytes.length>max)throw new IOException("Provider response too large");return bytes;}
 }
}
