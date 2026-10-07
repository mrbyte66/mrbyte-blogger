package com.satir.media.application;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.Collection;
import java.util.HexFormat;
import java.util.Iterator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.media.domain.ImageInspection;
import com.satir.media.infrastructure.MediaRepository;
import com.satir.media.domain.MediaAsset;
import com.satir.media.infrastructure.MediaStorage;
import com.satir.platform.api.ApiException;
import com.satir.platform.audit.AuditLog;
import com.satir.platform.db.IdGenerator;

/**
 * Accepts images, decodes them and re-encodes the pixels so EXIF/metadata and any trailing payload
 * are dropped. Only READY assets can be referenced by content; access is decided per request.
 */
@Service
public class MediaService {

    public record Provenance(String provider, String sourceId, String sourceUrl, String photographer,
            String photographerUrl, String licenseUrl) {
        public static final Provenance UPLOAD = new Provenance("UPLOAD", null, null, null, null, null);
    }

    public record StoredFile(Path path, String mime, long size) {
    }

    private final MediaRepository assets;
    private final MediaStorage storage;
    private final List<MediaReferencePolicy> policies;
    private final IdGenerator ids;
    private final Clock clock;
    private final AuditLog audit;

    MediaService(MediaRepository assets, MediaStorage storage, List<MediaReferencePolicy> policies, IdGenerator ids,
            Clock clock, AuditLog audit) {
        this.assets = assets;
        this.storage = storage;
        this.policies = policies;
        this.ids = ids;
        this.clock = clock;
        this.audit = audit;
    }

    @Transactional
    public MediaAsset store(byte[] bytes, Provenance provenance, UUID ownerId) {
        if (bytes.length == 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "MEDIA_EMPTY", "Dosya boş");
        }
        if (bytes.length > ImageInspection.MAX_BYTES) {
            throw new ApiException(HttpStatus.CONTENT_TOO_LARGE, "MEDIA_TOO_LARGE", "Dosya en fazla 10 MiB olabilir");
        }
        ImageInspection.Format format = ImageInspection.detect(bytes);
        if (format == null) {
            throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "MEDIA_TYPE_UNSUPPORTED", "Yalnız JPEG ve PNG görseller yüklenebilir");
        }
        byte[] clean = reencode(bytes, format);
        BufferedImage dimensions = decode(clean);
        String key = storage.newKey(format.extension);
        storage.write(key, clean);
        MediaAsset asset = new MediaAsset(ids.next(), key, "READY", format.mime, (long) clean.length, dimensions.getWidth(),
                dimensions.getHeight(), sha256(clean), provenance.provider(), provenance.sourceId(),
                provenance.sourceUrl(), provenance.photographer(), provenance.photographerUrl(),
                provenance.licenseUrl(), null, ownerId, clock.instant());
        assets.insert(asset);
        audit.record(ownerId, "MEDIA_STORE", "MEDIA", asset.id(), AuditLog.Outcome.SUCCESS);
        return asset;
    }

    @Transactional(readOnly = true)
    public Optional<MediaAsset> find(UUID id) {
        return assets.find(id);
    }

    /** True when every id exists and is READY. Used by publication validation. */
    @Transactional(readOnly = true)
    public boolean allReady(Collection<UUID> assetIds) {
        if (assetIds.isEmpty()) {
            return true;
        }
        List<MediaAsset> found = assets.findAll(assetIds);
        return found.size() == assetIds.stream().distinct().count() && found.stream().allMatch(a -> "READY".equals(a.state()));
    }

    @Transactional(readOnly = true)
    public List<MediaAsset> findAll(Collection<UUID> assetIds) {
        return assets.findAll(assetIds);
    }

    /** Public read: only assets attached to currently public content; the owner may read everything. */
    @Transactional(readOnly = true)
    public Optional<StoredFile> open(UUID id, boolean owner) {
        return assets.find(id)
                .filter(asset -> "READY".equals(asset.state()))
                .filter(asset -> owner || policies.stream().anyMatch(policy -> policy.isPubliclyReferenced(id)))
                .map(asset -> new StoredFile(storage.path(asset.storageKey()), asset.mime(), asset.sizeBytes()));
    }

    @Transactional
    public void delete(UUID id, UUID ownerId) {
        MediaAsset asset = assets.find(id).orElseThrow(MediaService::notFound);
        if (policies.stream().anyMatch(policy -> policy.isReferenced(id))) {
            throw new ApiException(HttpStatus.CONFLICT, "MEDIA_IN_USE", "Görsel bir içerikte kullanılıyor");
        }
        assets.delete(id);
        storage.delete(asset.storageKey());
        audit.record(ownerId, "MEDIA_DELETE", "MEDIA", id, AuditLog.Outcome.SUCCESS);
    }

    public static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bulunamadı");
    }

    private static byte[] reencode(byte[] bytes, ImageInspection.Format format) {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = ImageIO.getImageReadersByFormatName(format.imageIoName);
            if (!readers.hasNext()) {
                throw decodeFailed();
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                // Check dimensions from the header before allocating pixels (decompression bombs).
                if (!ImageInspection.withinPixelLimit(reader.getWidth(0), reader.getHeight(0))) {
                    throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "MEDIA_TOO_MANY_PIXELS", "Görsel en fazla 20 megapiksel olabilir");
                }
                BufferedImage image = reader.read(0);
                return write(image, format);
            } finally {
                reader.dispose();
            }
        } catch (IOException | RuntimeException e) {
            if (e instanceof ApiException api) {
                throw api;
            }
            throw decodeFailed();
        }
    }

    private static byte[] write(BufferedImage image, ImageInspection.Format format) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        if (format == ImageInspection.Format.PNG) {
            if (!ImageIO.write(image, "png", out)) {
                throw decodeFailed();
            }
            return out.toByteArray();
        }
        BufferedImage rgb = image;
        if (image.getColorModel().hasAlpha() || image.getType() == BufferedImage.TYPE_CUSTOM) {
            rgb = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
            rgb.createGraphics().drawImage(image, 0, 0, java.awt.Color.WHITE, null);
        }
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        try (ImageOutputStream output = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(output);
            ImageWriteParam params = writer.getDefaultWriteParam();
            params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            params.setCompressionQuality(0.9f);
            writer.write(null, new IIOImage(rgb, null, null), params);
        } finally {
            writer.dispose();
        }
        return out.toByteArray();
    }

    private static BufferedImage decode(byte[] bytes) {
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));
            if (image == null) {
                throw decodeFailed();
            }
            return image;
        } catch (IOException e) {
            throw decodeFailed();
        }
    }

    private static ApiException decodeFailed() {
        return new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "MEDIA_DECODE_FAILED", "Görsel okunamadı");
    }

    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
