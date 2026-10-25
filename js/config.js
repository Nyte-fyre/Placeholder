// Fill these in, commit, and push. The page reads this file on load.
// Raid times are Eastern; the page also shows each visitor their own local time.
window.GUILD = {
  name: "<Placeholder>",
  game: "WoW Forever",
  faction: "Horde",
  realm: "PvP", // realm type; Forever realms are listed by type, not name
  tagline:
    "Organized PvE progression, steady improvement, and a strong community. We take our raids seriously — and real life always comes first.",
  status: "Leveling for launch. Raids open December 9.",
  discordInvite: "https://discord.gg/bhQgUXudZ",
  // Discord webhook for the apply form (Server Settings > Integrations > Webhooks).
  // Anyone can read this URL from the page; point it at an officer-only channel.
  applyWebhook: "",
  githubRepo: "https://github.com/Nyte-fyre/Placeholder",
  year: "2026",

  about:
    "We're a Horde guild on WoW Forever focused on organized PvE progression, teamwork, and building a reliable long-term roster. PvP, dungeons, alt runs, and casual activities are also welcome.",
  welcome:
    "Whether you're here to push progression, run dungeons, improve your character, participate in PvP, or simply find good people to play with, we're glad you're here.",
  focus: [
    { label: "Primary", text: "PvE progression and organized raiding" },
    { label: "Secondary", text: "PvP, battlegrounds, arenas, and world PvP" },
    { label: "Community", text: "Dungeons, gearing, professions, alts, and helping guildmates" },
  ],

  values: [
    {
      title: "Teamwork over ego",
      text: "We succeed together, learn together, and take responsibility for our mistakes.",
    },
    {
      title: "Preparation matters",
      text: "Come to organized raids ready with the appropriate gear, consumables, knowledge, and addons for your role.",
    },
    {
      title: "Respect everyone",
      text: "Treat guildmates, other players, and leadership with respect. Disagreements are fine; harassment and personal attacks are not.",
    },
    {
      title: "Progression is a team effort",
      text: "Be open to constructive feedback, strategy adjustments, and working toward what's best for the raid.",
    },
    {
      title: "Real life comes first",
      text: "Communicate when you can't attend an event or need time away. Nobody should feel pressured to put the game ahead of family, work, or health.",
    },
    {
      title: "Have fun",
      text: "We're here to experience the game together, celebrate victories, and make the occasional wipe a good story.",
    },
  ],

  // days: 0 = Sunday … 6 = Saturday. Times are 24-hour Eastern.
  raids: [
    {
      name: "Main Raid",
      label: "Late night",
      days: [3],
      checkIn: "22:45",
      start: "23:00",
      roster: 40,
      loot: "Loot Council",
    },
    {
      name: "Day Time Splits",
      label: "Daytime",
      days: [1, 4],
      checkIn: "11:30",
      start: "12:00",
      roster: 20,
      loot: "Loot Council",
    },
  ],
  raidExpectations:
    "Raiders should sign up in advance, communicate attendance changes, and arrive prepared. Specific encounter assignments, consumable expectations, and progression goals will be posted by raid leadership.",

  rules: [
    "Treat all members with respect. Harassment, discrimination, threats, and persistent toxicity are not acceptable.",
    "Follow raid leadership during organized progression. Save debates and strategy discussions for appropriate times.",
    "Sign up honestly for raids and communicate attendance changes as early as possible.",
    "Arrive prepared for your role, including required consumables, gear, and encounter knowledge as established by raid leadership.",
    "Respect the loot system. Our guild uses a loot council, with decisions intended to support raid progression and the long-term health of the roster.",
    "Do not publicly share private guild discussions, officer communications, or member information without permission.",
    "Keep spam, drama, and disruptive arguments out of guild channels.",
    "Use the appropriate channels for recruitment, raid planning, class discussions, PvP, and general conversation.",
    "Follow Discord and game rules. Cheating, exploits that violate server rules, and behavior that puts the guild at risk are unacceptable.",
    "If a problem arises, contact an officer privately rather than escalating it in public channels.",
  ],
  rulesFooter: [
    "Leadership reserves the right to address behavior that harms the community. Depending on the situation, this may mean a conversation, warning, removal from an event, or removal from the guild.",
    "These guidelines exist to help us build a reliable, enjoyable community — not to make the game feel like a second job.",
    "Welcome aboard. Let's build something great together!",
  ],
  questions:
    "Questions? Ask in #questions-and-help on Discord, or contact an officer if your question is private. More detailed raid expectations and recruitment requirements may be added as the guild grows.",

  loot: [
    "Loot decisions are intended to balance immediate progression, attendance, reliability, role needs, and long-term roster strength.",
    "Members should treat loot discussions respectfully. Questions about a decision should be directed privately to leadership rather than argued publicly.",
  ],

  recruitment: [
    { role: "Tank", open: true },
    { role: "Healer", open: true },
    { role: "Melee DPS", open: true },
    { role: "Ranged DPS", open: true },
  ],

  officers: [
    { name: "Elawn", title: "Guild Master" },
    { name: "shattovv", title: "Co-lead / Senior Officer" },
    { name: "Nyte", title: "Officer Support & Class Lead" },
  ],
  officersWanted:
    "More officers are needed. If you're interested in a leadership role, reach out to any of us.",
};
