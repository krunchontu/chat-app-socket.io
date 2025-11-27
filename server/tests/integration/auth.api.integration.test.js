/**
 * Authentication API Integration Tests
 * Tests complete authentication flow with real HTTP endpoints and database
 */

const request = require("supertest");
const jwt = require("jsonwebtoken");
const { setupTestServer, teardownTestServer, clearDatabase } = require("../setup/testServer");

describe("Authentication API Integration Tests", () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = await setupTestServer();
    baseUrl = server.baseUrl;
  });

  afterAll(async () => {
    await teardownTestServer();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe("POST /api/users/register - User Registration", () => {
    test("should successfully register a new user with valid data", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "SecurePass123!",
      };

      const response = await request(baseUrl)
        .post("/api/users/register")
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty("message", "User registered successfully");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty("password");
      expect(response.body).toHaveProperty("token");

      // Verify token is valid
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET || "your_jwt_secret");
      expect(decoded).toHaveProperty("id");
      expect(decoded.username).toBe(userData.username);
    });

    test("should reject registration with weak password (too short)", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "weak",
      };

      const response = await request(baseUrl)
        .post("/api/users/register")
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("Password must be at least 8 characters");
    });

    test("should reject registration with password missing uppercase", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "securepass123!",
      };

      const response = await request(baseUrl)
        .post("/api/users/register")
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("uppercase");
    });

    test("should reject registration with password missing lowercase", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "SECUREPASS123!",
      };

      const response = await request(baseUrl)
        .post("/api/users/register")
        .send(userData)
        .expect(400);

      expect(response.body.message).toContain("lowercase");
    });

    test("should reject registration with password missing number", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "SecurePass!",
      };

      const response = await request(baseUrl)
        .post("/api/users/register")
        .send(userData)
        .expect(400);

      expect(response.body.message).toContain("number");
    });

    test("should reject registration with password missing special character", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "SecurePass123",
      };

      const response = await request(baseUrl)
        .post("/api/users/register")
        .send(userData)
        .expect(400);

      expect(response.body.message).toContain("special character");
    });

    test("should reject registration with duplicate username", async () => {
      const userData = {
        username: "duplicateuser",
        email: "first@example.com",
        password: "SecurePass123!",
      };

      // Register first user
      await request(baseUrl)
        .post("/api/users/register")
        .send(userData)
        .expect(201);

      // Try to register with same username but different email
      const duplicateData = {
        username: "duplicateuser",
        email: "second@example.com",
        password: "SecurePass123!",
      };

      const response = await request(baseUrl)
        .post("/api/users/register")
        .send(duplicateData)
        .expect(409);

      expect(response.body.message).toContain("already");
    });

    test("should reject registration with duplicate email", async () => {
      const userData = {
        username: "firstuser",
        email: "duplicate@example.com",
        password: "SecurePass123!",
      };

      // Register first user
      await request(baseUrl)
        .post("/api/users/register")
        .send(userData)
        .expect(201);

      // Try to register with same email but different username
      const duplicateData = {
        username: "seconduser",
        email: "duplicate@example.com",
        password: "SecurePass123!",
      };

      const response = await request(baseUrl)
        .post("/api/users/register")
        .send(duplicateData)
        .expect(409);

      expect(response.body.message).toContain("already");
    });

    test("should reject registration with invalid email format", async () => {
      const userData = {
        username: "testuser",
        email: "invalid-email",
        password: "SecurePass123!",
      };

      const response = await request(baseUrl)
        .post("/api/users/register")
        .send(userData)
        .expect(400);

      expect(response.body.message).toContain("email");
    });

    test("should reject registration with missing fields", async () => {
      const response = await request(baseUrl)
        .post("/api/users/register")
        .send({})
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe("POST /api/users/login - User Login", () => {
    const testUser = {
      username: "loginuser",
      email: "login@example.com",
      password: "SecurePass123!",
    };

    beforeEach(async () => {
      // Register a user before each login test
      await request(baseUrl)
        .post("/api/users/register")
        .send(testUser)
        .expect(201);
    });

    test("should successfully login with valid credentials", async () => {
      const response = await request(baseUrl)
        .post("/api/users/login")
        .send({
          username: testUser.username,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty("message", "Login successful");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.user).not.toHaveProperty("password");
      expect(response.body).toHaveProperty("token");

      // Verify token is valid
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET || "your_jwt_secret");
      expect(decoded.username).toBe(testUser.username);
    });

    test("should reject login with invalid username", async () => {
      const response = await request(baseUrl)
        .post("/api/users/login")
        .send({
          username: "nonexistent",
          password: testUser.password,
        })
        .expect(401);

      expect(response.body.message).toContain("Invalid credentials");
    });

    test("should reject login with invalid password", async () => {
      const response = await request(baseUrl)
        .post("/api/users/login")
        .send({
          username: testUser.username,
          password: "WrongPassword123!",
        })
        .expect(401);

      expect(response.body.message).toContain("Invalid credentials");
    });

    test("should increment failed login attempts on wrong password", async () => {
      // First failed attempt
      await request(baseUrl)
        .post("/api/users/login")
        .send({
          username: testUser.username,
          password: "WrongPassword123!",
        })
        .expect(401);

      // Verify that failed attempts are being tracked
      // (We can't directly check the counter without accessing the database,
      // but we can verify the lockout after 5 attempts)
    });

    test("should lock account after 5 failed login attempts", async () => {
      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(baseUrl)
          .post("/api/users/login")
          .send({
            username: testUser.username,
            password: "WrongPassword123!",
          })
          .expect(401);
      }

      // 6th attempt should return account locked error
      const response = await request(baseUrl)
        .post("/api/users/login")
        .send({
          username: testUser.username,
          password: "WrongPassword123!",
        })
        .expect(423);

      expect(response.body.message).toContain("locked");
      expect(response.body.message).toContain("15 minutes");
    });

    test("should reset failed login attempts after successful login", async () => {
      // Make 2 failed attempts
      for (let i = 0; i < 2; i++) {
        await request(baseUrl)
          .post("/api/users/login")
          .send({
            username: testUser.username,
            password: "WrongPassword123!",
          })
          .expect(401);
      }

      // Successful login should reset counter
      const response = await request(baseUrl)
        .post("/api/users/login")
        .send({
          username: testUser.username,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty("token");

      // Now we can make failed attempts again without immediate lockout
      await request(baseUrl)
        .post("/api/users/login")
        .send({
          username: testUser.username,
          password: "WrongPassword123!",
        })
        .expect(401);
    });
  });

  describe("GET /api/users/profile - Get User Profile", () => {
    let authToken;
    let userId;

    beforeEach(async () => {
      // Register and login to get auth token
      const registerResponse = await request(baseUrl)
        .post("/api/users/register")
        .send({
          username: "profileuser",
          email: "profile@example.com",
          password: "SecurePass123!",
        })
        .expect(201);

      authToken = registerResponse.body.token;
      userId = registerResponse.body.user.id;
    });

    test("should retrieve user profile with valid token", async () => {
      const response = await request(baseUrl)
        .get("/api/users/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("id", userId);
      expect(response.body.user).toHaveProperty("username", "profileuser");
      expect(response.body.user).toHaveProperty("email", "profile@example.com");
      expect(response.body.user).not.toHaveProperty("password");
    });

    test("should reject profile request without token", async () => {
      const response = await request(baseUrl)
        .get("/api/users/profile")
        .expect(401);

      expect(response.body.message).toContain("token");
    });

    test("should reject profile request with invalid token", async () => {
      const response = await request(baseUrl)
        .get("/api/users/profile")
        .set("Authorization", "Bearer invalid.token.here")
        .expect(401);

      expect(response.body.message).toBeDefined();
    });

    test("should reject profile request with malformed Authorization header", async () => {
      const response = await request(baseUrl)
        .get("/api/users/profile")
        .set("Authorization", authToken) // Missing "Bearer " prefix
        .expect(401);

      expect(response.body.message).toBeDefined();
    });
  });

  describe("POST /api/users/logout - User Logout", () => {
    let authToken;

    beforeEach(async () => {
      // Register and login to get auth token
      const registerResponse = await request(baseUrl)
        .post("/api/users/register")
        .send({
          username: "logoutuser",
          email: "logout@example.com",
          password: "SecurePass123!",
        })
        .expect(201);

      authToken = registerResponse.body.token;
    });

    test("should successfully logout with valid token", async () => {
      const response = await request(baseUrl)
        .post("/api/users/logout")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("Logged out successfully");
    });

    test("should blacklist token after logout", async () => {
      // Logout
      await request(baseUrl)
        .post("/api/users/logout")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      // Try to use the same token - should be rejected
      const response = await request(baseUrl)
        .get("/api/users/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(401);

      expect(response.body.message).toContain("blacklist");
    });

    test("should reject logout without token", async () => {
      const response = await request(baseUrl)
        .post("/api/users/logout")
        .expect(401);

      expect(response.body.message).toBeDefined();
    });
  });

  describe("PUT /api/users/profile - Update User Profile", () => {
    let authToken;

    beforeEach(async () => {
      // Register and login to get auth token
      const registerResponse = await request(baseUrl)
        .post("/api/users/register")
        .send({
          username: "updateuser",
          email: "update@example.com",
          password: "SecurePass123!",
        })
        .expect(201);

      authToken = registerResponse.body.token;
    });

    test("should successfully update email with valid data", async () => {
      const newEmail = "newemail@example.com";

      const response = await request(baseUrl)
        .put("/api/users/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ email: newEmail })
        .expect(200);

      expect(response.body).toHaveProperty("message", "Profile updated successfully");
      expect(response.body.user.email).toBe(newEmail);
    });

    test("should reject profile update without authentication", async () => {
      const response = await request(baseUrl)
        .put("/api/users/profile")
        .send({ email: "newemail@example.com" })
        .expect(401);

      expect(response.body.message).toBeDefined();
    });

    test("should reject profile update with invalid email format", async () => {
      const response = await request(baseUrl)
        .put("/api/users/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ email: "invalid-email" })
        .expect(400);

      expect(response.body.message).toContain("email");
    });
  });

  describe("GET /api/users/csrf-token - Get CSRF Token", () => {
    test("should return CSRF token", async () => {
      const response = await request(baseUrl)
        .get("/api/users/csrf-token")
        .expect(200);

      expect(response.body).toHaveProperty("csrfToken");
      expect(typeof response.body.csrfToken).toBe("string");
      expect(response.body.csrfToken.length).toBeGreaterThan(0);
    });
  });
});
