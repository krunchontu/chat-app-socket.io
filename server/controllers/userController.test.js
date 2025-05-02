/**
 * User Controller Tests
 * Tests for the user authentication and management endpoints
 */

const userController = require("./userController");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Mock dependencies
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

      // Mock user.save to resolve with the new user
      const savedUser = {
        _id: "user123",
        username: "newuser",
        email: "new@example.com",
        password: "hashedpassword",
        toObject: () => ({
          _id: "user123",
          username: "newuser",
          email: "new@example.com",
        }),
      };

      // Mock User.findOne to return null (user doesn't exist yet)
      User.findOne.mockImplementation(() => ({
        collation: jest.fn().mockResolvedValue(null),
      }));

      // Mock bcrypt.hash
      bcrypt.hash.mockResolvedValue("hashedpassword");

      // Mock User constructor
      User.mockImplementation(() => savedUser);

      // Mock user.save method
      savedUser.save = jest.fn().mockResolvedValue(savedUser);

      // Execute
      await userController.register(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).toHaveBeenCalledWith("Password123!", 10);
      expect(User).toHaveBeenCalledWith({
        username: "newuser",
        email: "new@example.com",
        password: "hashedpassword",
      });
      expect(savedUser.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "User registered successfully",
        user: {
          _id: "user123",
          username: "newuser",
          email: "new@example.com",
        },
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

      // Mock User.findOne to return an existing user
      const existingUser = {
        _id: "user123",
        username: "existinguser",
        email: "existing@example.com",
      };

      User.findOne.mockImplementation(() => ({
        collation: jest.fn().mockResolvedValue(existingUser),
      }));

      // Execute
      await userController.register(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Username already exists",
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
      await userController.register(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "All fields are required",
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

      // Mock user from DB
      const foundUser = {
        _id: "user123",
        username: "testuser",
        email: "test@example.com",
        password: "hashedpassword",
        role: "user",
        toObject: () => ({
          _id: "user123",
          username: "testuser",
          email: "test@example.com",
          role: "user",
        }),
      };

      // Mock User.findOne to return the user
      User.findOne.mockImplementation(() => ({
        collation: jest.fn().mockResolvedValue(foundUser),
      }));

      // Mock bcrypt.compare to return true (password matches)
      bcrypt.compare.mockResolvedValue(true);

      // Mock jwt.sign to return a token
      jwt.sign.mockReturnValue("jwt.token.here");

      // Execute
      await userController.login(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "correctpassword",
        "hashedpassword"
      );
      expect(jwt.sign).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Login successful",
        token: "jwt.token.here",
        user: {
          _id: "user123",
          username: "testuser",
          email: "test@example.com",
          role: "user",
        },
      });
    });

    it("should return 401 when user not found", async () => {
      // Setup
      const req = mockRequest({
        username: "nonexistent",
        password: "password",
      });
      const res = mockResponse();

      // Mock User.findOne to return null (user not found)
      User.findOne.mockImplementation(() => ({
        collation: jest.fn().mockResolvedValue(null),
      }));

      // Execute
      await userController.login(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid username or password",
      });
    });

    it("should return 401 when password is incorrect", async () => {
      // Setup
      const req = mockRequest({
        username: "testuser",
        password: "wrongpassword",
      });
      const res = mockResponse();

      // Mock user from DB
      const foundUser = {
        _id: "user123",
        username: "testuser",
        email: "test@example.com",
        password: "hashedpassword",
      };

      // Mock User.findOne to return the user
      User.findOne.mockImplementation(() => ({
        collation: jest.fn().mockResolvedValue(foundUser),
      }));

      // Mock bcrypt.compare to return false (password doesn't match)
      bcrypt.compare.mockResolvedValue(false);

      // Execute
      await userController.login(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "wrongpassword",
        "hashedpassword"
      );
      expect(jwt.sign).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid username or password",
      });
    });
  });

  describe("getUserProfile", () => {
    it("should return user profile for authenticated user", async () => {
      // Setup
      const req = mockRequest();
      req.user = { id: "user123" }; // This would be set by auth middleware
      const res = mockResponse();

      // Mock user from DB
      const foundUser = {
        _id: "user123",
        username: "testuser",
        email: "test@example.com",
        role: "user",
        toObject: () => ({
          _id: "user123",
          username: "testuser",
          email: "test@example.com",
          role: "user",
        }),
      };

      // Mock User.findById
      User.findById.mockResolvedValue(foundUser);

      // Execute
      await userController.getUserProfile(req, res);

      // Assert
      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        user: {
          _id: "user123",
          username: "testuser",
          email: "test@example.com",
          role: "user",
        },
      });
    });

    it("should return 404 when user not found", async () => {
      // Setup
      const req = mockRequest();
      req.user = { id: "nonexistent" }; // This would be set by auth middleware
      const res = mockResponse();

      // Mock User.findById to return null
      User.findById.mockResolvedValue(null);

      // Execute
      await userController.getUserProfile(req, res);

      // Assert
      expect(User.findById).toHaveBeenCalledWith("nonexistent");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "User not found",
      });
    });
  });
});
