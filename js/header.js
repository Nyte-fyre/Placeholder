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
