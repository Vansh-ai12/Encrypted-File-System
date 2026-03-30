"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/Components/Logo";
import getCookie from "@/hooks/GetCookie";

export default function Signuppage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSignup = async () => {
    setSubmitted(true);
    setErrorMsg("");

    if (!username || !email || !password) return;

    setLoading(true);

    try {
      const res = await fetch("https://encrypted-file-system-production.up.railway.app/user/signup/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Signup failed");
        setLoading(false);
        return;
      }
      localStorage.setItem("wsToken", data.token);
      router.push("/dashboard?signupSuccess=true");
    } catch {
      setErrorMsg("Something went wrong");
    }

    setLoading(false);
  };

  return (
    <div className="wrapper">
      {/* Logo Top Left */}
      <div className="logoWrapper">
        <Logo />
      </div>

      <div className="card">
        <h2 className="title">Create an Account</h2>
        {/* 🔥 OAuth Buttons (Non-breaking UI) */}
        <div className="oauthBox">
          <button
            className="oauthBtn github"
            onClick={() => {
              window.location.href = "https://encrypted-file-system-production.up.railway.app/user/auth/github/";
            }}
          >
            Continue with GitHub
          </button>

          <button
            className="oauthBtn google"
            onClick={() => {
              window.location.href = "https://encrypted-file-system-production.up.railway.app/user/auth/google/";
            }}
          >
            Continue with Google
          </button>

          <div className="divider">
            <span>OR</span>
          </div>
        </div>

        {/* Backend Error Message */}
        {errorMsg && <div className="errorBox">{errorMsg}</div>}

        {/* Username */}
        <label className="label">Username</label>
        <input
          className="input"
          placeholder="Enter username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setErrorMsg("");
          }}
        />
        {submitted && !username && <p className="fieldErr">Required</p>}

        {/* Email */}
        <label className="label">Email</label>
        <input
          className="input"
          placeholder="Enter email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrorMsg("");
          }}
        />
        {submitted && !email && <p className="fieldErr">Required</p>}

        {/* Password */}
        <label className="label">Password</label>
        <input
          className="input"
          placeholder="Enter password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrorMsg("");
          }}
        />
        {submitted && !password && <p className="fieldErr">Required</p>}

        <button onClick={handleSignup} disabled={loading} className="btn">
          {loading ? <span className="loader" /> : "Sign Up"}
        </button>

        <p className="smallText">
          Already registered? <span className="loginNav" onClick = {()=>{router.push("/login")}}>Login</span>
        </p>
      </div>

      {/* Styled JSX */}
      <style jsx>{`
        .wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000000;
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
          background: #0a0a0a;
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
          border-color: #facc15;
        }

        .divider {
          text-align: center;
          font-size: 11px;
          color: #444;
          margin: 12px 0;
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
          background: #facc15;
          color: black;
          border: none;
          border-radius: 6px;
          font-weight: 800;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn:hover {
          background: #eab308;
        }

        .btn:active {
          transform: scale(0.98);
        }

        .btn:disabled {
          background: #555;
          cursor: not-allowed;
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

        .fieldErr {
          font-size: 11px;
          color: #ef4444;
          margin-top: -8px;
          margin-bottom: 10px;
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

        .loader {
          width: 18px;
          height: 18px;
          border: 3px solid black;
          border-bottom-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
