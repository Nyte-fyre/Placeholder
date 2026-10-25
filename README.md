# <Placeholder> — Horde, WoW Forever

Static World of Warcraft guild recruitment site for [Nyte-fyre/Placeholder](https://github.com/Nyte-fyre/Placeholder).

**Live URL (after Pages is on):** https://nyte-fyre.github.io/Placeholder/

## Fill in your guild

Edit [`js/config.js`](js/config.js) — guild name, realm, raid teams and times (Eastern), values, rules, loot, recruitment, officers, Discord invite, and the apply-form webhook. Then commit and push. You do not need to edit `index.html` for those fields.

The apply form posts to a Discord webhook set in `applyWebhook`. While it is empty, the form is disabled and points people to #apply-here. The webhook URL is visible to anyone who reads the page source, so point it at an officer-only channel and replace it if it gets abused.

## Local preview

Open `index.html` in a browser, or from this folder:

```powershell
python -m http.server 8080
```

Then visit http://localhost:8080/

## GitHub Pages

Pushes to `main` run a GitHub Action that publishes the repo root. First deploy can take a minute.
