"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/Components/Logo";
import getCookie from "@/hooks/GetCookie";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async () => {
    setSubmitted(true);
    setErrorMsg("");

    if (!email || !password) return;
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/user/login/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.user_id) {
        localStorage.setItem("user_id", data.user_id.toString());
      } else {
        console.error("❌ user_id missing from backend response");
      }
      if (!res.ok) {
        setErrorMsg(data.error || "Invalid login");
        setLoading(false);
        return;
      }
      localStorage.setItem("email", email);

      const sessionRes = await fetch("http://localhost:8000/user/check/", {
        method: "GET",
        credentials: "include",
      });
      const sessionData = await sessionRes.json();
      localStorage.setItem("wsToken", sessionData.token);
      localStorage.setItem("wsToken", sessionData.token);
      localStorage.setItem("isLoggedIn", "true");

      const loginHistory = JSON.parse(
        localStorage.getItem("login_history") || "[]",
      );
      const today = new Date().toISOString().split("T")[0];
      loginHistory.push(today);

      localStorage.setItem(
        "login_history",
        JSON.stringify(loginHistory.slice(-100)),
      );

      if (sessionData.activeOrgId) {
        localStorage.setItem("activeOrgId", sessionData.activeOrgId);
        window.dispatchEvent(new Event("org-changed"));
      }

      router.replace("/dashboard");
    } catch (err) {
      console.log(err);
      setErrorMsg("Server error");
    }

    setLoading(false);
  };

  return (
    <div className="wrapper">
      <div className="logoWrapper">
        <Logo />
      </div>

      <div className="card">
        <h2 className="title">Login</h2>
        {/* 🔥 OAuth Buttons (Non-breaking UI) */}
        <div className="oauthBox">
          <button
            className="oauthBtn github"
            onClick={() => {
              window.location.href = "http://localhost:8000/user/auth/github/";
            }}
          >
            Continue with GitHub
          </button>

          <button
            className="oauthBtn google"
            onClick={() => {
              window.location.href = "http://localhost:8000/user/auth/google/";
            }}
          >
            Continue with Google
          </button>

          <div className="divider">
            <span>OR</span>
          </div>
        </div>

        {errorMsg && <div className="errorBox">{errorMsg}</div>}

        <label className="label">Email</label>
        <input
          className="input"
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {submitted && !email && <p className="fieldErr">Required</p>}

        <label className="label">Password</label>
        <input
          className="input"
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {submitted && !password && <p className="fieldErr">Required</p>}

        <button onClick={handleLogin} disabled={loading} className="btn">
          {loading ? <span className="loader" /> : "Login"}
        </button>

        <p className="smallText">
          New user? <span className="loginNav">Sign Up</span>
        </p>
      </div>

      {/* CSS */}
      {/* CSS */}
      <style jsx>{`
        .wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000000; /* Dark background to match dashboard */
          position: relative;
          font-family: "Inter", sans-serif;
        }
        .logoWrapper {
          position: absolute;
          top: 24px;
          left: 24px;
        }
        .card {
          width: 100%;
          max-width: 400px;
          background: #0a0a0a; /* Slightly lighter black for depth */
          padding: 40px;
          border-radius: 12px;
          border: 1px solid #1a1a1a;
          box-shadow: 0px 10px 30px rgba(0, 0, 0, 0.5);
        }
        .title {
          font-size: 24px;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 24px;
          text-align: left;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .oauthBox {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }
        .oauthBtn {
          width: 100%;
          padding: 12px;
          border-radius: 6px;
          font-weight: 600;
          border: 1px solid #333;
          background: transparent;
          color: #ccc;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .oauthBtn:hover {
          background: #111;
          color: #fff;
          border-color: #facc15; /* Yellow highlight on hover */
        }
        .divider {
          text-align: center;
          font-size: 11px;
          color: #444;
          margin: 12px 0;
          position: relative;
        }
        .label {
          display: block;
          font-size: 11px;
          margin-bottom: 6px;
          font-weight: 700;
          color: #666;
          text-transform: uppercase;
        }
        .input {
          width: 100%;
          padding: 12px;
          background: #111;
          border: 1px solid #222;
          border-radius: 6px;
          font-size: 14px;
          color: white;
          margin-bottom: 12px;
          transition: border 0.3s ease;
        }
        .input:focus {
          outline: none;
          border-color: #facc15;
        }
        .btn {
          width: 100%;
          padding: 14px;
          margin-top: 10px;
          background: #facc15; /* Signature Yellow */
          color: black;
          border: none;
          border-radius: 6px;
          font-weight: 800;
          text-transform: uppercase;
          cursor: pointer;
          transition:
            transform 0.1s ease,
            opacity 0.2s ease;
        }
        .btn:hover {
          background: #eab308;
        }
        .btn:active {
          transform: scale(0.98);
        }
        .errorBox {
          background: rgba(220, 38, 38, 0.1);
          color: #ef4444;
          font-size: 13px;
          padding: 10px;
          border-radius: 6px;
          border: 1px solid #7f1d1d;
          margin-bottom: 15px;
        }
        .smallText {
          text-align: center;
          font-size: 13px;
          margin-top: 20px;
          color: #666;
        }
        .loginNav {
          font-weight: 600;
          color: #facc15;
          cursor: pointer;
        }
        .fieldErr {
          font-size: 11px;
          color: #ef4444;
          margin-top: -8px;
          margin-bottom: 10px;
        }
      `}</style>
    </div>
  );
}
