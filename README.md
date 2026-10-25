# WoW Forever

Static World of Warcraft guild recruitment site for [Nyte-fyre/Placeholder](https://github.com/Nyte-fyre/Placeholder).

**Live URL (after Pages is on):** https://nyte-fyre.github.io/Placeholder/

## Fill in your guild

Edit [`js/config.js`](js/config.js) — guild name, realm, faction, raid nights, Discord invite, officer email, roster, and officers. Then commit and push. You do not need to edit `index.html` for those fields.

## Local preview

Open `index.html` in a browser, or from this folder:

```powershell
python -m http.server 8080
```

Then visit http://localhost:8080/

## GitHub Pages

Pushes to `main` run a GitHub Action that publishes the repo root. First deploy can take a minute.
