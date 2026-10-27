// Shared by every page: the phone menu, and the account button in the header
// ("Member sign in", or your name once you're signed in to the members area).

const MEMBER_PASS_KEY = "memberPass";

// Reads the name and expiry from the members-area pass. Only for display: the bot does the real check.
function memberPassInfo() {
  try {
    const pass = localStorage.getItem(MEMBER_PASS_KEY) || "";
    const body = pass.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body), (c) => c.charCodeAt(0))));
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

// name: shown instead of the pass's Discord name (the members page knows the server nickname).
function refreshAccount(name) {
  const link = document.querySelector("[data-account]");
  if (!link) return;
  const info = memberPassInfo();
  link.classList.toggle("signed-in", Boolean(info));
  link.textContent = info ? name || info.name || info.username : "Member sign in";
  link.title = info ? "Your raid history and loot" : "Sign in with Discord to see your raid history";
}
refreshAccount();

// Points a "Sign in with Discord" link straight at discord.com. Phones only open the Discord app
// for links that go directly there; the bot's /auth/login redirect keeps them in the browser.
// The link starts as /auth/login (works anywhere) and is swapped for the direct one, refreshed
// before the bot's 30-minute signature runs out.
function directSignIn(link, botUrl, returnTo, stay) {
  if (!link || !botUrl) return;
  const params = new URLSearchParams({ return: returnTo, ...(stay && { stay: "1" }) });
  link.href = `${new URL("/auth/login", botUrl)}?${params}`;
  let expires = 0;
  const refresh = async () => {
    try {
      const res = await fetch(`${new URL("/auth/url", botUrl)}?${params}`);
      const data = await res.json();
      if (!res.ok || !data.url) return;
      link.href = data.url;
      expires = data.expires;
    } catch {
      // Keep the /auth/login link: it still signs people in, just through the browser on phones.
    }
  };
  refresh();
  setInterval(refresh, 20 * 60 * 1000);
  // Phones pause timers in background tabs: refresh when the page comes back if it's close to expiring.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && expires - Date.now() < 5 * 60 * 1000) refresh();
  });
}

const menuToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector("#site-nav");
if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const open = siteNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
  });
  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}
