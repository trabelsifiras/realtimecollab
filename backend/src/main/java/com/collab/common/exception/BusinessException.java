package com.collab.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Base class for <b>logic</b> (business/domain) exceptions: expected failures
 * that are caused by user input or business rules, carry a stable error code
 * and a message that is safe to return to the client.
 * <p>
 * Examples: resource not found, invalid state transition, permission denied,
 * optimistic-locking conflicts detected by the domain layer.
 */
public abstract class BusinessException extends ApiException {

    protected BusinessException(HttpStatus status, String code, String message) {
        super(status, code, message);
    }

    protected BusinessException(HttpStatus status, String code, String message, String resourceId) {
        super(status, code, message, resourceId);
    }
}
