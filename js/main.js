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

function clip(text, max) {
  const value = String(text || "").trim();
  return value.length > max ? `${value.slice(0, max - 1)}…` : value || "—";
}

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

if (form) {
  const status = form.querySelector(".form-status");
  const submit = form.querySelector("button[type='submit']");
  const say = (text, ok) => {
    status.textContent = text;
    status.className = `form-status ${ok ? "ok" : "err"}`;
  };

  if (!cfg.applyWebhook) {
    submit.disabled = true;
    say("Applications through the site aren't open yet. Join the Discord and post in #apply-here.", false);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    if (data.get("website")) return;
    if (Date.now() - readCooldown() < COOLDOWN_MS) {
      say("Your application was already sent. Officers will reach out on Discord.", true);
      return;
    }

    // allowed_mentions stops anything typed in the form from pinging @everyone or roles.
    const payload = {
      username: `${cfg.name} applications`,
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: clip(`New application: ${data.get("character")}`, 256),
          color: 0xd4a54a,
          timestamp: new Date().toISOString(),
          fields: [
            ["Discord", data.get("discord")],
            ["Character", data.get("character")],
            ["Class / spec", data.get("spec")],
            ["Role", data.get("role")],
            ["Raid team", data.get("team")],
            ["Interests", data.getAll("interests").join(", ")],
            ["Experience", data.get("experience")],
            ["Availability", data.get("availability")],
            ["Warcraft Logs", data.get("logs")],
            ["Fun fact", data.get("note")],
          ].map(([name, value]) => ({ name, value: clip(value, 1024), inline: name !== "Fun fact" })),
        },
      ],
    };

    submit.disabled = true;
    say("Sending…", true);
    try {
      const res = await fetch(cfg.applyWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
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
