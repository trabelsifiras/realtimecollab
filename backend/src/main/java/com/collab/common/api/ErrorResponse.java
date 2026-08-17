package com.collab.common.api;

import java.time.Instant;
import java.util.Map;

public record ErrorResponse(
        Instant timestamp,
        int status,
        String code,
        String message,
        String path,
        String resourceId,
        Map<String, String> fieldErrors) {

    public static ErrorResponse of(int status, String code, String message, String path) {
        return new ErrorResponse(Instant.now(), status, code, message, path, null, null);
    }

    public static ErrorResponse of(int status, String code, String message, String path, String resourceId) {
        return new ErrorResponse(Instant.now(), status, code, message, path, resourceId, null);
    }

    public static ErrorResponse of(int status, String code, String message, String path, Map<String, String> fieldErrors) {
        return new ErrorResponse(Instant.now(), status, code, message, path, null, fieldErrors);
    }
}
