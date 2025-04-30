import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../common/AuthContext";
import { showErrorToast, showSuccessToast } from "../../utils/toastUtils";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: "Password strength: None"
  });
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const { username, email, password, confirmPassword } = formData;
  
  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
    // Check password strength when password field changes
    if (e.target.name === "password") {
      checkPasswordStrength(e.target.value);
    }
  };
  
  const checkPasswordStrength = (password) => {
    // Initialize score and feedback
    let score = 0;
    let feedback = [];
    
    // No password
    if (!password) {
      setPasswordStrength({ score: 0, feedback: "Password strength: None" });
      return;
    }
    
    // Length check
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push("Use 8+ characters");
    }
    
    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Add uppercase letters");
    }
    
    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Add lowercase letters");
    }
    
    // Number check
    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Add numbers");
    }
    
    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Add special characters");
    }
    
    // Set strength description based on score
    let strengthText = "Weak";
    if (score >= 5) strengthText = "Strong";
    else if (score >= 3) strengthText = "Moderate";
    
    setPasswordStrength({
      score,
      feedback: feedback.length > 0 
        ? `Password strength: ${strengthText} (${feedback.join(", ")})`
        : `Password strength: ${strengthText}`
    });
  };
    
  const onSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setError("");
    
    // Validate inputs
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      showErrorToast("Passwords do not match");
      return;
    }
    
    // Enhanced password validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      showErrorToast("Password must be at least 8 characters");
      return;
    }
    
    if (!/[A-Z]/.test(password)) {
      setError("Password must include at least one uppercase letter");
      showErrorToast("Password must include at least one uppercase letter");
      return;
    }
    
    if (!/[a-z]/.test(password)) {
      setError("Password must include at least one lowercase letter");
      showErrorToast("Password must include at least one lowercase letter");
      return;
    }
    
    if (!/[0-9]/.test(password)) {
      setError("Password must include at least one number");
      showErrorToast("Password must include at least one number");
      return;
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError("Password must include at least one special character");
      showErrorToast("Password must include at least one special character");
      return;
    }
    
    if (!email) {
      setError("Email is required for account security");
      showErrorToast("Email is required for account security");
      return;
    }
    
    setLoading(true);
    
    const result = await register({
      username,
      email,
      password
    });
    
    if (result.success) {
      showSuccessToast("Account created successfully!");
      // Redirect to chat
      navigate("/chat");
    } else {
      setError(result.message);
      showErrorToast(result.message);
      setLoading(false);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-dark-bg-secondary px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-dark-bg-primary rounded-lg shadow-md overflow-hidden">
        <div className="px-8 py-6">
          <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-dark-text-primary mb-8">
            Register for Dialoque
          </h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
          
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label 
                htmlFor="username" 
                className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={username}
                onChange={onChange}
                required
                minLength="3"
                maxLength="20"
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-md shadow-sm placeholder-gray-400 
                           focus:outline-none focus:ring-primary focus:border-primary
                           dark:bg-dark-bg-input dark:text-dark-text-primary"
                placeholder="Choose a username (3-20 characters)"
              />
            </div>
            
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={onChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-md shadow-sm placeholder-gray-400 
                           focus:outline-none focus:ring-primary focus:border-primary
                           dark:bg-dark-bg-input dark:text-dark-text-primary"
                placeholder="Enter your email address"
              />
            </div>
            
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={onChange}
                required
                minLength="8"
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-md shadow-sm placeholder-gray-400 
                           focus:outline-none focus:ring-primary focus:border-primary
                           dark:bg-dark-bg-input dark:text-dark-text-primary"
                placeholder="Create a password (min. 6 characters)"
              />
            </div>
            
            <div>
              <label 
                htmlFor="confirmPassword" 
                className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1"
              >
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={onChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-md shadow-sm placeholder-gray-400 
                           focus:outline-none focus:ring-primary focus:border-primary
                           dark:bg-dark-bg-input dark:text-dark-text-primary"
                placeholder="Confirm your password"
              />
            </div>
            
            {/* Password strength indicator */}
            {password && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 dark:bg-dark-bg-hover rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${
                      passwordStrength.score >= 5 ? 'bg-green-500' :
                      passwordStrength.score >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, passwordStrength.score * 20)}%` }}
                  ></div>
                </div>
                <p className={`text-xs mt-1 ${
                  passwordStrength.score >= 5 ? 'text-green-600 dark:text-green-400' :
                  passwordStrength.score >= 3 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {passwordStrength.feedback}
                </p>
              </div>
            )}
            
            <div>
              <button 
                type="submit" 
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-primary hover:bg-primary-hover
                          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200
                          disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </span>
                ) : "Register"}
              </button>
            </div>
          </form>
          
          <p className="mt-6 text-center text-sm text-gray-600 dark:text-dark-text-tertiary">
            Already have an account?{" "}
            <Link 
              to="/login" 
              className="font-medium text-primary hover:text-primary-hover transition-colors"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
