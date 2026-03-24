import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";
import { fetchJson } from "../utils/api";
import { normalizeRole } from "../utils/session";

function Login() {
  const navigate = useNavigate();
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
      const data = await fetchJson("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      if (data.status === "SUCCESS") {
        const userId = Number(data.userId);
        const role = normalizeRole(data.role);

        localStorage.setItem("token", data.token || "session-token");
        localStorage.setItem("username", data.username || "");
        localStorage.setItem("displayName", data.username || "");
        localStorage.setItem("role", role || "GUEST");
        if (Number.isFinite(userId)) {
          localStorage.setItem("userId", String(userId));
          try {
            const user = await fetchJson(`/api/users/${userId}`);
            const displayName = user.username || data.username || "";
            localStorage.setItem("displayName", displayName);
            localStorage.setItem("username", user.username || data.username || "");
          } catch (userError) {
            console.warn("Could not load user profile after login:", userError);
          }
        }

        navigate("/dashboard/home");
      } else {
        setErrors({ general: data.message || "Login failed" });
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrors({ general: "Cannot connect to server. Please check your connection." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterClick = () => {
    navigate("/register");
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Login to your account</h1>
          <p>Enter your username below to login to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="login-username">Username</label>
            <div className="input-field">
              <input
                id="login-username"
                type="text"
                value={formData.username}
                onChange={(e) => {
                  setFormData({ ...formData, username: e.target.value });
                  if (errors.username) setErrors({ ...errors, username: "" });
                }}
                placeholder="username"
                className={errors.username ? "error" : ""}
                disabled={isLoading}
              />
            </div>
            {errors.username && <span className="error-text">{errors.username}</span>}
          </div>

          <div className="input-group">
            <label htmlFor="login-password">Password</label>
            <div className="input-field">
              <input
                id="login-password"
                type="password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) setErrors({ ...errors, password: "" });
                }}
                placeholder="Password"
                className={errors.password ? "error" : ""}
                disabled={isLoading}
              />
            </div>
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          {errors.general && <div className="error-message">{errors.general}</div>}

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? (
              <div className="loading">
                <div className="spinner" />
                <span>Login...</span>
              </div>
            ) : (
              "Login"
            )}
          </button>

          <div className="register-option">
            <span>Don't have an account?</span>
            <button
              type="button"
              className="register-btn"
              onClick={handleRegisterClick}
              disabled={isLoading}
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
