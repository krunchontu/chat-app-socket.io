const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: false, // Optional for now
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address."],
    },
    password: {
      type: String,
      required: true,
      minlength: 8, // ISSUE-003: Increased from 6 to 8 characters
    },
    avatar: {
      type: String, // URL to avatar image
      default: "",
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    // ISSUE-007: Account lockout mechanism to prevent brute force attacks
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Password hashing middleware
userSchema.pre("save", async function (next) {
  // Only hash the password if it's modified or new
  if (!this.isModified("password")) return next();

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate auth token
userSchema.methods.generateAuthToken = function () {
  // Check for JWT secret and enforce its presence
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not defined in environment variables");
    throw new Error("Server configuration error: JWT_SECRET is missing");
  }

  const token = jwt.sign(
    {
      id: this._id,
      username: this.username,
      role: this.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d", // Token expires in 7 days
    }
  );
  return token;
};

// ISSUE-007: Account lockout helper methods
// Check if account is currently locked
userSchema.methods.isLocked = function () {
  // Check if lockUntil is set and still in the future
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Get remaining lock time in minutes
userSchema.methods.getLockTimeRemaining = function () {
  if (!this.lockUntil || this.lockUntil <= Date.now()) {
    return 0;
  }
  return Math.ceil((this.lockUntil - Date.now()) / 60000); // Convert to minutes
};

// Increment failed login attempts and lock if threshold reached
userSchema.methods.incrementLoginAttempts = async function () {
  // If we have a previous lock that has expired, restart the attempts count
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { failedLoginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  // Otherwise increment attempts
  const updates = { $inc: { failedLoginAttempts: 1 } };

  // Lock the account if we've reached the maximum attempts (5)
  const maxAttempts = 5;
  const lockTime = 15 * 60 * 1000; // 15 minutes in milliseconds

  if (this.failedLoginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }

  return this.updateOne(updates);
};

// Reset failed login attempts on successful login
userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $set: { failedLoginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

// Create a virtual 'id' field that uses _id for consistency
userSchema.virtual("id").get(function () {
  return this._id.toString();
});

// Configure the schema to include virtuals when converting to JSON
userSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.password; // Don't expose password
    return ret;
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
