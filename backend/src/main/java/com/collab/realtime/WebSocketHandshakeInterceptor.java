package com.collab.realtime;

import com.collab.common.security.JwtService;
import com.collab.common.security.UserPrincipal;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;
import java.util.UUID;

public class WebSocketHandshakeInterceptor implements HandshakeInterceptor {

    private static final String USER_ID_ATTR = "userId";

    private final JwtService jwtService;

    public WebSocketHandshakeInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        String token = extractToken(request);
        if (token == null || !jwtService.isValidAccessToken(token)) {
            return false;
        }
        UserPrincipal principal = jwtService.parseAccessToken(token);
        attributes.put(USER_ID_ATTR, principal.id());
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // no-op
    }

    private String extractToken(ServerHttpRequest request) {
        var params = UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams();
        String token = params.getFirst("token");
        if (token == null) {
            token = params.getFirst("access_token");
        }
        if (token != null && !token.isBlank()) {
            return token;
        }
        var headers = request.getHeaders().get("Authorization");
        if (headers != null && !headers.isEmpty()) {
            String header = headers.get(0);
            if (header.startsWith("Bearer ")) {
                return header.substring(7);
            }
        }
        return null;
    }

    public static String userIdAttribute() {
        return USER_ID_ATTR;
    }
}
