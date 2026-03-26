/**
 * GitHub Device Flow authentication.
 * No backend required — works entirely in the browser.
 */

const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || "";
const DEVICE_FLOW_URL = "https://github.com/login/device/code";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const SCOPES = "public_repo read:user";
const TOKEN_KEY = "crestron_skills_gh_token";
const USER_KEY = "crestron_skills_gh_user";

export function getStoredToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
    const u = localStorage.getItem(USER_KEY);
    return u ? JSON.parse(u) : null;
}

export function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export async function fetchGitHubUser(token) {
    const res = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch user");
    return await res.json();
}

/**
 * Start GitHub Device Flow.
 * Returns { device_code, user_code, verification_uri, expires_in, interval }
 */
export async function startDeviceFlow() {
    if (!CLIENT_ID) throw new Error("VITE_GITHUB_CLIENT_ID is not configured.");
    const res = await fetch(DEVICE_FLOW_URL, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: CLIENT_ID, scope: SCOPES }),
    });
    if (!res.ok) throw new Error(`Device flow failed: HTTP ${res.status}`);
    return await res.json();
}

/**
 * Poll for an access token after the user authorizes.
 * Returns the token string when ready, or throws on error.
 */
export async function pollForToken(deviceCode, intervalSec) {
    return new Promise((resolve, reject) => {
        const poll = async () => {
            const res = await fetch(TOKEN_URL, {
                method: "POST",
                headers: { Accept: "application/json", "Content-Type": "application/json" },
                body: JSON.stringify({
                    client_id: CLIENT_ID,
                    device_code: deviceCode,
                    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
                }),
            });
            const data = await res.json();
            if (data.access_token) {
                resolve(data.access_token);
            } else if (data.error === "authorization_pending") {
                setTimeout(poll, intervalSec * 1000);
            } else if (data.error === "slow_down") {
                setTimeout(poll, (intervalSec + 5) * 1000);
            } else {
                reject(new Error(data.error_description || data.error || "Unknown error"));
            }
        };
        poll();
    });
}

export async function completeLogin(token) {
    localStorage.setItem(TOKEN_KEY, token);
    const user = await fetchGitHubUser(token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
}

/**
 * Open a PR on GitHub for skill submission.
 * Redirects to github.com new PR page with pre-filled title.
 */
export function openSubmitPR(repoUrl, branchName) {
    const prUrl = `${repoUrl}/compare/main...${branchName}?expand=1&title=${encodeURIComponent("feat: add " + branchName)}&body=${encodeURIComponent("## New Skill Submission\n\nFills in this template...")}`;
    window.open(prUrl, "_blank", "noopener");
}
