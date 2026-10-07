package com.satir.media.infrastructure;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Private file store outside the web root. Names are server-generated random keys; user input
 * never reaches a path. Writes go through a temp file and an atomic move.
 */
@Component
public class MediaStorage {

    private final Path root;

    MediaStorage(@Value("${satir.media.root}") String root) {
        this.root = Path.of(root).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.root);
        } catch (IOException e) {
            throw new UncheckedIOException("Media directory is not writable: " + this.root, e);
        }
    }

    public String newKey(String extension) {
        String id = UUID.randomUUID().toString();
        return id.substring(0, 2) + "/" + id + "." + extension;
    }

    public void write(String key, byte[] bytes) {
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Path temp = Files.createTempFile(target.getParent(), ".upload-", ".tmp");
            Files.write(temp, bytes);
            Files.move(temp, target, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException e) {
            throw new UncheckedIOException("Media write failed", e);
        }
    }

    public Path path(String key) {
        return resolve(key);
    }

    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException e) {
            throw new UncheckedIOException("Media delete failed", e);
        }
    }

    private Path resolve(String key) {
        Path path = root.resolve(key).normalize();
        if (!path.startsWith(root)) {
            throw new IllegalArgumentException("Invalid storage key");
        }
        return path;
    }
}
