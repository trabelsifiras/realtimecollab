package com.collab.common.util;

import java.text.Normalizer;
import java.util.Locale;
import java.util.UUID;

public final class SlugGenerator {

    private SlugGenerator() {
    }

    public static String toSlug(String input) {
        if (input == null || input.isBlank()) {
            return "workspace";
        }
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        String slug = normalized.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
        if (slug.isBlank()) {
            return "workspace";
        }
        if (slug.length() > 64) {
            slug = slug.substring(0, 64).replaceAll("-+$", "");
        }
        return slug;
    }

    public static String toUniqueSlug(String input) {
        return toSlug(input) + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
