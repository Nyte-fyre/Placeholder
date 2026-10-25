const cfg = window.GUILD || {};
const RAID_TZ = "America/New_York";
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((el) => {
    el.textContent = value ?? "";
  });
}

function setHref(selector, value) {
  document.querySelectorAll(selector).forEach((el) => {
    el.setAttribute("href", value);
  });
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function fillList(name, items, build) {
  const target = document.querySelector(`[data-bind-list='${name}']`);
  if (target) target.replaceChildren(...(items || []).map(build));
}

// Date of the next given weekday + "HH:MM" in Eastern time, as a real instant.
function nextEastern(day, hhmm) {
  const parts = (date) =>
    Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: RAID_TZ,
        hourCycle: "h23",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      })
        .formatToParts(date)
        .map((p) => [p.type, Number(p.value)])
    );
  const today = parts(new Date());
  const [h, m] = hhmm.split(":").map(Number);
  const offset = (day - new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay() + 7) % 7;
  const guess = Date.UTC(today.year, today.month - 1, today.day + offset, h, m);
  const seen = parts(new Date(guess));
  const drift = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute) - guess;
  return new Date(guess - drift);
}

function formatTime(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "numeric", minute: "2-digit" }).format(date);
}

const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const showLocal = formatTime(new Date(), localTz) !== formatTime(new Date(), RAID_TZ);

function raidTime(days, hhmm) {
  const dates = days.map((d) => nextEastern(d, hhmm));
  const eastern = new Intl.DateTimeFormat("en-US", { timeZone: RAID_TZ, hour: "numeric", minute: "2-digit" }).format(dates[0]);
  if (!showLocal) return `${eastern} ET`;
  return `${eastern} ET (${dates.map((at) => formatTime(at, localTz)).join(" / ")} your time)`;
}

setText("[data-bind='name']", cfg.name);
setText("[data-bind='kicker']", [cfg.game, cfg.faction].filter(Boolean).join(" · "));
setText("[data-bind='tagline']", cfg.tagline);
setText("[data-bind='status']", cfg.status);
setText("[data-bind='about']", cfg.about);
setText("[data-bind='welcome']", cfg.welcome);
setText("[data-bind='raidExpectations']", cfg.raidExpectations);
setText("[data-bind='officersWanted']", cfg.officersWanted);
setText("[data-bind='questions']", cfg.questions);
setText(
  "[data-bind='tzNote']",
  showLocal ? `Times are Eastern. Your local times (${localTz}) are shown in brackets.` : "All times Eastern."
);
setText("[data-bind='footer']", `© ${cfg.year} ${cfg.name}. Fan site — not affiliated with Blizzard Entertainment.`);
setHref("[data-bind-href='discord']", cfg.discordInvite);
setHref("[data-bind-href='github']", cfg.githubRepo);

const raids = cfg.raids || [];
const chips = [
  cfg.faction,
  cfg.realm && `${cfg.realm} realm`,
  ...raids.map((r) => `${r.roster}-player ${r.name}`),
  raids[0] && raids[0].loot,
].filter(Boolean);
fillList("chips", chips, (text) => el("span", "chip", text));

const focus = document.querySelector("[data-bind-list='focus']");
if (focus) {
  focus.replaceChildren(...(cfg.focus || []).flatMap((item) => [el("dt", "", item.label), el("dd", "", item.text)]));
}

fillList("values", cfg.values, (value) => {
  const card = el("article", "officer");
  card.append(el("h3", "", value.title), el("p", "muted", value.text));
  return card;
});

fillList("raids", raids, (raid) => {
  const card = el("article", "panel raid");
  card.append(el("p", "kicker", raid.label), el("h3", "", raid.name));
  const rows = [
    ["Days", raid.days.map((d) => DAY_NAMES[d]).join(" & ")],
    ["Check-in", raidTime(raid.days, raid.checkIn)],
    ["Start", raidTime(raid.days, raid.start)],
    ["Roster", `${raid.roster} players`],
    ["Loot", raid.loot],
  ];
  const dl = el("dl", "raid-facts");
  rows.forEach(([k, v]) => dl.append(el("dt", "", k), el("dd", "", v)));
  card.append(dl);
  return card;
});

fillList("loot", cfg.loot, (text) => el("p", "", text));
fillList("rules", cfg.rules, (text) => el("li", "", text));
fillList("rulesFooter", cfg.rulesFooter, (text) => el("p", "muted", text));

fillList("recruitment", cfg.recruitment, (item) => {
  const li = el("li");
  li.append(el("span", "", item.role), el("span", item.open ? "tag-open" : "tag-closed", item.open ? "Open" : "Closed"));
  return li;
});

fillList("teamOptions", ["Either", ...raids.map((r) => r.name)], (name) => el("option", "", name));

fillList("officers", cfg.officers, (person) => {
  const card = el("article", "officer");
  card.append(el("h3", "", person.name), el("p", "muted", person.title));
  return card;
});

document.title = `${cfg.name} — ${[cfg.faction, cfg.game].filter(Boolean).join(" guild on ")}`;

const nav = document.querySelector(".nav");
const toggle = document.querySelector(".nav-toggle");
const form = document.querySelector("#apply-form");

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

const COOLDOWN_KEY = "applySentAt";
const COOLDOWN_MS = 10 * 60 * 1000;

function readCooldown() {
  try {
    return Number(localStorage.getItem(COOLDOWN_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeCooldown() {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  } catch {
    // Private windows can block storage; the cooldown is only a courtesy.
  }
}

// Discord sign-in: the guild bot sends people back here with a signed pass in the
// URL fragment (#discordPass=...). The pass rides along with the application, and the
// bot checks it, so the Discord account on an application can't be faked.
const PASS_KEY = "discordPass";
let memoryPass = "";

function readPass() {
  try {
    return sessionStorage.getItem(PASS_KEY) || memoryPass;
  } catch {
    return memoryPass;
  }
}

function writePass(pass) {
  memoryPass = pass;
  try {
    if (pass) sessionStorage.setItem(PASS_KEY, pass);
    else sessionStorage.removeItem(PASS_KEY);
  } catch {
    // Private windows can block storage; the in-memory copy lasts until the page closes.
  }
}

// Reads the name and expiry from a pass. Only for display: the bot does the real check.
function passInfo(pass) {
  try {
    const body = pass.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body), (c) => c.charCodeAt(0))));
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

function takePassFromUrl() {
  const hash = location.hash;
  if (!hash.startsWith("#discordPass=") && !hash.startsWith("#discordError=")) return "";
  history.replaceState(null, "", `${location.pathname}${location.search}#apply`);
  document.querySelector("#apply")?.scrollIntoView();
  if (hash.startsWith("#discordPass=")) {
    writePass(decodeURIComponent(hash.slice("#discordPass=".length)));
    return "";
  }
  return hash.endsWith("cancelled")
    ? "Discord sign-in was cancelled. Sign in to apply here, or use /apply in our Discord."
    : "Discord sign-in didn't work. Please try again, or use /apply in our Discord.";
}

if (form) {
  const status = form.querySelector(".form-status");
  const submit = form.querySelector("button[type='submit']");
  const fields = form.querySelector("[data-fields]");
  const signin = form.querySelector("[data-signin]");
  const signedIn = form.querySelector("[data-signed-in]");
  const say = (text, ok) => {
    status.textContent = text;
    status.className = `form-status ${ok ? "ok" : "err"}`;
  };

  const showSignIn = () => {
    const info = passInfo(readPass());
    signin.hidden = Boolean(info);
    signedIn.hidden = !info;
    fields.disabled = !info || !cfg.applyEndpoint;
    if (info) form.querySelector("[data-signed-name]").textContent = info.name || info.username;
  };

  if (cfg.applyEndpoint) {
    const login = new URL("/auth/login", cfg.applyEndpoint);
    login.searchParams.set("return", `${location.origin}${location.pathname}`);
    form.querySelector("[data-signin-link]").href = login.toString();
  }

  form.querySelector("[data-signout]").addEventListener("click", () => {
    writePass("");
    showSignIn();
  });

  const signInProblem = takePassFromUrl();
  showSignIn();
  if (!cfg.applyEndpoint) {
    signin.hidden = true;
    say("Applications through the site aren't open yet. Join the Discord and post in #apply-here.", false);
  } else if (signInProblem) {
    say(signInProblem, false);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    if (data.get("website")) return;
    if (Date.now() - readCooldown() < COOLDOWN_MS) {
      say("Your application was already sent. Officers will reach out on Discord.", true);
      return;
    }

    // The guild bot Worker builds the Discord message, so no webhook URL lives in this page.
    const payload = Object.fromEntries(data);
    payload.interests = data.getAll("interests");
    payload.pass = readPass();

    submit.disabled = true;
    say("Sending…", true);
    try {
      const res = await fetch(cfg.applyEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 429) {
        say("Too many applications at once. Please wait a minute and try again.", false);
        return;
      }
      if (res.status === 401) {
        writePass("");
        showSignIn();
        say("Your Discord sign-in expired. Please sign in again; your answers are still filled in.", false);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeCooldown();
      form.reset();
      say("Application sent! Join the Discord so officers can reach you.", true);
    } catch {
      say("Couldn't send right now. Please post in #apply-here on Discord instead.", false);
    } finally {
      submit.disabled = false;
    }
  });
}
