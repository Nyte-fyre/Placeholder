// Members area: sign in with Discord through the guild bot, then show your own raid
// history and loot. Officers also get every raid and the whole roster.
// The bot decides who is an officer (from Discord roles) and only sends officers that data.

const cfg = window.GUILD || {};
const PASS_KEY = "memberPass";
let memoryPass = "";

const $ = (selector) => document.querySelector(selector);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

document.querySelectorAll("[data-bind='name']").forEach((n) => (n.textContent = cfg.name || ""));
document.querySelectorAll("[data-bind='footer']").forEach(
  (n) => (n.textContent = `© ${cfg.year} ${cfg.name}. Fan site — not affiliated with Blizzard Entertainment.`)
);

// ---- the sign-in pass (kept for a week; the bot checks it on every request) ----

function readPass() {
  try {
    return localStorage.getItem(PASS_KEY) || memoryPass;
  } catch {
    return memoryPass;
  }
}

function writePass(pass) {
  memoryPass = pass;
  try {
    if (pass) localStorage.setItem(PASS_KEY, pass);
    else localStorage.removeItem(PASS_KEY);
  } catch {
    // Private windows can block storage; the in-memory copy lasts until the page closes.
  }
}

function takePassFromUrl() {
  const hash = location.hash;
  if (!hash.startsWith("#discordPass=") && !hash.startsWith("#discordError=")) return "";
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  if (hash.startsWith("#discordPass=")) {
    writePass(decodeURIComponent(hash.slice("#discordPass=".length)));
    return "";
  }
  return hash.endsWith("cancelled") ? "Discord sign-in was cancelled." : "Discord sign-in didn't work. Please try again.";
}

function show(view) {
  document.querySelectorAll("[data-view]").forEach((n) => (n.hidden = n.dataset.view !== view));
}

function showSignIn(message) {
  writePass("");
  show("signin");
  const error = $("[data-signin-error]");
  error.hidden = !message;
  error.textContent = message || "";
}

// ---- formatting ----

const DAY_FORMAT = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const dayLabel = (date) => (date ? DAY_FORMAT.format(new Date(`${date}T12:00:00Z`)) : "");

const STATUS = {
  attended: ["Attended", "st-attended"],
  benched: ["Bench", "st-benched"],
  excused: ["Excused", "st-excused"],
  missed: ["Missed", "st-missed"],
  noshow: ["No-show", "st-noshow"],
};

function statusChip(status) {
  const [label, cls] = STATUS[status] || [status, ""];
  return el("span", `status-chip ${cls}`, label);
}

// Warcraft Logs' parse colors.
function parseClass(p) {
  if (typeof p !== "number") return "";
  if (p >= 100) return "pc-gold";
  if (p >= 99) return "pc-pink";
  if (p >= 95) return "pc-orange";
  if (p >= 75) return "pc-purple";
  if (p >= 50) return "pc-blue";
  if (p >= 25) return "pc-green";
  return "pc-gray";
}

function parseCell(p) {
  return el("span", `parse ${parseClass(p)}`, typeof p === "number" ? String(Math.round(p)) : "—");
}

function itemLink(item) {
  const a = el("a", `q${item.quality || 0}`, item.name);
  a.href = `https://www.wowhead.com/classic/item=${item.itemId}`;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}

function cell(content, className) {
  const td = el("td", className);
  if (content instanceof Node) td.append(content);
  else td.textContent = content ?? "";
  return td;
}

function stat(value, label) {
  const box = el("div", "stat");
  box.append(el("strong", "", value), el("span", "", label));
  return box;
}

const pct = (v) => (typeof v === "number" ? `${Math.round(v)}%` : "—");

function logLinks(logs) {
  const wrap = el("span", "log-links");
  (logs || []).forEach((l, i) => {
    const a = el("a", "", i ? `log ${i + 1}` : "log");
    a.href = l.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    wrap.append(a);
  });
  return wrap;
}

// ---- My raids ----

function renderMe(me) {
  const r = me.recent;
  $("[data-my-stats]").replaceChildren(
    stat(pct(r.percent), "attendance (last 8)"),
    stat(`${r.attended}/${r.eligible}`, "raids attended"),
    stat(String(r.streak), "raid streak"),
    stat(String(r.noShows), "no-shows"),
    stat(String(me.loot.length), "items won")
  );
  $("[data-my-chars]").textContent = me.characters.length
    ? `Your characters: ${me.characters.join(", ")}.`
    : "Add your character below so logs and loot find you.";

  const rows = me.history.map((h) => {
    const tr = el("tr");
    const raid = el("span", "", h.title);
    if (h.logs?.length) raid.append(" ", logLinks(h.logs));
    tr.append(cell(dayLabel(h.date)), cell(raid), cell(statusChip(h.noShow ? "noshow" : h.status)), cell(h.character || "—"), cell(parseCell(h.parse), "num"));
    return tr;
  });
  $("[data-my-history] tbody").replaceChildren(...rows);
  $("[data-my-history]").hidden = !rows.length;
  $("[data-my-history-empty]").hidden = Boolean(rows.length);

  const loot = me.loot.map((i) => {
    const li = el("li");
    li.append(itemLink(i), el("span", "loot-meta", ` ${i.character} · ${dayLabel(i.date)} · ${i.raid}`));
    if (i.offspec) li.append(el("span", "loot-tag", "Off-spec"));
    return li;
  });
  $("[data-my-loot]").replaceChildren(...loot);
  $("[data-my-loot-empty]").hidden = Boolean(loot.length);
}

// ---- All raids (officers) ----

function raidCard(raid, open) {
  const card = el("details", "raid-card");
  card.open = open;
  const count = (s) => raid.people.filter((p) => p.status === s).length;
  const summary = el("summary");
  summary.append(
    el("span", "raid-date", dayLabel(raid.date)),
    el("strong", "", raid.title),
    el("span", "raid-counts", `${count("attended") + count("benched")} there · ${count("noshow")} no-show · ${raid.loot.length} loot`)
  );
  if (!raid.counted) summary.append(el("span", "loot-tag", "Not confirmed"));
  card.append(summary);

  const body = el("div", "raid-body");
  if (raid.logs.length) {
    const p = el("p", "hint");
    p.append(`Warcraft Logs: ${raid.logs.map((l) => `${l.kills} kills${l.wipes ? `, ${l.wipes} wipes` : ""}`).join(" + ")} · `, logLinks(raid.logs));
    body.append(p);
  } else {
    body.append(el("p", "hint", "No log: sign-ups counted as attended unless an officer marked them."));
  }

  const groups = el("div", "people-groups");
  for (const s of ["attended", "benched", "noshow", "missed", "excused"]) {
    const people = raid.people.filter((p) => p.status === s).sort((a, b) => a.name.localeCompare(b.name));
    if (!people.length) continue;
    const g = el("div", "people-group");
    const label = el("span");
    label.append(statusChip(s), el("span", "count", ` ${people.length}`));
    g.append(label);
    g.append(el("p", "", people.map((p) => `${p.name}${p.character && p.character !== p.name ? ` (${p.character})` : ""}${p.walkIn ? " · walk-in" : ""}`).join(", ")));
    groups.append(g);
  }
  if (raid.unmapped.length) {
    const g = el("div", "people-group");
    g.append(el("span", "status-chip", "Unknown"), el("p", "", `${raid.unmapped.join(", ")} · link with /raidlog link`));
    groups.append(g);
  }
  body.append(groups);

  if (raid.loot.length) {
    body.append(el("h3", "", "Loot"));
    const ul = el("ul", "loot-list");
    for (const i of raid.loot) {
      const li = el("li");
      li.append(itemLink(i), el("span", "loot-meta", ` → ${i.character}`));
      if (i.offspec) li.append(el("span", "loot-tag", "Off-spec"));
      ul.append(li);
    }
    body.append(ul);
  }

  if (raid.perf.length) {
    body.append(el("h3", "", "Performance"));
    const wrap = el("div", "table-scroll");
    const table = el("table", "data-table");
    const head = el("tr");
    ["Character", "Spec", "Avg parse", "Bosses"].forEach((h, i) => head.append(el("th", i === 2 ? "num" : "", h)));
    table.append(el("thead"), el("tbody"));
    table.tHead.append(head);
    for (const p of raid.perf) {
      const tr = el("tr");
      const bosses = el("span", "boss-parses");
      p.bosses.forEach((b, i) => {
        if (i) bosses.append(" · ");
        bosses.append(`${b.boss} `, parseCell(b.p));
      });
      tr.append(cell(p.name), cell([p.spec, p.cls].filter(Boolean).join(" ") || p.role), cell(parseCell(p.avg), "num"), cell(bosses));
      table.tBodies[0].append(tr);
    }
    wrap.append(table);
    body.append(wrap);
  }
  card.append(body);
  return card;
}

function renderRaids(raids) {
  $("[data-raids]").replaceChildren(...raids.map((r, i) => raidCard(r, i === 0)));
  $("[data-raids-empty]").hidden = Boolean(raids.length);
}

// ---- Roster (officers) ----

let roster = [];
let sortKey = "percent";
let sortDown = true;

const sortValue = (m, key) =>
  ({
    name: m.name.toLowerCase(),
    percent: m.recent.percent ?? -1,
    attended: m.recent.attended,
    noShows: m.recent.noShows,
    streak: m.recent.streak,
    loot: m.loot,
    parse: m.parse ?? -1,
  })[key];

function renderRoster() {
  const sorted = [...roster].sort((a, b) => {
    const x = sortValue(a, sortKey);
    const y = sortValue(b, sortKey);
    const order = x < y ? -1 : x > y ? 1 : a.name.localeCompare(b.name);
    return sortDown && x !== y ? -order : order;
  });
  const rows = sorted.map((m) => {
    const tr = el("tr");
    const who = el("span", "", m.name);
    const alts = m.characters.filter((c) => c.toLowerCase() !== m.name.toLowerCase());
    if (alts.length) who.append(el("span", "chars", ` ${alts.join(", ")}`));
    const last = m.lastLoot ? itemLink(m.lastLoot) : "—";
    tr.append(
      cell(who),
      cell(pct(m.recent.percent), `num ${attendanceClass(m.recent.percent)}`),
      cell(`${m.recent.attended}/${m.recent.eligible}`, "num"),
      cell(String(m.recent.noShows), m.recent.noShows ? "num warn" : "num"),
      cell(String(m.recent.streak), "num"),
      cell(String(m.loot), "num"),
      cell(parseCell(m.parse), "num"),
      cell(last)
    );
    return tr;
  });
  $("[data-roster] tbody").replaceChildren(...rows);
  $("[data-roster-empty]").hidden = Boolean(rows.length);
  document.querySelectorAll("[data-roster] th[data-sort]").forEach((th) => {
    th.setAttribute("aria-sort", th.dataset.sort === sortKey ? (sortDown ? "descending" : "ascending") : "none");
  });
}

function attendanceClass(p) {
  if (typeof p !== "number") return "";
  return p >= 90 ? "good" : p >= 70 ? "" : "warn";
}

document.querySelectorAll("[data-roster] th[data-sort]").forEach((th) => {
  th.addEventListener("click", () => {
    if (sortKey === th.dataset.sort) sortDown = !sortDown;
    else {
      sortKey = th.dataset.sort;
      sortDown = sortKey !== "name";
    }
    renderRoster();
  });
});

// ---- tabs ----

function selectTab(name) {
  document.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
  document.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== name));
}
document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => selectTab(b.dataset.tab)));

// ---- load ----

function render(data) {
  show("app");
  $("[data-user-name]").textContent = data.user.name;
  $("[data-officer-badge]").hidden = !data.user.officer;
  $("[data-guest-note]").hidden = !data.user.guest;
  $("[data-tabs]").hidden = !data.officer;
  renderMe(data.me);
  if (data.officer) {
    renderRaids(data.officer.raids);
    roster = data.officer.roster;
    renderRoster();
  }
  selectTab("me");
}

async function load() {
  const pass = readPass();
  if (!pass) return showSignIn();
  show("loading");
  try {
    const res = await fetch(new URL("/members", cfg.botUrl), { headers: { Authorization: `Bearer ${pass}` } });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) return showSignIn("Your sign-in expired. Please sign in again.");
    if (!res.ok) throw new Error(data.error || "The guild bot didn't answer.");
    render(data);
  } catch (err) {
    show("loading");
    $("[data-view='loading']").textContent = `${err.message} Try reloading the page.`;
  }
}

if (cfg.botUrl) {
  const login = new URL("/auth/login", cfg.botUrl);
  login.searchParams.set("return", `${location.origin}${location.pathname}`);
  login.searchParams.set("stay", "1");
  $("[data-signin-link]").href = login.toString();
}

$("[data-signout]").addEventListener("click", () => showSignIn());

// Link a character (same as /character in Discord), then reload the data.
$("[data-char-form]").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = $("[data-char-status]");
  const button = form.querySelector("button");
  button.disabled = true;
  status.className = "form-status";
  status.textContent = "Linking…";
  try {
    const res = await fetch(new URL("/members", cfg.botUrl), {
      method: "POST",
      headers: { Authorization: `Bearer ${readPass()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ character: form.character.value.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) return showSignIn("Your sign-in expired. Please sign in again.");
    if (!res.ok) throw new Error(data.error || "That didn't work.");
    form.reset();
    status.textContent = "";
    await load();
  } catch (err) {
    status.className = "form-status err";
    status.textContent = err.message;
  } finally {
    button.disabled = false;
  }
});

const signInProblem = takePassFromUrl();
if (signInProblem) showSignIn(signInProblem);
else load();
