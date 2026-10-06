package com.satir.media.application;
import java.util.List;
public interface CoverProvider {
 record Photo(String providerId,String sourceUrl,String photographer,String licenseUrl,byte[] image){}
 boolean configured();
 List<Photo> search(String query);
}
