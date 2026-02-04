import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./register.css";

function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    userType: "USER", // CHANGED from "type" to "userType"
    birthdate: "",
    gender: "MALE",
    country: "",
    municipality: "",
    address: "", // CHANGED from "telephone" to "address"
    job: "",
    lat: "",
    lon: ""
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.address.trim()) { // CHANGED from telephone to address
      newErrors.address = "Address is required";
    }

    if (!formData.birthdate) {
      newErrors.birthdate = "Birthdate is required";
    }

    if (!formData.country.trim()) {
      newErrors.country = "Country is required";
    }

    if (!formData.municipality.trim()) {
      newErrors.municipality = "Municipality is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          userType: formData.userType, // CHANGED: type → userType
          birthdate: formData.birthdate,
          gender: formData.gender,
          country: formData.country,
          municipality: formData.municipality,
          address: formData.address, // CHANGED: telephone → address
          job: formData.job,
          lat: formData.lat ? parseFloat(formData.lat) : null,
          lon: formData.lon ? parseFloat(formData.lon) : null
        })
      });

      const data = await response.json();

      // CHANGED: Check for "success" field, not "status"
      if (data.success === true) {
        alert("Registration successful! You can now login.");
        navigate("/login");
      } else {
        setErrors({ general: data.message || "Registration failed" });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ general: "Cannot connect to server. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <div className="logo">
            <div className="fire-icon">🔥</div>
            <div className="logo-text">
              <h1>FIRE SERVICE</h1>
              <p className="system-tag">Create Account</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-section">
            {/* Username */}
            <div className="input-group">
              <label>Username *</label>
              <div className="input-field">
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    setFormData({...formData, username: e.target.value});
                    if (errors.username) setErrors({...errors, username: ""});
                  }}
                  placeholder="Choose a username"
                  className={errors.username ? "error" : ""}
                  disabled={isLoading}
                />
              </div>
              {errors.username && <span className="error-text">{errors.username}</span>}
            </div>

            {/* Password */}
            <div className="input-group">
              <label>Password *</label>
              <div className="input-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({...formData, password: e.target.value});
                    if (errors.password) setErrors({...errors, password: ""});
                  }}
                  placeholder="Create a password"
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

            {/* Confirm Password */}
            <div className="input-group">
              <label>Confirm Password *</label>
              <div className="input-field">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({...formData, confirmPassword: e.target.value});
                    if (errors.confirmPassword) setErrors({...errors, confirmPassword: ""});
                  }}
                  placeholder="Confirm your password"
                  className={errors.confirmPassword ? "error" : ""}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex="-1"
                >
                  {showConfirmPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
              {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>

            {/* Type Selection */}
            <div className="input-group">
              <label>User Type *</label>
              <div className="input-field">
                <select
                  value={formData.userType} // CHANGED: type → userType
                  onChange={(e) => setFormData({...formData, userType: e.target.value})}
                  className="select-input"
                  disabled={isLoading}
                >
                  <option value="USER">Simple User</option>
                  <option value="VOLUNTEER">Volunteer</option>
                </select>
              </div>
            </div>

            {/* Birthdate */}
            <div className="input-group">
              <label>Birthdate *</label>
              <div className="input-field">
                <input
                  type="date"
                  value={formData.birthdate}
                  onChange={(e) => {
                    setFormData({...formData, birthdate: e.target.value});
                    if (errors.birthdate) setErrors({...errors, birthdate: ""});
                  }}
                  className={errors.birthdate ? "error" : ""}
                  disabled={isLoading}
                />
              </div>
              {errors.birthdate && <span className="error-text">{errors.birthdate}</span>}
            </div>

            {/* Gender */}
            <div className="input-group">
              <label>Gender *</label>
              <div className="input-field">
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="select-input"
                  disabled={isLoading}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
            </div>

            {/* Country */}
            <div className="input-group">
              <label>Country *</label>
              <div className="input-field">
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => {
                    setFormData({...formData, country: e.target.value});
                    if (errors.country) setErrors({...errors, country: ""});
                  }}
                  placeholder="Enter your country"
                  className={errors.country ? "error" : ""}
                  disabled={isLoading}
                />
              </div>
              {errors.country && <span className="error-text">{errors.country}</span>}
            </div>

            {/* Municipality */}
            <div className="input-group">
              <label>Municipality *</label>
              <div className="input-field">
                <input
                  type="text"
                  value={formData.municipality}
                  onChange={(e) => {
                    setFormData({...formData, municipality: e.target.value});
                    if (errors.municipality) setErrors({...errors, municipality: ""});
                  }}
                  placeholder="Enter your municipality"
                  className={errors.municipality ? "error" : ""}
                  disabled={isLoading}
                />
              </div>
              {errors.municipality && <span className="error-text">{errors.municipality}</span>}
            </div>

            {/* Address (was Telephone) */}
            <div className="input-group">
              <label>Address *</label>
              <div className="input-field">
                <input
                  type="text"
                  value={formData.address} // CHANGED: telephone → address
                  onChange={(e) => {
                    setFormData({...formData, address: e.target.value});
                    if (errors.address) setErrors({...errors, address: ""});
                  }}
                  placeholder="Enter your address"
                  className={errors.address ? "error" : ""}
                  disabled={isLoading}
                />
              </div>
              {errors.address && <span className="error-text">{errors.address}</span>}
            </div>

            {/* Job */}
            <div className="input-group">
              <label>Job</label>
              <div className="input-field">
                <input
                  type="text"
                  value={formData.job}
                  onChange={(e) => setFormData({...formData, job: e.target.value})}
                  placeholder="Enter your job (optional)"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Coordinates Section */}
            <div className="coordinates-section">
              <div className="input-group half">
                <label>Latitude</label>
                <div className="input-field">
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.lat}
                    onChange={(e) => setFormData({...formData, lat: e.target.value})}
                    placeholder="Latitude (optional)"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="input-group half">
                <label>Longitude</label>
                <div className="input-field">
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.lon}
                    onChange={(e) => setFormData({...formData, lon: e.target.value})}
                    placeholder="Longitude (optional)"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* General error */}
          {errors.general && (
            <div className="error-message">
              <span>⚠️</span>
              <span>{errors.general}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            className="submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="loading">
                <div className="spinner"></div>
                <span>Creating Account...</span>
              </div>
            ) : (
              "CREATE ACCOUNT"
            )}
          </button>

          {/* Login link */}
          <div className="login-option">
            <span>Already have an account?</span>
            <Link to="/login" className="login-link">
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;