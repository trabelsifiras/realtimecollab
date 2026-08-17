package com.collab;

import com.collab.auth.dto.AuthResponse;
import com.collab.auth.dto.LoginRequest;
import com.collab.auth.dto.RegisterRequest;
import com.collab.project.dto.ProjectRequest;
import com.collab.project.dto.ProjectResponse;
import com.collab.task.domain.TaskStatus;
import com.collab.task.dto.TaskRequest;
import com.collab.task.dto.TaskResponse;
import com.collab.task.dto.UpdateTaskStatusRequest;
import com.collab.workspace.dto.WorkspaceRequest;
import com.collab.workspace.dto.WorkspaceResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end integration test covering register -> workspace -> project -> task
 * against a real PostgreSQL database (Testcontainers).
 * Run with: mvn verify (requires Docker).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers(disabledWithoutDocker = true)
class AuthFlowIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void fullUserJourney() {
        String username = "user" + UUID.randomUUID().toString().substring(0, 8);
        String email = username + "@example.com";

        RegisterRequest register = new RegisterRequest(email, username, "Test", "User", "password123");
        ResponseEntity<AuthResponse> registerResponse = restTemplate.postForEntity(
                "/api/v1/auth/register", register, AuthResponse.class);

        assertThat(registerResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(registerResponse.getBody()).isNotNull();
        assertThat(registerResponse.getBody().accessToken()).isNotBlank();

        String token = registerResponse.getBody().accessToken();
        HttpHeaders headers = authHeaders(token);

        WorkspaceRequest workspaceRequest = new WorkspaceRequest("Acme Corp", "Integration workspace");
        ResponseEntity<WorkspaceResponse> workspaceResponse = restTemplate.exchange(
                "/api/v1/workspaces", HttpMethod.POST, new HttpEntity<>(workspaceRequest, headers), WorkspaceResponse.class);
        assertThat(workspaceResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        UUID workspaceId = workspaceResponse.getBody().id();

        ProjectRequest projectRequest = new ProjectRequest("Website", null, "WEB", null);
        ResponseEntity<ProjectResponse> projectResponse = restTemplate.exchange(
                "/api/v1/workspaces/" + workspaceId + "/projects", HttpMethod.POST,
                new HttpEntity<>(projectRequest, headers), ProjectResponse.class);
        assertThat(projectResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        UUID projectId = projectResponse.getBody().id();

        TaskRequest taskRequest = new TaskRequest("Implement login", null, null, null, null, null,
                null, null, null, null, null, null, null, null);
        ResponseEntity<TaskResponse> taskResponse = restTemplate.exchange(
                "/api/v1/projects/" + projectId + "/tasks", HttpMethod.POST,
                new HttpEntity<>(taskRequest, headers), TaskResponse.class);
        assertThat(taskResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(taskResponse.getBody().status()).isEqualTo(TaskStatus.TODO);
        assertThat(taskResponse.getBody().key()).isEqualTo("WEB-1");

        UUID taskId = taskResponse.getBody().id();
        Long version = taskResponse.getBody().version();

        UpdateTaskStatusRequest statusRequest = new UpdateTaskStatusRequest(TaskStatus.IN_PROGRESS, version);
        ResponseEntity<TaskResponse> statusResponse = restTemplate.exchange(
                "/api/v1/tasks/" + taskId + "/status", HttpMethod.PATCH,
                new HttpEntity<>(statusRequest, headers), TaskResponse.class);
        assertThat(statusResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(statusResponse.getBody().status()).isEqualTo(TaskStatus.IN_PROGRESS);

        // Stale version must be rejected with 409
        UpdateTaskStatusRequest stale = new UpdateTaskStatusRequest(TaskStatus.DONE, version);
        ResponseEntity<String> conflict = restTemplate.exchange(
                "/api/v1/tasks/" + taskId + "/status", HttpMethod.PATCH,
                new HttpEntity<>(stale, headers), String.class);
        assertThat(conflict.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void unauthorizedUserCannotAccessTasks() {
        ResponseEntity<String> response = restTemplate.getForEntity(
                "/api/v1/projects/" + UUID.randomUUID() + "/tasks", String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    private HttpHeaders authHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }
}
