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
      const res = await fetch("http://localhost:8000/user/signup/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json",
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

        {/* Backend Error Message */}
        {errorMsg && (
          <div className="errorBox">{errorMsg}</div>
        )}

        {/* Username */}
        <label className="label">Username</label>
        <input
          className="input"
          placeholder="Enter username"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setErrorMsg(""); }}
        />
        {submitted && !username && (
          <p className="fieldErr">Required</p>
        )}

        {/* Email */}
        <label className="label">Email</label>
        <input
          className="input"
          placeholder="Enter email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
        />
        {submitted && !email && (
          <p className="fieldErr">Required</p>
        )}

        {/* Password */}
        <label className="label">Password</label>
        <input
          className="input"
          placeholder="Enter password"
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
        />
        {submitted && !password && (
          <p className="fieldErr">Required</p>
        )}

        <button onClick={handleSignup} disabled={loading} className="btn">
          {loading ? <span className="loader" /> : "Sign Up"}
        </button>

        <p className="smallText">
          Already registered? <span className="loginNav">Login</span>
        </p>
      </div>

      {/* Styled JSX */}
      <style jsx>{`
        .wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9fafb;
          position: relative;
        }
        .logoWrapper {
          position: absolute;
          top: 24px;
          left: 24px;
        }
        .card {
          width: 100%;
          max-width: 380px;
          background: white;
          padding: 28px 30px;
          border-radius: 16px;
          box-shadow: 0px 2px 14px rgba(0,0,0,0.06);
          border: 1px solid #e5e7eb;
        }
        .title {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 18px;
          text-align: center;
        }
        .label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 4px;
        }
        .input {
          width: 100%;
          padding: 10px 12px;
          border: 1.4px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 4px;
          transition: all 0.25s ease;
        }
        .input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.18);
        }
        .fieldErr {
          color: #dc2626;
          font-size: 12px;
          margin-bottom: 8px;
        }
        .errorBox {
          background: #fee2e2;
          color: #b91c1c;
          font-size: 13px;
          text-align: center;
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 14px;
        }
        .btn {
          width: 100%;
          padding: 10px;
          margin-top: 12px;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .btn:hover {
          background: #4338ca;
          transform: translateY(-1px);
        }
        .btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
        }
        .loader {
          width: 18px;
          height: 18px;
          border: 3px solid white;
          border-bottom-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .smallText {
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          margin-top: 10px;
        }
        .loginNav {
          color: #4f46e5;
          font-weight: 600;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
