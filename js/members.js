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
  refreshAccount();
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

  const perf = $("[data-my-perf]");
  perf.replaceChildren();
  if (me.history.some((h) => typeof h.parse === "number")) {
    perf.append(el("h2", "members-h2", "Performance"));
    perf.append(parseChart(me.history, perf.clientWidth || 640), bossTable(me.bosses));
  }
  const gear = $("[data-my-gear]");
  gear.replaceChildren();
  if (me.gear?.length) gear.append(el("h2", "members-h2", "Gear"), gearView(me.gear));
}

// ---- performance chart (parse per raid, oldest to newest) ----

const SVG = "http://www.w3.org/2000/svg";
function svg(tag, attrs) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, v);
  return node;
}

const SHORT_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const shortDay = (date) => SHORT_DAY.format(new Date(`${date}T12:00:00Z`));

// width: the space it gets, so labels stay readable on phones.
function parseChart(history, width = 640) {
  const rows = [...history].reverse();
  if (!rows.some((h) => typeof h.parse === "number")) {
    return el("p", "empty", "No parses yet: they show up once officers add Warcraft Logs reports.");
  }
  const W = Math.max(300, Math.round(width));
  const H = W < 480 ? 200 : 230;
  const L = 38;
  const R = 24;
  const T = 14;
  const B = 34;
  const x = (i) => (rows.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (rows.length - 1));
  const y = (p) => T + ((100 - p) * (H - T - B)) / 100;

  const wrap = el("div", "chart");
  const chart = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Average parse per raid, oldest to newest" });
  for (const g of [0, 25, 50, 75, 100]) {
    chart.append(svg("line", { x1: L, x2: W - R, y1: y(g), y2: y(g), class: "chart-grid" }));
    const label = svg("text", { x: L - 8, y: y(g) + 4, class: "chart-axis", "text-anchor": "end" });
    label.textContent = g;
    chart.append(label);
  }
  // Date labels: at most ~8, always the newest.
  const step = Math.max(1, Math.ceil(rows.length / 8));
  rows.forEach((h, i) => {
    if ((rows.length - 1 - i) % step) return;
    const label = svg("text", { x: x(i), y: H - 10, class: "chart-axis", "text-anchor": "middle" });
    label.textContent = shortDay(h.date);
    chart.append(label);
  });

  // The line breaks across raids with no parse (missed, excused, no log).
  let path = "";
  let pen = false;
  rows.forEach((h, i) => {
    if (typeof h.parse !== "number") {
      pen = false;
      return;
    }
    path += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(h.parse).toFixed(1)}`;
    pen = true;
  });
  chart.append(svg("path", { d: path, class: "chart-line" }));

  const tip = el("div", "chart-tip");
  tip.hidden = true;
  rows.forEach((h, i) => {
    const has = typeof h.parse === "number";
    const mark = has
      ? svg("circle", { cx: x(i), cy: y(h.parse), r: 5, class: `chart-dot ${parseClass(h.parse)}` })
      : svg("circle", { cx: x(i), cy: y(0), r: 3.5, class: "chart-dot chart-dot-none" });
    chart.append(mark);
    // Hit target: the whole column, much bigger than the dot.
    const half = rows.length === 1 ? (W - L - R) / 2 : (W - L - R) / (rows.length - 1) / 2;
    const hit = svg("rect", { x: x(i) - half, y: T, width: half * 2, height: H - T - B, class: "chart-hit" });
    const show = () => {
      const status = STATUS[h.noShow ? "noshow" : h.status]?.[0] || h.status;
      tip.replaceChildren(
        el("strong", "", `${dayLabel(h.date)} · ${h.title}`),
        el("span", "", has ? `Parse ${Math.round(h.parse)} · ${status}` : `${status} · no parse`)
      );
      tip.hidden = false;
      tip.style.left = `${Math.min(85, Math.max(15, (x(i) / W) * 100))}%`;
      tip.style.top = `${((has ? y(h.parse) : y(0)) / H) * 100}%`;
      mark.classList.add("active");
    };
    const hide = () => {
      tip.hidden = true;
      mark.classList.remove("active");
    };
    hit.addEventListener("mouseenter", show);
    hit.addEventListener("mouseleave", hide);
    hit.addEventListener("touchstart", show, { passive: true });
    chart.append(hit);
  });
  wrap.append(chart, tip);
  return wrap;
}

function bossTable(bosses) {
  if (!bosses?.length) return el("span");
  const wrap = el("div", "table-scroll boss-table");
  const table = el("table", "data-table");
  table.append(el("thead"), el("tbody"));
  const head = el("tr");
  ["Boss", "Avg parse", "Best", "Kills"].forEach((h, i) => head.append(el("th", i ? "num" : "", h)));
  table.tHead.append(head);
  for (const b of bosses) {
    const tr = el("tr");
    tr.append(cell(b.boss), cell(parseCell(b.avg), "num"), cell(parseCell(b.best), "num"), cell(String(b.kills), "num"));
    table.tBodies[0].append(tr);
  }
  wrap.append(table);
  return wrap;
}

// ---- gear (from each character's latest Warcraft Logs report) ----

// Laid out like the in-game character sheet: left column, right column, weapons.
const GEAR_SLOTS = [
  [[0, "Head"], [1, "Neck"], [2, "Shoulder"], [14, "Back"], [4, "Chest"], [8, "Wrist"]],
  [[9, "Hands"], [5, "Waist"], [6, "Legs"], [7, "Feet"], [10, "Ring"], [11, "Ring"], [12, "Trinket"], [13, "Trinket"]],
  [[15, "Main hand"], [16, "Off hand"], [17, "Ranged"]],
];

function gearItem(item) {
  const a = el("a", `q${item.q || 0}`, `Item ${item.id}`);
  a.href = `https://www.wowhead.com/classic/item=${item.id}`;
  a.dataset.wowhead = `item=${item.id}${item.e ? `&ench=${item.e}` : ""}&domain=classic`;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}

function gearView(gear) {
  if (!gear?.length) {
    return el("p", "empty", "No gear yet: it's read from the Warcraft Logs report each raid, once officers add one.");
  }
  const wrap = el("div", "gear-list");
  for (const g of gear) {
    const block = el("div", "gear-char");
    block.append(el("p", "gear-head", `${g.name}${g.cls ? ` · ${g.cls}` : ""} · as worn ${dayLabel(g.date)}`));
    const bySlot = Object.fromEntries(g.items.map((i) => [i.s, i]));
    const grid = el("div", "gear-grid");
    for (const column of GEAR_SLOTS) {
      const col = el("ul", "gear-col");
      for (const [slot, label] of column) {
        const li = el("li");
        li.append(el("span", "gear-slot", label), bySlot[slot] ? gearItem(bySlot[slot]) : el("span", "gear-empty", "—"));
        col.append(li);
      }
      grid.append(col);
    }
    block.append(grid);
    wrap.append(block);
  }
  return wrap;
}

// Wowhead's script names and iconizes item links added after it loaded.
function refreshItemLinks() {
  try {
    window.$WowheadPower?.refreshLinks();
  } catch {
    // Tooltips are a nicety; links still work without them.
  }
}

// ---- player card (officers): click any name ----

let rosterById = {};

function personLink(id, label) {
  if (!id || !rosterById[id]) return document.createTextNode(label);
  const b = el("button", "person", label);
  b.type = "button";
  b.addEventListener("click", () => openPlayer(id));
  return b;
}

const specLabel = (s) => (s ? [s.spec, s.cls].filter(Boolean).join(" ") || s.role : "");
const perRaid = (m) => (m.total.attended ? (m.loot - m.lootOS) / m.total.attended : null);
const daysSince = (date) => (date ? Math.max(0, Math.round((Date.now() - Date.parse(`${date}T12:00:00Z`)) / 86400000)) : null);

function openPlayer(id) {
  const m = rosterById[id];
  if (!m) return;
  const dialog = $("[data-player-card]");
  $("[data-player-name]").textContent = m.name;
  const alts = m.characters.filter((c) => c.toLowerCase() !== m.name.toLowerCase());
  $("[data-player-sub]").textContent = [specLabel(m.spec), alts.length ? `Also: ${alts.join(", ")}` : ""].filter(Boolean).join(" · ") || "No log data yet";
  const rate = perRaid(m);
  $("[data-player-stats]").replaceChildren(
    stat(pct(m.recent.percent), "attendance (last 8)"),
    stat(pct(m.total.percent), `all raids (${m.total.attended}/${m.total.eligible})`),
    stat(String(m.total.noShows), "no-shows"),
    stat(`${m.loot - m.lootOS}${m.lootOS ? ` + ${m.lootOS} OS` : ""}`, "items won"),
    stat(rate === null ? "—" : rate.toFixed(2), "items per raid"),
    stat(typeof m.parse === "number" ? String(Math.round(m.parse)) : "—", "avg parse (last 8)")
  );
  if (!dialog.open) dialog.showModal();
  setTimeout(refreshItemLinks);
  $("[data-player-chart]").replaceChildren(parseChart(m.history, $("[data-player-chart]").clientWidth || 640));
  $("[data-player-bosses]").replaceChildren(bossTable(m.bosses));
  $("[data-player-gear]").replaceChildren(gearView(m.gear));
  const loot = m.lootList.map((i) => {
    const li = el("li");
    li.append(itemLink(i), el("span", "loot-meta", ` ${i.character} · ${dayLabel(i.date)}`));
    if (i.offspec) li.append(el("span", "loot-tag", "Off-spec"));
    return li;
  });
  $("[data-player-loot]").replaceChildren(...(loot.length ? loot : [el("li", "empty", "No loot yet.")]));
  $("[data-player-attendance]").replaceChildren(
    ...m.history.map((h) => {
      const chip = statusChip(h.noShow ? "noshow" : h.status);
      chip.title = `${dayLabel(h.date)} · ${h.title}`;
      chip.prepend(`${shortDay(h.date)} `);
      return chip;
    })
  );
  if (!m.history.length) $("[data-player-attendance]").append(el("p", "empty", "No counted raids yet."));
  dialog.scrollTop = 0;
}

$("[data-player-close]").addEventListener("click", () => $("[data-player-card]").close());
// Clicking the dimmed backdrop closes the card too.
$("[data-player-card]").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});

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
    const names = el("p");
    people.forEach((p, i) => {
      if (i) names.append(", ");
      names.append(personLink(p.id, p.name));
      const extra = `${p.character && p.character !== p.name ? ` (${p.character})` : ""}${p.walkIn ? " · walk-in" : ""}`;
      if (extra) names.append(extra);
    });
    g.append(names);
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
      const winner = el("span", "loot-meta", " → ");
      winner.append(personLink(i.owner, i.character));
      li.append(itemLink(i), winner);
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
      tr.append(cell(personLink(p.owner, p.name)), cell([p.spec, p.cls].filter(Boolean).join(" ") || p.role), cell(parseCell(p.avg), "num"), cell(bosses));
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
    const who = el("span");
    who.append(personLink(m.id, m.name));
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

// ---- Loot per player (officers) ----

let lootKey = "rate";
let lootDown = false;

const lootValue = (m, key) =>
  ({
    name: m.name.toLowerCase(),
    spec: specLabel(m.spec).toLowerCase() || "~",
    ms: m.loot - m.lootOS,
    os: m.lootOS,
    raids: m.total.attended,
    rate: perRaid(m) ?? 99,
    days: daysSince(m.lastLoot?.date) ?? 9999,
    parse: m.parse ?? -1,
  })[key];

function renderLoot() {
  const search = $("[data-loot-search]").value.trim().toLowerCase();
  const role = $("[data-loot-role]").value;
  const cls = $("[data-loot-class]").value;
  const shown = roster.filter(
    (m) =>
      (!search || [m.name, ...m.characters].some((n) => n.toLowerCase().includes(search))) &&
      (!role || m.spec?.role === role) &&
      (!cls || m.spec?.cls === cls)
  );
  shown.sort((a, b) => {
    const x = lootValue(a, lootKey);
    const y = lootValue(b, lootKey);
    const order = x < y ? -1 : x > y ? 1 : a.name.localeCompare(b.name);
    return lootDown && x !== y ? -order : order;
  });
  const rows = shown.map((m) => {
    const tr = el("tr");
    const rate = perRaid(m);
    const days = daysSince(m.lastLoot?.date);
    tr.append(
      cell(personLink(m.id, m.name)),
      cell(specLabel(m.spec) || "—", "muted"),
      cell(String(m.loot - m.lootOS), "num"),
      cell(String(m.lootOS), "num"),
      cell(String(m.total.attended), "num"),
      cell(rate === null ? "—" : rate.toFixed(2), "num"),
      cell(days === null ? "never" : `${days}d`, "num"),
      cell(parseCell(m.parse), "num"),
      cell(m.lastLoot ? itemLink(m.lastLoot) : "—")
    );
    return tr;
  });
  $("[data-loot-table] tbody").replaceChildren(...rows);
  $("[data-loot-empty]").hidden = Boolean(rows.length);
  document.querySelectorAll("[data-loot-table] th[data-sort]").forEach((th) => {
    th.setAttribute("aria-sort", th.dataset.sort === lootKey ? (lootDown ? "descending" : "ascending") : "none");
  });
}

document.querySelectorAll("[data-loot-table] th[data-sort]").forEach((th) => {
  th.addEventListener("click", () => {
    if (lootKey === th.dataset.sort) lootDown = !lootDown;
    else {
      lootKey = th.dataset.sort;
      lootDown = ["ms", "os", "raids", "days", "parse"].includes(lootKey);
    }
    renderLoot();
  });
});
["[data-loot-search]", "[data-loot-role]", "[data-loot-class]"].forEach((s) => $(s).addEventListener("input", renderLoot));

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
  refreshAccount(data.user.name);
  $("[data-officer-badge]").hidden = !data.user.officer;
  $("[data-guest-note]").hidden = !data.user.guest;
  $("[data-tabs]").hidden = !data.officer;
  roster = data.officer?.roster || [];
  rosterById = Object.fromEntries(roster.map((m) => [m.id, m]));
  renderMe(data.me);
  if (data.officer) {
    renderRaids(data.officer.raids);
    renderRoster();
    const classes = [...new Set(roster.map((m) => m.spec?.cls).filter(Boolean))].sort();
    $("[data-loot-class]").replaceChildren(el("option", "", "All classes"), ...classes.map((c) => el("option", "", c)));
    $("[data-loot-class] option").value = "";
    renderLoot();
  }
  selectTab("me");
  setTimeout(refreshItemLinks);
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
