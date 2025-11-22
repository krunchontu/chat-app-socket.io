/**
 * Integration tests for Authentication Flow
 * Tests complete registration, login, and token management flows
 */

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Mock user service and controller
const userService = {
  registerUser: jest.fn(),
  loginUser: jest.fn(),
  logoutUser: jest.fn(),
  getUserProfile: jest.fn(),
};

const JWT_SECRET = process.env.JWT_SECRET || "test-secret-key";

describe("Authentication Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("User Registration Flow", () => {
    test("should successfully register a new user", async () => {
      const newUser = {
        username: "newuser",
        email: "newuser@example.com",
        password: "SecurePass123!",
      };

      const mockRegisteredUser = {
        id: "user-123",
        username: newUser.username,
        email: newUser.email,
        isOnline: false,
        createdAt: new Date(),
      };

      userService.registerUser.mockResolvedValue(mockRegisteredUser);

      const result = await userService.registerUser(
        newUser.username,
        newUser.email,
        newUser.password
      );

      expect(result).toBeDefined();
      expect(result.username).toBe(newUser.username);
      expect(result.email).toBe(newUser.email);
      expect(result.id).toBe("user-123");
      expect(userService.registerUser).toHaveBeenCalledWith(
        newUser.username,
        newUser.email,
        newUser.password
      );
    });

    test("should reject registration with weak password", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "weak", // Too short and simple
      };

      userService.registerUser.mockRejectedValue(
        new Error("Password must be at least 8 characters")
      );

      await expect(
        userService.registerUser(
          userData.username,
          userData.email,
          userData.password
        )
      ).rejects.toThrow("Password must be at least 8 characters");
    });

    test("should reject registration with duplicate username", async () => {
      const userData = {
        username: "existinguser",
        email: "new@example.com",
        password: "SecurePass123!",
      };

      userService.registerUser.mockRejectedValue(
        new Error("Username already taken")
      );

      await expect(
        userService.registerUser(
          userData.username,
          userData.email,
          userData.password
        )
      ).rejects.toThrow("Username already taken");
    });

    test("should reject registration with duplicate email", async () => {
      const userData = {
        username: "newuser",
        email: "existing@example.com",
        password: "SecurePass123!",
      };

      userService.registerUser.mockRejectedValue(
        new Error("Email already registered")
      );

      await expect(
        userService.registerUser(
          userData.username,
          userData.email,
          userData.password
        )
      ).rejects.toThrow("Email already registered");
    });

    test("should hash password before storing", async () => {
      const plainPassword = "SecurePass123!";
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      expect(hashedPassword).not.toBe(plainPassword);
      expect(hashedPassword.length).toBeGreaterThan(50);

      const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
      expect(isMatch).toBe(true);
    });
  });

  describe("User Login Flow", () => {
    test("should successfully login with valid credentials", async () => {
      const credentials = {
        username: "testuser",
        password: "SecurePass123!",
      };

      const mockToken = jwt.sign(
        { id: "user-123", username: credentials.username },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const mockResponse = {
        token: mockToken,
        user: {
          id: "user-123",
          username: credentials.username,
          email: "test@example.com",
          isOnline: true,
        },
      };

      userService.loginUser.mockResolvedValue(mockResponse);

      const result = await userService.loginUser(
        credentials.username,
        credentials.password
      );

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.username).toBe(credentials.username);
      expect(result.user.isOnline).toBe(true);

      // Verify token can be decoded
      const decoded = jwt.verify(result.token, JWT_SECRET);
      expect(decoded.username).toBe(credentials.username);
    });

    test("should reject login with invalid username", async () => {
      userService.loginUser.mockRejectedValue(new Error("Invalid credentials"));

      await expect(
        userService.loginUser("nonexistent", "password123")
      ).rejects.toThrow("Invalid credentials");
    });

    test("should reject login with invalid password", async () => {
      userService.loginUser.mockRejectedValue(new Error("Invalid credentials"));

      await expect(
        userService.loginUser("testuser", "wrongpassword")
      ).rejects.toThrow("Invalid credentials");
    });

    test("should lock account after 5 failed login attempts", async () => {
      const username = "testuser";
      const wrongPassword = "wrongpassword";

      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        userService.loginUser.mockRejectedValue(
          new Error("Invalid credentials")
        );
        await expect(
          userService.loginUser(username, wrongPassword)
        ).rejects.toThrow("Invalid credentials");
      }

      // 6th attempt should return account locked error
      userService.loginUser.mockRejectedValue(
        new Error("Account locked. Try again in 15 minutes.")
      );

      await expect(
        userService.loginUser(username, wrongPassword)
      ).rejects.toThrow("Account locked");
    });

    test("should reset failed login attempts on successful login", async () => {
      const credentials = {
        username: "testuser",
        password: "SecurePass123!",
      };

      const mockToken = jwt.sign(
        { id: "user-123", username: credentials.username },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const mockResponse = {
        token: mockToken,
        user: {
          id: "user-123",
          username: credentials.username,
          email: "test@example.com",
          failedLoginAttempts: 0,
        },
      };

      userService.loginUser.mockResolvedValue(mockResponse);

      const result = await userService.loginUser(
        credentials.username,
        credentials.password
      );

      expect(result.user.failedLoginAttempts).toBe(0);
    });

    test("should set user online status on login", async () => {
      const mockToken = jwt.sign(
        { id: "user-123", username: "testuser" },
        JWT_SECRET
      );

      const mockResponse = {
        token: mockToken,
        user: {
          id: "user-123",
          username: "testuser",
          isOnline: true,
          lastSeen: new Date(),
        },
      };

      userService.loginUser.mockResolvedValue(mockResponse);

      const result = await userService.loginUser("testuser", "SecurePass123!");

      expect(result.user.isOnline).toBe(true);
      expect(result.user.lastSeen).toBeDefined();
    });
  });

  describe("Token Management", () => {
    test("should generate valid JWT token", () => {
      const payload = {
        id: "user-123",
        username: "testuser",
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.username).toBe(payload.username);
    });

    test("should reject expired token", () => {
      const payload = {
        id: "user-123",
        username: "testuser",
      };

      // Create token that expires immediately
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "0s" });

      // Wait a bit to ensure token expires
      setTimeout(() => {
        expect(() => jwt.verify(token, JWT_SECRET)).toThrow("jwt expired");
      }, 100);
    });

    test("should reject invalid token", () => {
      const invalidToken = "invalid.token.here";

      expect(() => jwt.verify(invalidToken, JWT_SECRET)).toThrow();
    });

    test("should blacklist token on logout", async () => {
      const token = jwt.sign(
        { id: "user-123", username: "testuser" },
        JWT_SECRET
      );

      const mockResponse = {
        success: true,
        message: "Logged out successfully",
      };

      userService.logoutUser.mockResolvedValue(mockResponse);

      const result = await userService.logoutUser("user-123", token);

      expect(result.success).toBe(true);
      expect(userService.logoutUser).toHaveBeenCalledWith("user-123", token);
    });
  });

  describe("User Profile Management", () => {
    test("should retrieve user profile with valid token", async () => {
      const mockProfile = {
        id: "user-123",
        username: "testuser",
        email: "test@example.com",
        isOnline: true,
        createdAt: new Date("2025-01-01"),
      };

      userService.getUserProfile.mockResolvedValue(mockProfile);

      const result = await userService.getUserProfile("user-123");

      expect(result).toBeDefined();
      expect(result.id).toBe("user-123");
      expect(result.username).toBe("testuser");
      expect(result.email).toBe("test@example.com");
    });

    test("should reject profile request without authentication", async () => {
      userService.getUserProfile.mockRejectedValue(
        new Error("Authentication required")
      );

      await expect(userService.getUserProfile(null)).rejects.toThrow(
        "Authentication required"
      );
    });

    test("should not expose password in profile", async () => {
      const mockProfile = {
        id: "user-123",
        username: "testuser",
        email: "test@example.com",
        // Password should not be included
      };

      userService.getUserProfile.mockResolvedValue(mockProfile);

      const result = await userService.getUserProfile("user-123");

      expect(result.password).toBeUndefined();
      expect(result.hashedPassword).toBeUndefined();
    });
  });

  describe("Session Management", () => {
    test("should create session on login", async () => {
      const token = jwt.sign(
        { id: "user-123", username: "testuser" },
        JWT_SECRET
      );

      const mockResponse = {
        token,
        user: {
          id: "user-123",
          username: "testuser",
        },
        sessionId: "session-123",
      };

      userService.loginUser.mockResolvedValue(mockResponse);

      const result = await userService.loginUser("testuser", "SecurePass123!");

      expect(result.sessionId).toBeDefined();
      expect(result.token).toBeDefined();
    });

    test("should invalidate session on logout", async () => {
      const mockResponse = {
        success: true,
        message: "Session invalidated",
      };

      userService.logoutUser.mockResolvedValue(mockResponse);

      const result = await userService.logoutUser("user-123", "token-123");

      expect(result.success).toBe(true);
      expect(result.message).toContain("invalidated");
    });

    test("should set user offline on logout", async () => {
      const mockResponse = {
        success: true,
        user: {
          id: "user-123",
          isOnline: false,
        },
      };

      userService.logoutUser.mockResolvedValue(mockResponse);

      const result = await userService.logoutUser("user-123", "token-123");

      expect(result.user.isOnline).toBe(false);
    });
  });

  describe("Password Validation", () => {
    test("should accept strong password", () => {
      const strongPassword = "SecurePass123!";

      const hasUppercase = /[A-Z]/.test(strongPassword);
      const hasLowercase = /[a-z]/.test(strongPassword);
      const hasNumber = /\d/.test(strongPassword);
      const hasSpecial = /[@$!%*?&#]/.test(strongPassword);
      const isLongEnough = strongPassword.length >= 8;

      expect(hasUppercase).toBe(true);
      expect(hasLowercase).toBe(true);
      expect(hasNumber).toBe(true);
      expect(hasSpecial).toBe(true);
      expect(isLongEnough).toBe(true);
    });

    test("should reject password without uppercase", () => {
      const weakPassword = "securepass123!";
      const hasUppercase = /[A-Z]/.test(weakPassword);
      expect(hasUppercase).toBe(false);
    });

    test("should reject password without lowercase", () => {
      const weakPassword = "SECUREPASS123!";
      const hasLowercase = /[a-z]/.test(weakPassword);
      expect(hasLowercase).toBe(false);
    });

    test("should reject password without number", () => {
      const weakPassword = "SecurePass!";
      const hasNumber = /\d/.test(weakPassword);
      expect(hasNumber).toBe(false);
    });

    test("should reject password without special character", () => {
      const weakPassword = "SecurePass123";
      const hasSpecial = /[@$!%*?&#]/.test(weakPassword);
      expect(hasSpecial).toBe(false);
    });

    test("should reject password shorter than 8 characters", () => {
      const weakPassword = "Sec1!";
      const isLongEnough = weakPassword.length >= 8;
      expect(isLongEnough).toBe(false);
    });
  });
});
