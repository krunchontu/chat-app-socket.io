import React from "react";
import { Link } from "react-router-dom";
import "./Home.css";

const Home = () => {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1>Welcome to Dialoque</h1>
        <p className="home-description">
          Connect and chat with friends in real-time. Share messages, reactions, and more!
        </p>
        <div className="home-buttons">
          <Link to="/login" className="home-button login-button">
            Login
          </Link>
          <Link to="/register" className="home-button register-button">
            Register
          </Link>
        </div>
        <div className="home-features">
          <div className="feature">
            <div className="feature-icon">💬</div>
            <h3>Real-time Messaging</h3>
            <p>Send and receive messages instantly with other users.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">👍</div>
            <h3>Reactions</h3>
            <p>React to messages with likes to express your appreciation.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🔒</div>
            <h3>Secure</h3>
            <p>Your conversations are protected with secure authentication.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
