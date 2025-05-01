import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ChatProvider } from "./context/ChatContext";
import { AuthProvider } from "./components/common/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import PwaInstallBanner from "./components/common/PwaInstallBanner";
import { useState, useEffect } from "react";
import ErrorBoundary from "./components/common/ErrorBoundary";
import Chat from "./components/chat/Chat";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import Home from "./components/common/Home";
import PrivateRoute from "./components/common/PrivateRoute";
import SocketStatusBar from "./components/SocketStatusBar";

/**
 * Main Application Component
 * Provides routing, authentication, and error handling for the entire app
 */
function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return (
    <ErrorBoundary context="app-root">
      <BrowserRouter>
        <ThemeProvider>
          {/* Toast Notification Container */}
          <Toaster position="top-right" />
          
          {/* Show offline indicator when not connected */}
          {!isOnline && (
            <div className="fixed top-3 right-3 bg-warning text-white px-3 py-1 rounded-md shadow-sm flex items-center gap-1.5 animate-fadeIn z-50">
              <span className="text-lg" aria-hidden="true">⚠</span>
              <span>You are currently offline</span>
            </div>
          )}
          
          {/* PWA Install Banner */}
          <PwaInstallBanner />
          
          <AuthProvider>
            {/* Auth specific error boundary */}
            <ErrorBoundary 
              context="auth-provider"
              onReset={() => {
                // Clear any stored auth data on severe errors
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                // Redirect to home page
                window.location.href = "/";
              }}
            >
              <ChatProvider>
                {/* Socket connection status bar */}
                <SocketStatusBar />
                
                {/* Chat specific error boundary */}
                <ErrorBoundary context="chat-provider">
                  <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-bg-primary transition-colors duration-300">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      
                      {/* Auth routes with their own error boundary */}
                      <Route path="/login" element={
                        <ErrorBoundary context="login-page">
                          <Login />
                        </ErrorBoundary>
                      } />
                      
                      <Route path="/register" element={
                        <ErrorBoundary context="register-page">
                          <Register />
                        </ErrorBoundary>
                      } />
                      
                      {/* Chat route with error boundary */}
                      <Route 
                        path="/chat"
                        element={
                          <PrivateRoute>
                            <ErrorBoundary 
                              context="chat-page"
                              // Provide special reset handler for chat component
                              onReset={() => {
                                // Navigate back to chat with clean state
                                window.location.href = "/chat";
                              }}
                            >
                              <div className="flex flex-col flex-grow">
                                <main className="flex-grow flex flex-col">
                                  <Chat />
                                </main>
                              </div>
                            </ErrorBoundary>
                          </PrivateRoute>
                        }
                      />
                      
                      {/* Catch any unmatched routes */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </div>
                </ErrorBoundary>
              </ChatProvider>
            </ErrorBoundary>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
