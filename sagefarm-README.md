# Sagefarm Retirement Planner
### Divyartha Techedge Pvt. Ltd. · AMFI Registered MFD · ARN–318120

---

## 📁 Folder Structure

```
sagefarm-planner/
├── index.html       ← Main page (open this in browser, or paste into WordPress)
├── sagefarm.css     ← All styles (scoped under #sf-planner-root)
├── sagefarm.js      ← All calculator logic + charts
├── README.md        ← This file
└── NOTES.txt        ← Developer notes, version history, deployment guide
```

---

## 🚀 How to Use

### Option A — Open locally
Just open `index.html` in any browser. All three files must be in the same folder.

### Option B — Upload to cPanel (WordPress site)
1. Upload the entire `sagefarm-planner/` folder to your server via **cPanel File Manager**
   - Recommended path: `public_html/tools/sagefarm-planner/`
2. Access via: `https://yourdomain.com/tools/sagefarm-planner/`

### Option C — Embed in a WordPress page
1. Upload `sagefarm.css` and `sagefarm.js` to your server
2. In WordPress admin, go to **Appearance → Theme File Editor** or use a plugin like **Simple Custom CSS and JS**
3. Enqueue the CSS and JS, then paste the HTML body content into a **Custom HTML block** or **Elementor HTML widget**

> ⚠️ All styles are scoped under `#sf-planner-root` — they will **not** conflict with your WordPress theme.

---

## 📦 External Dependencies (CDN — no install needed)

| Library | Version | Purpose |
|---|---|---|
| [Inter Font](https://fonts.google.com/specimen/Inter) | — | Typography |
| [Tabler Icons](https://tabler.io/icons) | 2.44.0 | UI icons |
| [Chart.js](https://www.chartjs.org/) | 4.4.1 | Graphs & charts |

All loaded via CDN. Internet connection required for first load; browsers cache them after.

---

## ✨ Features

- **SIP Retirement Planner** — calculates monthly SIP needed to hit corpus goal
- **Annual Step-Up** — models yearly SIP increase with vs without step-up comparison table
- **SWP Calculator** — systematic withdrawal plan with depletion timeline (up to ~5,000 years)
- **Corpus ±1 Cr spinner** — up/down buttons on retirement corpus goal
- **Click-to-show tooltips** — positioned left/right intelligently based on screen space
- **Fully responsive** — works on mobile, tablet, desktop

---

## 🔒 Compliance

> Mutual Fund investments are subject to market risks. Read all scheme-related documents carefully before investing. Past performance is not indicative of future results.

**Sagefarm™ · Divyartha Techedge Pvt. Ltd. · AMFI Registered MFD · ARN–318120**
