package com.collab.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Root of the application's exception hierarchy.
 * <p>
 * Subclasses are split into two families:
 * <ul>
 *   <li>{@link BusinessException} — expected, domain-driven errors (logic).</li>
 *   <li>{@link TechnicalException} — unexpected, infrastructure errors.</li>
 * </ul>
 */
public abstract class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final String resourceId;

    protected ApiException(HttpStatus status, String code, String message) {
        this(status, code, message, null, null);
    }

    protected ApiException(HttpStatus status, String code, String message, String resourceId) {
        this(status, code, message, resourceId, null);
    }

    protected ApiException(HttpStatus status, String code, String message, String resourceId, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.code = code;
        this.resourceId = resourceId;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public String getResourceId() {
        return resourceId;
    }
}
