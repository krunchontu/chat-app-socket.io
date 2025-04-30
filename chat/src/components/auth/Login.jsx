import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../common/AuthContext";
import { showErrorToast } from "../../utils/toastUtils";

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const { username, password } = formData;
  
  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
  const onSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setError("");
    setLoading(true);
    
    const result = await login(username, password);
    
    if (result.success) {
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
            Login to Dialoque
          </h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
          
          <form onSubmit={onSubmit} className="space-y-6">
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-md shadow-sm placeholder-gray-400 
                           focus:outline-none focus:ring-primary focus:border-primary
                           dark:bg-dark-bg-input dark:text-dark-text-primary"
                placeholder="Enter your username"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1"
                >
                  Password
                </label>
              </div>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={onChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-md shadow-sm placeholder-gray-400 
                           focus:outline-none focus:ring-primary focus:border-primary
                           dark:bg-dark-bg-input dark:text-dark-text-primary"
                placeholder="Enter your password"
              />
            </div>
            
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
                    Logging in...
                  </span>
                ) : "Login"}
              </button>
            </div>
          </form>
          
          <p className="mt-6 text-center text-sm text-gray-600 dark:text-dark-text-tertiary">
            Don't have an account?{" "}
            <Link 
              to="/register" 
              className="font-medium text-primary hover:text-primary-hover transition-colors"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
