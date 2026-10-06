package com.satir.media.infrastructure;

import com.satir.platform.ApiException;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.Semaphore;
import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;
import org.springframework.stereotype.Component;

@Component
public class ImageSanitizer {
    private final Semaphore decoding=new Semaphore(1);
    public record Image(byte[] bytes,int width,int height){}
    public Image sanitize(byte[] bytes){return sanitize(bytes,10*1024*1024);}
    public Image archive(byte[] bytes){return sanitize(bytes,20*1024*1024);}
    private Image sanitize(byte[] bytes,int limit){
        if(bytes.length==0||bytes.length>limit)throw new ApiException(413,"IMAGE_TOO_LARGE");if(!decoding.tryAcquire())throw new ApiException(503,"IMAGE_PROCESSOR_BUSY");
        try(var input=new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))){
            var readers=ImageIO.getImageReaders(input);if(!readers.hasNext())throw new ApiException(415,"UNSUPPORTED_IMAGE");var reader=readers.next();
            try{
                if(!Set.of("png","jpeg","jpg","webp").contains(reader.getFormatName().toLowerCase(Locale.ROOT)))throw new ApiException(415,"UNSUPPORTED_IMAGE");
                reader.setInput(input,true,true);int width=reader.getWidth(0),height=reader.getHeight(0);if(width<=0||height<=0||(long)width*height>20_000_000)throw new ApiException(413,"IMAGE_DIMENSIONS_TOO_LARGE");
                if(reader.getNumImages(false)>1)throw new ApiException(415,"ANIMATED_IMAGE_UNSUPPORTED");
                var decoded=reader.read(0);var clean=new BufferedImage(width,height,BufferedImage.TYPE_INT_ARGB);var graphics=clean.createGraphics();try{graphics.drawImage(decoded,0,0,null);}finally{graphics.dispose();decoded.flush();}
                var output=new ByteArrayOutputStream();try{if(!ImageIO.write(clean,"png",output))throw new ApiException(503,"IMAGE_ENCODER_UNAVAILABLE");}finally{clean.flush();}
                if(output.size()>20*1024*1024)throw new ApiException(413,"IMAGE_TOO_LARGE");return new Image(output.toByteArray(),width,height);
            }finally{reader.dispose();}
        }catch(IOException|IllegalArgumentException e){throw new ApiException(422,"INVALID_IMAGE");}finally{decoding.release();}
    }
}
