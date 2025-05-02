/**
 * User Controller Tests
 * Tests for the user authentication and management endpoints
 */

const userController = require("./userController");
const UserService = require("../services/userService");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Mock dependencies
jest.mock("../services/userService");
jest.mock("../models/user");
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

// Mock request and response objects
const mockRequest = (body = {}, params = {}, query = {}, headers = {}) => ({
  body,
  params,
  query,
  headers,
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock logger
jest.mock("../utils/logger", () => ({
  auth: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("User Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      // Setup
      const req = mockRequest({
        username: "newuser",
        email: "new@example.com",
        password: "Password123!",
      });
      const res = mockResponse();

      // Mock UserService.registerUser to return user and token
      const mockUserResponse = {
        id: "user123",
        username: "newuser",
        email: "new@example.com",
      };

      UserService.registerUser = jest.fn().mockResolvedValue({
        user: mockUserResponse,
        token: "jwt.token.here",
      });

      // Execute
      await userController.registerUser(req, res);

      // Assert
      expect(UserService.registerUser).toHaveBeenCalledWith({
        username: "newuser",
        email: "new@example.com",
        password: "Password123!",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: "user123",
        username: "newuser",
        email: "new@example.com",
        token: "jwt.token.here",
      });
    });

    it("should return 400 when username already exists", async () => {
      // Setup
      const req = mockRequest({
        username: "existinguser",
        email: "new@example.com",
        password: "Password123!",
      });
      const res = mockResponse();

      // Mock UserService.registerUser to throw an error for existing username
      UserService.registerUser = jest
        .fn()
        .mockRejectedValue(new Error("Username already taken"));

      // Execute
      await userController.registerUser(req, res);

      // Assert
      expect(UserService.registerUser).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Username already taken",
      });
    });

    it("should return 400 when required fields are missing", async () => {
      // Setup - missing password
      const req = mockRequest({
        username: "newuser",
        email: "new@example.com",
        // password is missing
      });
      const res = mockResponse();

      // Execute
      await userController.registerUser(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Username, email, and password are required",
      });
    });
  });

  describe("login", () => {
    it("should login a user with valid credentials", async () => {
      // Setup
      const req = mockRequest({
        username: "testuser",
        password: "correctpassword",
      });
      const res = mockResponse();

      // Mock UserService.loginUser to return user and token
      const mockUserResponse = {
        id: "user123",
        username: "testuser",
        email: "test@example.com",
        role: "user",
      };

      UserService.loginUser = jest.fn().mockResolvedValue({
        user: mockUserResponse,
        token: "jwt.token.here",
      });

      // Execute
      await userController.loginUser(req, res);

      // Assert
      expect(UserService.loginUser).toHaveBeenCalledWith(
        "testuser",
        "correctpassword"
      );
      expect(res.json).toHaveBeenCalledWith({
        id: "user123",
        username: "testuser",
        email: "test@example.com",
        role: "user",
        token: "jwt.token.here",
      });
    });

    it("should return 401 when user not found", async () => {
      // Setup
      const req = mockRequest({
        username: "nonexistent",
        password: "password",
      });
      const res = mockResponse();

      // Mock UserService.loginUser to throw error for non-existent user
      UserService.loginUser = jest
        .fn()
        .mockRejectedValue(new Error("Invalid credentials"));

      // Execute
      await userController.loginUser(req, res);

      // Assert
      expect(UserService.loginUser).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid credentials",
      });
    });

    it("should return 401 when password is incorrect", async () => {
      // Setup
      const req = mockRequest({
        username: "testuser",
        password: "wrongpassword",
      });
      const res = mockResponse();

      // Mock UserService.loginUser to throw error for wrong password
      UserService.loginUser = jest
        .fn()
        .mockRejectedValue(new Error("Invalid credentials"));

      // Execute
      await userController.loginUser(req, res);

      // Assert
      expect(UserService.loginUser).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid credentials",
      });
    });
  });

  describe("getUserProfile", () => {
    it("should return user profile for authenticated user", async () => {
      // Setup
      const req = mockRequest();
      req.user = { id: "user123" }; // This would be set by auth middleware
      const res = mockResponse();

      const userProfile = {
        _id: "user123",
        username: "testuser",
        email: "test@example.com",
        role: "user",
      };

      // Mock UserService
      UserService.getUserProfile.mockResolvedValue(userProfile);

      // Execute
      await userController.getUserProfile(req, res);

      // Assert
      expect(UserService.getUserProfile).toHaveBeenCalledWith("user123");
      expect(res.json).toHaveBeenCalledWith(userProfile);
    });

    it("should return 404 when user not found", async () => {
      // Setup
      const req = mockRequest();
      req.user = { id: "nonexistent" }; // This would be set by auth middleware
      const res = mockResponse();

      // Mock UserService to throw a "User not found" error
      UserService.getUserProfile.mockRejectedValue(new Error("User not found"));

      // Execute
      await userController.getUserProfile(req, res);

      // Assert
      expect(UserService.getUserProfile).toHaveBeenCalledWith("nonexistent");
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "User not found",
      });
    });
  });
});
