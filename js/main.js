const cfg = window.GUILD || {};

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

setText("[data-bind='name']", cfg.name);
setText("[data-bind='tagline']", cfg.tagline);
setText("[data-bind='game']", cfg.game);
setText("[data-bind='realm']", `Realm: ${cfg.realm}`);
setText("[data-bind='faction']", `Faction: ${cfg.faction}`);
setText("[data-bind='goal']", `Goal: ${cfg.goal}`);
setText("[data-bind='raidDays']", cfg.raidDays);
setText("[data-bind='inviteTime']", cfg.inviteTime);
setText("[data-bind='pullTime']", cfg.pullTime);
setText("[data-bind='raidLength']", cfg.raidLength);
setText("[data-bind='currentRaid']", cfg.currentRaid);
setText("[data-bind='heroicProgress']", cfg.heroicProgress);
setText("[data-bind='mythicProgress']", cfg.mythicProgress);
setText("[data-bind='about']", cfg.about);
setText("[data-bind='footer']", `© ${cfg.year} ${cfg.name}. Fan site — not affiliated with Blizzard Entertainment.`);
setHref("[data-bind-href='discord']", cfg.discordInvite);
setHref("[data-bind-href='github']", cfg.githubRepo);

const values = document.querySelector("[data-bind-list='values']");
if (values) {
  values.replaceChildren(
    ...(cfg.values || []).map((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      return li;
    })
  );
}

const needs = document.querySelector("[data-bind-list='recruitment']");
if (needs) {
  needs.replaceChildren(
    ...(cfg.recruitment || []).map((item) => {
      const li = document.createElement("li");
      const role = document.createElement("span");
      role.textContent = item.role;
      const tag = document.createElement("span");
      tag.className = item.open ? "tag-open" : "tag-closed";
      tag.textContent = item.open ? "Open" : "Closed";
      li.append(role, tag);
      return li;
    })
  );
}

const officers = document.querySelector("[data-bind-list='officers']");
if (officers) {
  officers.replaceChildren(
    ...(cfg.officers || []).map((person) => {
      const card = document.createElement("article");
      card.className = "officer";
      const h3 = document.createElement("h3");
      h3.textContent = person.name;
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = person.title;
      card.append(h3, p);
      return card;
    })
  );
}

document.title = `${cfg.name} — World of Warcraft guild recruitment`;

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

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const body = [
      `Character: ${data.get("character")}`,
      `Class / spec: ${data.get("spec")}`,
      `Role: ${data.get("role")}`,
      `Logs / Raider.IO: ${data.get("logs") || "n/a"}`,
      "",
      data.get("note") || "",
    ].join("\n");

    const mailto = new URL(`mailto:${cfg.officerEmail}`);
    mailto.searchParams.set("subject", `${cfg.name} application — ${data.get("character")}`);
    mailto.searchParams.set("body", body);
    window.location.href = mailto.toString().replace(/\+/g, "%20");
  });
}
