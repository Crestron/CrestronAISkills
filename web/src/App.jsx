import React, { useState, useCallback } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import LoginModal from "./components/LoginModal.jsx";
import Home from "./pages/Home.jsx";
import Search from "./pages/Search.jsx";
import SkillDetail from "./pages/SkillDetail.jsx";
import Submit from "./pages/Submit.jsx";
import {
    startDeviceFlow,
    pollForToken,
    completeLogin,
    getStoredUser,
} from "./utils/github.js";

const s = {
    app: { display: "flex", flexDirection: "column", minHeight: "100vh" },
    main: { flex: 1 },
    footer: {
        borderTop: "1px solid var(--border)",
        padding: "24px",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: "0.82rem",
    },
    footerLink: { color: "var(--link)", textDecoration: "none", margin: "0 8px" },
};

const REPO_URL =
    typeof __REPO_URL__ !== "undefined"
        ? __REPO_URL__
        : "https://github.com/CrestronEng/CrestronAISkills";

export default function App() {
    const [authVersion, setAuthVersion] = useState(0);
    const [deviceData, setDeviceData] = useState(null);
    const [loginError, setLoginError] = useState(null);

    const refreshAuth = useCallback(() => setAuthVersion((v) => v + 1), []);

    const handleLoginClick = useCallback(async () => {
        setLoginError(null);
        try {
            const data = await startDeviceFlow();
            setDeviceData(data);
            // Open the authorization URL automatically
            window.open(data.verification_uri, "_blank", "noopener");
            // Poll for token
            const token = await pollForToken(data.device_code, data.interval || 5);
            await completeLogin(token);
            setDeviceData(null);
            refreshAuth();
        } catch (err) {
            setDeviceData(null);
            setLoginError(err.message);
            setTimeout(() => setLoginError(null), 5000);
        }
    }, [refreshAuth]);

    const handleCancelLogin = useCallback(() => {
        setDeviceData(null);
        setLoginError(null);
    }, []);

    return (
        <HashRouter>
            <div style={s.app} key={authVersion}>
                <Header onLoginClick={handleLoginClick} onRefreshAuth={refreshAuth} />
                <main style={s.main}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/search" element={<Search />} />
                        <Route path="/skills/:name" element={<SkillDetail />} />
                        <Route path="/submit" element={<Submit onLoginClick={handleLoginClick} />} />
                    </Routes>
                </main>
                <footer style={s.footer}>
                    <span>CrestronAISkills</span>
                    <a href={REPO_URL} target="_blank" rel="noopener noreferrer" style={s.footerLink}>GitHub</a>
                    <a href={`${REPO_URL}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noopener noreferrer" style={s.footerLink}>Contribute</a>
                    <a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer" style={s.footerLink}>MIT License</a>
                </footer>
            </div>
            {(deviceData || loginError) && (
                <LoginModal
                    deviceData={deviceData}
                    onCancel={handleCancelLogin}
                    error={loginError}
                />
            )}
        </HashRouter>
    );
}
