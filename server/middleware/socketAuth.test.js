/**
 * Socket Authentication Middleware Tests
 * Tests the authentication middleware for Socket.IO connections
 */

const socketAuth = require("./socketAuth");
const jwt = require("jsonwebtoken");

// Mock dependencies
jest.mock("jsonwebtoken");
jest.mock("../models/user", () => ({
  findById: jest.fn(),
}));

// Mock logger to suppress output during tests
jest.mock("../utils/logger", () => ({
  socket: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const User = require("../models/user");

describe("Socket Authentication Middleware", () => {
  // Mock socket object
  let mockSocket;
  let mockNext;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create mock socket object with handshake and auth
    mockSocket = {
      handshake: {
        auth: {},
        headers: {},
        query: {},
      },
      disconnect: jest.fn(),
    };

    mockNext = jest.fn();
  });

  it("should authenticate socket with valid token in auth object", async () => {
    // Setup
    const validToken = "valid.jwt.token";
    const decodedToken = { id: "user123", username: "testuser" };
    const mockUser = { _id: "user123", username: "testuser", role: "user" };

    mockSocket.handshake.auth.token = validToken;

    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, decodedToken);
    });

    User.findById.mockResolvedValue(mockUser);

    // Execute
    await socketAuth(mockSocket, mockNext);

    // Assert
    expect(jwt.verify).toHaveBeenCalled();
    expect(User.findById).toHaveBeenCalledWith("user123");
    expect(mockSocket.user).toEqual({
      id: "user123",
      username: "testuser",
      role: "user",
    });
    expect(mockNext).toHaveBeenCalled();
    expect(mockSocket.disconnect).not.toHaveBeenCalled();
  });

  it("should authenticate socket with valid token in headers", async () => {
    // Setup
    const validToken = "Bearer valid.jwt.token";
    const decodedToken = { id: "user123", username: "testuser" };
    const mockUser = { _id: "user123", username: "testuser", role: "user" };

    mockSocket.handshake.headers.authorization = validToken;

    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, decodedToken);
    });

    User.findById.mockResolvedValue(mockUser);

    // Execute
    await socketAuth(mockSocket, mockNext);

    // Assert
    expect(jwt.verify).toHaveBeenCalled();
    expect(User.findById).toHaveBeenCalledWith("user123");
    expect(mockSocket.user).toEqual({
      id: "user123",
      username: "testuser",
      role: "user",
    });
    expect(mockNext).toHaveBeenCalled();
    expect(mockSocket.disconnect).not.toHaveBeenCalled();
  });

  it("should disconnect socket with invalid token", async () => {
    // Setup
    const invalidToken = "invalid.token";

    mockSocket.handshake.auth.token = invalidToken;

    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(new Error("Invalid token"), null);
    });

    // Execute
    await socketAuth(mockSocket, mockNext);

    // Assert
    expect(jwt.verify).toHaveBeenCalled();
    expect(User.findById).not.toHaveBeenCalled();
    expect(mockSocket.user).toBeUndefined();
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it("should disconnect socket when user not found", async () => {
    // Setup
    const validToken = "valid.jwt.token";
    const decodedToken = { id: "nonexistent", username: "ghost" };

    mockSocket.handshake.auth.token = validToken;

    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, decodedToken);
    });

    User.findById.mockResolvedValue(null); // User not found

    // Execute
    await socketAuth(mockSocket, mockNext);

    // Assert
    expect(jwt.verify).toHaveBeenCalled();
    expect(User.findById).toHaveBeenCalledWith("nonexistent");
    expect(mockSocket.user).toBeUndefined();
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it("should disconnect socket when no authentication provided", async () => {
    // No auth token provided

    // Execute
    await socketAuth(mockSocket, mockNext);

    // Assert
    expect(jwt.verify).not.toHaveBeenCalled();
    expect(User.findById).not.toHaveBeenCalled();
    expect(mockSocket.user).toBeUndefined();
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
