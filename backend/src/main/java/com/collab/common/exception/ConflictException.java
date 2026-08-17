package com.collab.common.exception;

import org.springframework.http.HttpStatus;

public class ConflictException extends BusinessException {

    public ConflictException(String code, String message) {
        super(HttpStatus.CONFLICT, code, message);
    }

    public ConflictException(String code, String message, String resourceId) {
        super(HttpStatus.CONFLICT, code, message, resourceId);
    }
}
