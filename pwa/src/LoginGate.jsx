import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL;

// 整站的登入閘：只有 Google 帳號 email 等於 VITE_OWNER_EMAIL 的人才看得到
// 底下真正的記帳 App。沒登入或帳號不對，一律停在這一層——連交易資料都不會
// 去打 /api/transactions（真正擋資料外洩的是 api/transactions.js 那邊對
// Authorization token 的驗證，這裡只是讓沒授權的人連畫面都進不去）。
export default function LoginGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = 還在讀取中
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleGoogleSignIn() {
    if (!supabase) return;
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setSigningIn(false);
  }

  if (!supabase) {
    return (
      <GateShell>
        <p>尚未設定登入所需的環境變數（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY）。</p>
      </GateShell>
    );
  }

  if (session === undefined) {
    return <GateShell>登入狀態確認中...</GateShell>;
  }

  if (!session) {
    return (
      <GateShell>
        <p style={{ marginBottom: 20 }}>請用 Google 帳號登入才能查看帳本。</p>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: "center",
            width: "100%",
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid #c9c0a8",
            background: "#fff",
            color: "#262220",
            fontSize: 15,
            fontWeight: 500,
            cursor: signingIn ? "default" : "pointer",
            opacity: signingIn ? 0.6 : 1,
          }}
        >
          <GoogleIcon />
          {signingIn ? "連線中..." : "使用 Google 帳號登入"}
        </button>
      </GateShell>
    );
  }

  if (OWNER_EMAIL && session.user.email !== OWNER_EMAIL) {
    return (
      <GateShell>
        <p style={{ marginBottom: 20 }}>
          此 Google 帳號（{session.user.email}）未被授權使用這本帳本。
        </p>
        <button type="button" onClick={() => supabase.auth.signOut()} style={linkButtonStyle}>
          登出，換一個帳號
        </button>
      </GateShell>
    );
  }

  return children(session);
}

function GateShell({ children }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        background: "#d9d2bf",
        fontFamily: "'Noto Sans TC', sans-serif",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 340,
          background: "#EEE9DD",
          border: "1px solid #c9c0a8",
          borderRadius: 20,
          boxShadow: "0 30px 60px -20px rgba(38,34,32,0.45)",
          padding: 28,
          textAlign: "center",
          color: "#262220",
        }}
      >
        <div style={{ fontSize: 13, letterSpacing: 4, color: "#A8843F", marginBottom: 10 }}>我的存摺</div>
        {children}
      </div>
    </div>
  );
}

const linkButtonStyle = {
  background: "none",
  border: "none",
  color: "#2B3A4A",
  textDecoration: "underline",
  cursor: "pointer",
  fontSize: 14,
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}
