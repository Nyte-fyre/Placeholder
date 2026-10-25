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
setText("[data-bind='kicker']", [[cfg.faction, cfg.realm].filter(Boolean).join(" "), cfg.game].filter(Boolean).join(" · "));
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
  if (raid.fromRaidHelper) card.dataset.fromRaidHelper = "true";
  card.append(el("p", "kicker", raid.label), el("h3", "", raid.name));
  const rows = [
    ["days", "Days", raid.days.map((d) => DAY_NAMES[d]).join(" & ")],
    ["checkIn", "Check-in", raidTime(raid.days, raid.checkIn)],
    ["start", "Start", raidTime(raid.days, raid.start)],
    ["roster", "Roster", `${raid.roster} players`],
    ["loot", "Loot", raid.loot],
  ];
  const dl = el("dl", "raid-facts");
  rows.forEach(([key, k, v]) => {
    const dd = el("dd", "", v);
    dd.dataset.row = key;
    dl.append(el("dt", "", k), dd);
  });
  card.append(dl);
  return card;
});

fillList("loot", cfg.loot, (text) => el("p", "", text));
fillList("rules", cfg.rules, (text) => el("li", "", text));
fillList("rulesFooter", cfg.rulesFooter, (text) => el("p", "muted", text));

function renderRecruitment(list) {
  fillList("recruitment", list, (item) => {
    const li = el("li");
    const role = el("span", "need-role", item.role);
    if (item.note) role.append(el("small", "need-note", item.note));
    li.append(role, el("span", item.open ? "tag-open" : "tag-closed", item.open ? "Open" : "Closed"));
    return li;
  });
}
renderRecruitment(cfg.recruitment);

fillList("teamOptions", ["Either", ...raids.map((r) => r.name)], (name) => el("option", "", name));

function officerCard(person) {
  const card = el("article", "officer");
  if (person.avatar) {
    const img = el("img", "officer-avatar");
    img.src = person.avatar;
    img.alt = "";
    img.loading = "lazy";
    card.append(img);
  }
  card.append(el("h3", "", person.name), el("p", "muted", person.title));
  if (person.blurb) card.append(el("p", "officer-blurb", person.blurb));
  return card;
}
fillList("officers", cfg.officers, officerCard);

// --- Live content from the guild bot ---------------------------------------
// Officers change these from Discord (/recruit, /bio, /announce); raids come from
// Raid-Helper. If the bot can't be reached, the page keeps what config.js says.

const sameName = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

function applySite(site) {
  if (site.recruitment) {
    renderRecruitment(
      (cfg.recruitment || []).map((item) => ({ ...item, ...(site.recruitment[item.role] || {}) }))
    );
  }

  const bios = site.bios || [];
  const used = new Set();
  const officers = (cfg.officers || []).map((person) => {
    const bio = bios.find((b) => !used.has(b.id) && [b.name, ...(b.names || [])].some((n) => sameName(n, person.name)));
    if (!bio) return person;
    used.add(bio.id);
    return { ...person, title: bio.title || person.title, blurb: bio.blurb, avatar: bio.avatar };
  });
  bios.filter((b) => !used.has(b.id)).forEach((b) => officers.push(b));
  fillList("officers", officers, officerCard);

  const banner = document.querySelector("[data-announce]");
  if (banner && site.announcement?.text) {
    banner.querySelector("[data-announce-text]").textContent = site.announcement.text;
    const link = banner.querySelector("[data-announce-link]");
    if (/^https:\/\//i.test(site.announcement.link || "")) {
      link.href = site.announcement.link;
      link.hidden = false;
    }
    banner.hidden = false;
  }
}

const gcalTime = (unix) => new Date(unix * 1000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function raidWhen(unix) {
  const at = new Date(unix * 1000);
  const day = new Intl.DateTimeFormat("en-US", { timeZone: RAID_TZ, weekday: "short", month: "short", day: "numeric" }).format(at);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: RAID_TZ, hour: "numeric", minute: "2-digit" }).format(at);
  return `${day} · ${time} ET${showLocal ? ` (${formatTime(at, localTz)} your time)` : ""}`;
}

const minutes = (hhmm) => hhmm.split(":").reduce((h, m) => Number(h) * 60 + Number(m));

// "12:00 AM ET (Wed 9:00 PM your time)" for a moment in time.
function etTime(at) {
  const eastern = new Intl.DateTimeFormat("en-US", { timeZone: RAID_TZ, hour: "numeric", minute: "2-digit" }).format(at);
  return showLocal ? `${eastern} ET (${formatTime(at, localTz)} your time)` : `${eastern} ET`;
}

// A raid that starts just after midnight Eastern still reads as the night before.
function raidNight(at) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: RAID_TZ, weekday: "long", hour: "numeric", hourCycle: "h23" })
      .formatToParts(at)
      .map((p) => [p.type, p.value])
  );
  if (Number(parts.hour) >= 5) return parts.weekday;
  const day = DAY_NAMES[(DAY_NAMES.indexOf(parts.weekday) + 6) % 7];
  return `${day} night`;
}

// Cards marked fromRaidHelper take their day and times from the next posted raid,
// keeping the configured gap between check-in and start.
function syncRaidCards(next) {
  const plan = raids.find((r) => r.fromRaidHelper);
  const card = document.querySelector("[data-from-raid-helper]");
  if (!next || !plan || !card) return;
  const start = new Date(next.start * 1000);
  const checkIn = new Date(start.getTime() - (minutes(plan.start) - minutes(plan.checkIn)) * 60000);
  card.querySelector("[data-row='days']").textContent = raidNight(start);
  card.querySelector("[data-row='checkIn']").textContent = etTime(checkIn);
  card.querySelector("[data-row='start']").textContent = etTime(start);
}

function applyRaids(raids) {
  syncRaidCards(raids[0]);
  const box = document.querySelector("[data-upcoming]");
  if (!box) return;
  const list = box.querySelector("[data-raid-list]");
  if (!raids.length) {
    list.replaceChildren(el("li", "muted", "No raids posted yet. Watch #weds-night-raid-signups in our Discord."));
  } else {
    list.replaceChildren(
      ...raids.slice(0, 8).map((raid) => {
        const li = el("li", "raid-item");
        const info = el("div", "raid-info");
        info.append(el("strong", "", raid.title));
        if (raid.subtitle) info.append(el("span", "raid-subtitle", raid.subtitle));
        info.append(el("span", "raid-when", raidWhen(raid.start)));
        const count = `${raid.signups} signed up${raid.tentative ? ` (+${raid.tentative} tentative)` : ""}`;
        const meta = [raid.leader && `Led by ${raid.leader}`, count].filter(Boolean).join(" · ");
        info.append(el("span", "muted raid-meta", meta));
        const actions = el("div", "raid-actions");
        const signup = el("a", "btn btn-ghost btn-small", "Sign up on Discord");
        signup.href = raid.url;
        signup.rel = "noopener noreferrer";
        const gcal = el("a", "btn btn-ghost btn-small", "Add to Google Calendar");
        const g = new URL("https://calendar.google.com/calendar/render");
        g.searchParams.set("action", "TEMPLATE");
        g.searchParams.set("text", `${cfg.name}: ${raid.title}`);
        g.searchParams.set("dates", `${gcalTime(raid.start)}/${gcalTime(raid.end)}`);
        g.searchParams.set("details", `Sign up on Discord: ${raid.url}`);
        gcal.href = g.toString();
        gcal.target = "_blank";
        gcal.rel = "noopener noreferrer";
        actions.append(signup, gcal);
        li.append(info, actions);
        return li;
      })
    );
  }
  const feed = new URL("/raids.ics", cfg.botUrl);
  const webcal = feed.toString().replace(/^https:/, "webcal:");
  box.querySelector("[data-subscribe-ics]").href = webcal;
  box.querySelector("[data-subscribe-google]").href = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
  box.hidden = false;
}

if (cfg.botUrl) {
  fetch(new URL("/site.json", cfg.botUrl))
    .then((r) => (r.ok ? r.json() : null))
    .then((site) => site && applySite(site))
    .catch(() => {});
  fetch(new URL("/raids", cfg.botUrl))
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => data && applyRaids(data.raids || []))
    .catch(() => {});
}

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
