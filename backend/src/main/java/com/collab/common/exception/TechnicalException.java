package com.collab.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Base class for <b>technical</b> (infrastructure) exceptions: unexpected
 * failures that are not caused by the user (I/O, encoding, messaging, etc.).
 * The message is logged server-side only; clients receive a generic
 * {@code INTERNAL_ERROR} response so implementation details are never leaked.
 */
public class TechnicalException extends ApiException {

    public TechnicalException(String message) {
        super(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", message);
    }

    public TechnicalException(String message, Throwable cause) {
        super(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", message, null, cause);
    }
}
