#!/usr/bin/env node
// One-time YouTube login. Opens a browser, you approve with the channel's Google account,
// and the refresh token is stored in ~/.config/ios-daily-english/token.json (mode 600).
//   node scripts/youtube-auth.mjs   (scope: youtube, needed for scheduling as well as uploading)
// Needs ~/.config/ios-daily-english/client_secret.json (Desktop OAuth client). No packages.
import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, chmodSync } from "node:fs";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const dir = join(homedir(), ".config", "ios-daily-english");
const { client_id, client_secret, auth_uri, token_uri } = Object.values(JSON.parse(readFileSync(join(dir, "client_secret.json"), "utf8")))[0];
const SCOPE = "https://www.googleapis.com/auth/youtube"; // upload + update (schedule) + thumbnails

const verifier = randomBytes(48).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");
const state = randomBytes(16).toString("hex");

const server = createServer();
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const redirect = `http://127.0.0.1:${server.address().port}`;

const url = new URL(auth_uri);
url.search = new URLSearchParams({
  client_id, redirect_uri: redirect, response_type: "code", scope: SCOPE, state,
  code_challenge: challenge, code_challenge_method: "S256", access_type: "offline", prompt: "consent",
}).toString();

console.log("Opening the browser for Google login...\nIf it does not open, visit:\n" + url + "\n");
execFile("open", [url.toString()]);

const code = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("timed out waiting for login (15 min)")), 15 * 60 * 1000);
  server.on("request", (req, res) => {
    const q = new URL(req.url, redirect).searchParams;
    if (q.get("error")) { res.end("Login failed: " + q.get("error")); clearTimeout(timer); return reject(new Error(q.get("error"))); }
    if (!q.get("code")) { res.statusCode = 404; return res.end(); }
    if (q.get("state") !== state) { res.statusCode = 400; res.end("state mismatch"); return reject(new Error("state mismatch")); }
    res.end("Login complete. You can close this tab and return to the terminal.");
    clearTimeout(timer);
    resolve(q.get("code"));
  });
}).finally(() => server.close());

const r = await fetch(token_uri, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ code, client_id, client_secret, redirect_uri: redirect, grant_type: "authorization_code", code_verifier: verifier }),
});
const tok = await r.json();
if (!r.ok || !tok.refresh_token) {
  console.error("token exchange failed:", tok.error ?? r.status, tok.error_description ?? "");
  process.exit(1);
}
const file = join(dir, "token.json");
writeFileSync(file, JSON.stringify({ refresh_token: tok.refresh_token, scope: tok.scope, created: new Date().toISOString() }, null, 2));
chmodSync(file, 0o600);
console.log("Saved refresh token to " + file);
