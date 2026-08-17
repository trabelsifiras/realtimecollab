package com.collab.task.service;

import org.springframework.core.io.Resource;

/**
 * Result of an attachment download: the binary payload plus the metadata
 * required to build a correct response.
 */
public record TaskAttachmentDownload(
        Resource resource,
        String fileName,
        String contentType,
        Long sizeBytes) {
}
