// src/pages/Login.js
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, googleProvider, githubProvider, db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useState } from "react";

export default function Login() {
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSocialLogin = async (provider) => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Save user in Firestore if not exists
      const userRef = doc(db, "users", user.email);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          name: user.displayName,
          email: user.email,
          role: "admin", // first user = admin
        });
      }
    } catch (error) {
      if (error.code === "auth/account-exists-with-different-credential") {
        setError("This email is already associated with a different sign-in method. Please use the original sign-in method or try a different email.");
      } else {
        setError(error.message);
      }
      console.error(error);
    }
  };

  const handleEmailPasswordAuth = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      if (!email || !password) {
        setError("Please enter email and password.");
        return;
      }
      
      let user;
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        user = result.user;
        // Save new user to Firestore
        const userRef = doc(db, "users", user.email);
        await setDoc(userRef, {
          name: user.displayName || "User",
          email: user.email,
          role: "admin", // first user = admin
        });
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        user = result.user;
      }
      setEmail("");
      setPassword("");
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        setError("Email already registered. Please sign in instead.");
        setIsSignUp(false);
      } else if (error.code === "auth/user-not-found") {
        setError("No account found with this email. Please sign up.");
        setIsSignUp(true);
      } else if (error.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (error.code === "auth/weak-password") {
        setError("Password is too weak. Use at least 6 characters.");
      } else {
        setError(error.message);
      }
      console.error(error);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 100%)",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "2.5rem 2rem",
          borderRadius: "16px",
          boxShadow: "0 6px 32px rgba(0,0,0,0.10)",
          minWidth: 320,
          textAlign: "center",
        }}
      >
        <h2 style={{ marginBottom: 8, color: "#1e293b" }}>Sign in to Ownly</h2>
        <p style={{ marginBottom: 24, color: "#64748b" }}>
          Secure access with your account
        </p>
        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "0.75rem",
              borderRadius: 6,
              marginBottom: "1rem",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleEmailPasswordAuth} style={{ marginBottom: "1.5rem" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              marginBottom: "0.75rem",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              fontSize: "1rem",
              boxSizing: "border-box",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              marginBottom: "1rem",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              fontSize: "1rem",
              boxSizing: "border-box",
            }}
          />
          <button
            type="submit"
            style={{
              background: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(16,185,129,0.10)",
              display: "block",
              width: "100%",
            }}
          >
            {isSignUp ? "Sign Up" : "Sign In"}
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
            style={{
              background: "none",
              border: "none",
              color: "#6366f1",
              cursor: "pointer",
              marginTop: "0.5rem",
              fontSize: "0.875rem",
              textDecoration: "underline",
            }}
          >
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", margin: "1.5rem 0" }}>
          <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }}></div>
          <span style={{ padding: "0 0.75rem", color: "#94a3b8", fontSize: "0.875rem" }}>Or continue with</span>
          <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }}></div>
        </div>
        <button
          onClick={() => handleSocialLogin(googleProvider)}
          style={{
            background: "linear-gradient(90deg, #6366f1 0%, #06b6d4 100%)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(99,102,241,0.10)",
            transition: "background 0.2s",
            marginBottom: "1rem",
            display: "block",
            width: "100%",
          }}
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt=""
            style={{ width: 20, verticalAlign: "middle", marginRight: 8 }}
          />
          Login with Google
        </button>
        <button
          onClick={() => handleSocialLogin(githubProvider)}
          style={{
            background: "#24292e",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(36,41,46,0.10)",
            transition: "background 0.2s",
            display: "block",
            width: "100%",
          }}
        >
          <svg
            style={{ width: 20, verticalAlign: "middle", marginRight: 8, fill: "currentColor" }}
            viewBox="0 0 24 24"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Login with GitHub
        </button>
      </div>
    </div>
  );
}