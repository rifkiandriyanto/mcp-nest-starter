# API Responses and HTTP Status Codes

This document outlines the project's philosophy and standards for using HTTP status codes. Adhering to these conventions is crucial for creating a predictable, consistent, and easy-to-use API for any client application.

## The Guiding Principle

**HTTP status codes describe the result of the server's attempt to process the client's request, NOT the result of the application's internal business logic.**

If a request is successfully received, authenticated, authorized, and processed without any server-side errors, the server **MUST** return a `2xx` status code (e.g., `200 OK` or `201 Created`).

The outcome of the business logic (e.g., a correct/incorrect answer, a successful/failed validation) should be communicated within the JSON response body.

### Example: Checking a User's Answer

A perfect illustration of this principle is the `checkAnswer` endpoint.

-   **Scenario**: A user submits an answer to a lesson exercise. The answer is valid but incorrect.
-   **Request**: `POST /lessons/123/check-answer` with body `{"userAnswer": "a wrong answer"}`
-   **Processing**:
    1.  The server receives the request.
    2.  The user is authenticated and authorized.
    3.  The request body is well-formed.
    4.  The server's business logic compares the user's answer to the correct solution and finds it is incorrect.
    5.  The server successfully completes its task of "checking the answer."
-   **Correct Response**:
    -   **Status Code**: `200 OK`
    -   **Response Body**:
        ```json
        {
          "isCorrect": false,
          "solution": "the correct answer"
        }
        ```

-   **Why not `400` or `422`?**: A `4xx` error would imply that the client did something wrong in forming the request. But the request was perfect; the *data* within it simply didn't match the business rule's expectation. The server was able to fully process the request, so the transaction was a success.

## Common Status Codes and Their Meanings

This table lists the primary HTTP status codes used throughout this project and their specific meanings.

| Code | Status | Meaning | When to Use |
| :--- | :--- | :--- | :--- |
| **200** | **OK** | The request was successful, and the server has a response body containing the requested data or the result of an operation. | This is the default success code for `GET`, `PUT`, `PATCH`, and `POST` requests that don't create a new resource. **Used for all business logic operations that complete successfully**, like checking an answer. |
| **201** | **Created** | The request was successful, and a new resource has been created as a result. | Use after a `POST` request that results in the creation of a new entity in the database (e.g., creating a new user, a new course). The response should typically include a `Location` header pointing to the new resource. |
| **204** | **No Content** | The server successfully processed the request but there is no content to return. | Use after a `DELETE` request that successfully removes a resource. |
| **400** | **Bad Request** | The server cannot process the request due to a client-side error. | This is automatically handled by NestJS's `ValidationPipe`. It's used when the request body, query params, or path params fail validation (e.g., missing required fields, incorrect data types). |
| **401** | **Unauthorized** | The client is not authenticated and must log in to access the resource. | This is automatically handled by NestJS `Guards` (e.g., `AuthGuard`). It's returned when a user tries to access a protected endpoint without a valid JWT or API key. |
| **403** | **Forbidden** | The client is authenticated, but does not have the necessary permissions to access the resource. | Use when a user has a valid login but their role or permissions disallow the specific action. For example, a regular user trying to access an admin-only endpoint, or trying to access a locked lesson. |
| **404** | **Not Found** | The server could not find the requested resource. | Throw a `NotFoundException` when a resource with a specific ID (e.g., `/users/999`) does not exist in the database. |
| **500** | **Internal Server Error** | The server encountered an unexpected condition that prevented it from fulfilling the request. | This is the fallback error. NestJS will automatically return this for unhandled exceptions. You should rarely need to throw this manually; prefer more specific exceptions where possible. |

By following these guidelines, we ensure our API is robust, standards-compliant, and easy for client-side developers to integrate with.
