import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";

function Login({ setUsername }) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Call your Spring backend login endpoint
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      const data = await response.json();

      if (data.status === "SUCCESS") {
        // Save token and user info
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('role', data.role);

        setUsername(data.username);
        navigate("/dashboard");
      } else {
        setErrors({ general: data.message || "Login failed" });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: "Cannot connect to server. Please check your connection." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterClick = () => {
    navigate("/register");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <div className="fire-icon">🔥</div>
            <div className="logo-text">
              <h1>FIRE SERVICE</h1>
              <p className="system-tag">Emergency Response Portal</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-section">
            <div className="input-group">
              <label>Username</label>
              <div className="input-field">
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    setFormData({...formData, username: e.target.value});
                    if (errors.username) setErrors({...errors, username: ""});
                  }}
                  placeholder="Enter your username"
                  className={errors.username ? "error" : ""}
                  disabled={isLoading}
                />
              </div>
              {errors.username && <span className="error-text">{errors.username}</span>}
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="input-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({...formData, password: e.target.value});
                    if (errors.password) setErrors({...errors, password: ""});
                  }}
                  placeholder="Enter your password"
                  className={errors.password ? "error" : ""}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>
          </div>

          {errors.general && (
            <div className="error-message">
              <span>⚠️</span>
              <span>{errors.general}</span>
            </div>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="loading">
                <div className="spinner"></div>
                <span>Authenticating...</span>
              </div>
            ) : (
              "SIGN IN"
            )}
          </button>

          <div className="register-option">
            <span>Don't have an account yet?</span>
            <button
              type="button"
              className="register-btn"
              onClick={handleRegisterClick}
              disabled={isLoading}
            >
              Request Access
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

export default Login;