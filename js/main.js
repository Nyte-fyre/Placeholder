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

    const mailto = new URL("mailto:REPLACE_WITH_OFFICER_EMAIL");
    mailto.searchParams.set("subject", `Nyte Fyre application — ${data.get("character")}`);
    mailto.searchParams.set("body", body);
    window.location.href = mailto.toString().replace(/\+/g, "%20");
  });
}
