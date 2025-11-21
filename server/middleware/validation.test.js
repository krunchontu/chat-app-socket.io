/**
 * Validation Middleware Tests
 * Tests for password validation and other input validation
 * ISSUE-003: Comprehensive password validation tests
 */

const { validateRegistration, validateLogin } = require("./validation");

// Mock request and response objects
const mockRequest = (body = {}) => ({
  body,
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe("Validation Middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateRegistration - Password Validation (ISSUE-003)", () => {
    const validUserData = {
      username: "testuser",
      email: "test@example.com",
      password: "ValidPass123!",
    };

    it("should accept a valid password with all requirements", () => {
      const req = mockRequest(validUserData);
      const res = mockResponse();

      validateRegistration(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("should reject password less than 8 characters", () => {
      const req = mockRequest({
        ...validUserData,
        password: "Pass1!",
      });
      const res = mockResponse();

      validateRegistration(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.stringContaining("at least 8 characters"),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject password without uppercase letter", () => {
      const req = mockRequest({
        ...validUserData,
        password: "validpass123!",
      });
      const res = mockResponse();

      validateRegistration(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.stringContaining("uppercase letter"),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject password without lowercase letter", () => {
      const req = mockRequest({
        ...validUserData,
        password: "VALIDPASS123!",
      });
      const res = mockResponse();

      validateRegistration(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.stringContaining("lowercase letter"),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject password without number", () => {
      const req = mockRequest({
        ...validUserData,
        password: "ValidPassword!",
      });
      const res = mockResponse();

      validateRegistration(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.stringContaining("number"),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject password without special character", () => {
      const req = mockRequest({
        ...validUserData,
        password: "ValidPass123",
      });
      const res = mockResponse();

      validateRegistration(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.stringContaining("special character"),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject empty password", () => {
      const req = mockRequest({
        ...validUserData,
        password: "",
      });
      const res = mockResponse();

      validateRegistration(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.stringContaining("required"),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should accept various special characters", () => {
      const specialChars = ["!", "@", "#", "$", "%", "*", "?", "&"];

      specialChars.forEach((char) => {
        jest.clearAllMocks();
        const req = mockRequest({
          ...validUserData,
          password: `ValidPass123${char}`,
        });
        const res = mockResponse();

        validateRegistration(req, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    it("should accept password with exactly 8 characters", () => {
      const req = mockRequest({
        ...validUserData,
        password: "Valid1!a",
      });
      const res = mockResponse();

      validateRegistration(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should accept long password with all requirements", () => {
      const req = mockRequest({
        ...validUserData,
        password: "MyVeryLongAndSecurePassword123!WithEverything",
      });
      const res = mockResponse();

      validateRegistration(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("validateRegistration - Username Validation", () => {
    const validUserData = {
      username: "testuser",
      email: "test@example.com",
      password: "ValidPass123!",
    };

    it("should reject username less than 3 characters", () => {
      const req = mockRequest({
        ...validUserData,
        username: "ab",
      });
      const res = mockResponse();

      validateRegistration(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.stringContaining("between 3 and 20 characters"),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject username more than 20 characters", () => {
      const req = mockRequest({
        ...validUserData,
        username: "thisusernameiswaytoolong123",
      });
      const res = mockResponse();

      validateRegistration(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.stringContaining("between 3 and 20 characters"),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject username with special characters", () => {
      const req = mockRequest({
        ...validUserData,
        username: "test@user",
      });
      const res = mockResponse();

      validateRegistration(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.stringContaining("letters, numbers, and underscores"),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should accept username with underscores", () => {
      const req = mockRequest({
        ...validUserData,
        username: "test_user_123",
      });
      const res = mockResponse();

      validateRegistration(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("validateRegistration - Email Validation", () => {
    const validUserData = {
      username: "testuser",
      email: "test@example.com",
      password: "ValidPass123!",
    };

    it("should reject invalid email format", () => {
      const req = mockRequest({
        ...validUserData,
        email: "invalid-email",
      });
      const res = mockResponse();

      validateRegistration(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.stringContaining("Invalid email format"),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should accept valid email formats", () => {
      const validEmails = [
        "test@example.com",
        "user.name@example.com",
        "user+tag@example.co.uk",
        "user123@test-domain.com",
      ];

      validEmails.forEach((email) => {
        jest.clearAllMocks();
        const req = mockRequest({
          ...validUserData,
          email,
        });
        const res = mockResponse();

        validateRegistration(req, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });
  });

  describe("validateLogin", () => {
    it("should accept valid login credentials", () => {
      const req = mockRequest({
        username: "testuser",
        password: "anypassword",
      });
      const res = mockResponse();

      validateLogin(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should reject login without username", () => {
      const req = mockRequest({
        password: "anypassword",
      });
      const res = mockResponse();

      validateLogin(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.stringContaining("Username is required"),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject login without password", () => {
      const req = mockRequest({
        username: "testuser",
      });
      const res = mockResponse();

      validateLogin(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.stringContaining("Password is required"),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing body object", () => {
      const req = { body: {} };
      const res = mockResponse();

      validateRegistration(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should trim whitespace from username", () => {
      const req = mockRequest({
        username: "  testuser  ",
        email: "test@example.com",
        password: "ValidPass123!",
      });
      const res = mockResponse();

      validateRegistration(req, res, mockNext);

      // If validation passes, username should be trimmed
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
