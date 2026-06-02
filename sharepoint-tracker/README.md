# SharePoint Submission Tracker

A single, locally-stored HTML page that pulls items from **multiple SharePoint
lists** and merges them into **one dashboard** so you can track every
submission's progression in one place instead of opening each list separately.

- Signs in with your normal Microsoft 365 account (no passwords stored — uses
  Microsoft's official **MSAL.js** in the browser).
- Reads list items live via the **Microsoft Graph API**.
- Unified, filterable, sortable **table** + a kanban-style **board** grouped by status.
- Filter by list, filter by status, full-text search, summary counts.
- All settings live in your browser's local storage; the page itself is just
  one `index.html` file.

---

## Why you open it via `http://localhost` (not by double-clicking)

Microsoft sign-in needs to redirect back to a real web origin. A file opened as
`file://…` has no valid origin, so the redirect (and the API calls) get blocked.
The fix is simple: serve the file from `http://localhost`. The file still lives
on your machine — you just open it through a local address.

```bash
cd sharepoint-tracker
python3 -m http.server 8000
# then open http://localhost:8000  in your browser
```

(Any static server works — `npx serve`, VS Code "Live Server", etc. Just keep
the port consistent with your app registration's redirect URI below.)

---

## One-time setup: register an Entra (Azure AD) app

You need an app registration so Microsoft knows this page is allowed to sign you
in. It's free and takes ~3 minutes.

1. Go to **https://entra.microsoft.com** → **Identity** → **App registrations**
   → **New registration**.
2. **Name:** `SharePoint Submission Tracker` (anything).
3. **Supported account types:** *Accounts in this organizational directory only*
   (single tenant) is fine for internal use.
4. **Redirect URI:** choose platform **Single-page application (SPA)** and enter:
   ```
   http://localhost:8000
   ```
   (Must exactly match how you open the page, including the port.)
5. Click **Register**.
6. On the app's **Overview** page, copy:
   - **Application (client) ID** → this is your **Client ID**
   - **Directory (tenant) ID** → this is your **Tenant ID**
7. Go to **API permissions** → **Add a permission** → **Microsoft Graph** →
   **Delegated permissions** → add **`Sites.Read.All`**
   (use `Sites.ReadWrite.All` only if you later want write features).
8. If you see *"Admin consent required"*, click **Grant admin consent** (or ask
   your IT admin to). Delegated read often works without it, but tenant policy
   may require consent.

> No admin rights? Send your IT admin steps 1–8; they can create the app and
> share the Client ID + Tenant ID with you.

---

## Configure the dashboard

1. Open `http://localhost:8000`.
2. Click **⚙️ Settings** and fill in:
   - **Tenant ID** and **Client ID** from the app registration.
   - **SharePoint site URL**, e.g. `https://contoso.sharepoint.com/sites/TeamSite`.
   - **Lists to track** — one list display name per line. Optionally append
     `: FieldName` to tell it which column holds the status/stage:
     ```
     Grant Submissions
     Approvals: ApprovalStatus
     Project Intake: Stage
     ```
     If you omit the field, it auto-detects common ones
     (`Status`, `Stage`, `ApprovalStatus`, `State`, `Phase`, …).
3. **Save**, then click **Sign in**. Your submissions load into one view.

---

## How status detection works

For each item the page picks a status by, in order:

1. the field you named after the colon for that list, else
2. the first matching common field: `Status`, `Stage`, `ApprovalStatus`,
   `SubmissionStatus`, `State`, `Phase`, `_ModerationStatus`.

Status pills are colour-coded automatically (greens for approved/complete/live,
reds for rejected/cancelled, ambers for pending/in-review/draft, and a stable
hashed colour for anything custom).

The "Assigned / By" column similarly looks for `AssignedTo`, `Owner`,
`SubmittedBy`, `Author`, `Editor`, or `Requestor`.

---

## Notes & limits

- **Read-only** by design. It never modifies your lists.
- Internal column names can differ from what you see in the UI (e.g. a column
  shown as "Approval Status" might be `ApprovalStatus` or `Approval_x0020_Status`
  internally). If a status shows as `—`, open browser DevTools → Network, inspect
  one item's `fields`, and put the exact internal name in Settings.
- Paginates automatically (200 items/page) so large lists load fully.
- Tokens are cached only in `sessionStorage` and cleared on sign-out / tab close.
- Requires internet (it loads MSAL.js from Microsoft's CDN and calls Graph).

## Files

- `index.html` — the entire app (UI + auth + Graph calls).
- `serve.sh` — convenience launcher for the local server.
