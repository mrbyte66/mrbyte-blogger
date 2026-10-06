package com.satir.platform;

/** Serializes reference changes and asset deletion within the caller's transaction. */
public interface ContentWriteGuard {
    void acquire();
}
