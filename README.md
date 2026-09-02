# Aqua Cargo - AI Website Builder Implementation

## Deployment & Setup Guide

Welcome to the Aqua Cargo logistics project structure.

### 1. How to install
Simply clone or download this repository, and open `index.html` in your favorite modern browser. No build steps or package managers are required since this uses vanilla HTML, CSS, and JS. 

### 2. How to connect Supabase
1. Go to [Supabase](https://supabase.com/) and create a new project.
2. Under "Project Settings" -> "API", copy your `Project URL` and `anon public` key.
3. Open `scripts/supabase.js` and paste your keys into `SUPABASE_URL` and `SUPABASE_KEY` constants.
4. Execute the SQL from `schema.sql` (found in the root directory) in the Supabase SQL Editor.
5. Enable RLS (Row Level Security) and configure appropriate policies (or leave them public for demo environments depending on your need). 

### 3. How to upload to GitHub
```bash
git init
git add .
git commit -m "First commit: Initialize Aqua Cargo"
git branch -M main
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

### 4. How to deploy with GitHub Pages or Vercel
**GitHub Pages:**
- Go to repository Settings -> Pages.
- Under Build and deployment, choose 'main' branch and '/root' folder, then Save.

**Vercel:**
- Login to Vercel and click "Add New... Project".
- Import your GitHub repository.
- No build command required. Click Deploy.

### 5. How to change branding
All major colors, gradients, and font families are managed in CSS variables inside `styles/style.css` `:root`.
Logos are stored under `assets/logos/`. Swap out `logo-dark.png` and `logo-light.png` to change the brand.

### 6. How to add admin users
By default, the demo allows login with `admin` and `AquaCargo2026!`. 
To use the secure Supabase auth or a dedicated admin table, you can insert rows into the `admin_users` table you created from `schema.sql`.

### 7. How to manage shipments
1. Visit `/admin-login.html`.
2. Login with the demo credentials to access `/admin-dashboard.html`.
3. In the dashboard, you can Create, Edit, or Add updates to any given tracking number. When extending the project, ensure Row Level Security permits only authenticated admins to mutate rows via `supabase.js`.
