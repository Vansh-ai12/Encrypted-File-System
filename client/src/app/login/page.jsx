"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/Components/Logo";

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
    const res = await fetch("http://127.0.0.1:8000/user/login/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error || "Invalid login");
      setLoading(false);
      return;
    }

    // ⭐️ fetch session to get activeOrg info
    const sessionRes = await fetch("http://127.0.0.1:8000/user/check/", {
      method: "GET",
      credentials: "include",
    });
    const sessionData = await sessionRes.json();

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
        <h2 className="title">Login to Your Account</h2>

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
        .fieldErr {
          font-size: 12px;
          margin-bottom: 8px;
          color: #dc2626;
        }
        .label {
          font-size: 13px;
          margin-bottom: 4px;
          font-weight: 600;
        }
        .input {
          width: 100%;
          padding: 10px 12px;
          border: 1.4px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 8px;
          transition: all 0.25s ease;
        }
        .input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.18);
        }
        .errorBox {
          background: #fee2e2;
          color: #b91c1c;
          font-size: 13px;
          padding: 10px;
          border-radius: 8px;
          text-align: center;
          margin-bottom: 12px;
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
        }
        .smallText {
          text-align: center;
          font-size: 12px;
          margin-top: 10px;
          color: #6b7280;
        }
        .loginNav {
          font-weight: 600;
          color: #4f46e5;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
