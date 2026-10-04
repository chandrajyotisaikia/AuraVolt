# AuraVolt Finance

Dark-mode finance tracker for expenses, investments and sales. Node + Express backend, MongoDB Atlas database, single-file responsive frontend.

```
auravolt-finance/
├── package.json
├── server.js          # API + password gate + static hosting
├── .gitignore
└── public/
    └── index.html     # dashboard UI (HTML, CSS, JS in one file)
```

Balance = investments + sales − expenses.

## 1. Create the database (MongoDB Atlas, free)

Render's free disk is wiped on every deploy, so data lives in Atlas.

1. Sign up at mongodb.com/atlas and create a free **M0** cluster.
2. **Database Access** → add a user with a password (letters and numbers only avoids escaping issues).
3. **Network Access** → add IP `0.0.0.0/0` (Render's free tier has no fixed IP).
4. **Connect** → **Drivers** → copy the connection string. Replace `<password>` and add a database name before the `?`:
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/auravolt?retryWrites=true&w=majority`

## 2. Run locally (optional)

```bash
npm install
export MONGODB_URI="your-connection-string"
export APP_PASSWORD="choose-a-password"
npm start
```

Open http://localhost:3000. On Windows PowerShell use `$env:MONGODB_URI="..."`.

## 3. Upload to GitHub

1. Create an account at github.com, then click **New repository**. Name it `auravolt-finance`, set it **Private**, and leave "Add README" unchecked. Click **Create repository**.
2. Install Git from git-scm.com, then in the project folder run:

```bash
git init
git add .
git commit -m "Initial AuraVolt finance app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/auravolt-finance.git
git push -u origin main
```

3. When asked to sign in, use a Personal Access Token as the password: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → generate with the `repo` scope.

No Git installed? On the repo page click **Add file → Upload files**, drag in everything (keep the `public` folder structure), and commit.

Later changes: `git add . && git commit -m "message" && git push`.

## 4. Deploy on Render

1. Sign up at render.com with your GitHub account.
2. **New +** → **Web Service** → connect your `auravolt-finance` repo (authorize Render to access it if asked).
3. Fill in:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free
4. Under **Environment Variables** add:
   - `MONGODB_URI` = your Atlas connection string
   - `APP_PASSWORD` = a strong password (the browser will ask for it; username can be anything)
5. Click **Create Web Service**. After the build finishes you get a URL like `https://auravolt-finance.onrender.com`.

**Continuous deployment:** auto-deploy is on by default. Every `git push` to `main` redeploys.

## Notes

- Free Render services sleep after ~15 minutes idle; the first load afterwards takes about 30 seconds.
- Keep `APP_PASSWORD` set. Without it anyone with the URL can read your finances.
- Change the currency symbol with the `CUR` constant at the top of the script in `public/index.html`.
- Add the site to your phone's home screen from the browser menu for app-like access.

## Employees and PDF report

- Add employees (name and designation) in the Employees section. Each entry is saved under the employee you pick, and old entries keep that name even if the employee is removed.
- **Download PDF report** exports the summary, per-employee totals and every transaction. It uses the `CURRENCY` environment variable (default `$`). The PDF font only supports basic Latin characters, so for rupees set `CURRENCY` to `Rs. ` or `INR ` instead of the ₹ symbol.
