// Beads Dashboard: the bd (beads) issues of the repo the focused pane is in. In the side
// panel a compact tree or list with the detail under the row; opened wide (its own tab,
// props.wide) a dashboard, and tree and lists with the detail in a resizable pane beside.
// Everything goes through the bd CLI on the pane's machine (this one, WSL, ssh), one call
// at a time, cached per repo and data set; stale data stays on screen.
import { View, div, svg, PathBuilder, Background } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, TextView, ScrollHandle, h_resizable, resizable_panel, HoverCard, Progress, ProgressTrack, ProgressIndicator,
  v_virtual_list, VirtualListScrollHandle, Scrollbar, ToggleGroup, Toggle } from "gpui-base";
import { spaces, panes, focused, exec, theme, settings, layout, run, nextCommand, props, readTextFile, home } from "herdr";

// This mod's folder name: its own icons, and how it finds its copies in the layout.
const MOD = "beads-dashboard";
const DIR = `mods/${MOD}`;
// Where bd is on a Unix machine: PATH, the usual install folders, then the login shell's PATH.
const BD_FIND = [
  'command -v bd 2>/dev/null && exit 0',
  'for p in "$HOME/.local/bin/bd" "$HOME/go/bin/bd" /home/linuxbrew/.linuxbrew/bin/bd /opt/homebrew/bin/bd /usr/local/bin/bd "$HOME/.bun/bin/bd" "$HOME/.npm-global/bin/bd"; do [ -x "$p" ] && echo "$p" && exit 0; done',
  '"${SHELL:-sh}" -lc "command -v bd" 2>/dev/null </dev/null',
  'exit 0',
].join("\n");
// On Windows: what `where` doesn't find, these may hold.
const BD_WIN = ["go\\bin\\bd.exe", ".local\\bin\\bd.exe", "AppData\\Local\\Programs\\bd\\bd.exe", "scoop\\shims\\bd.exe"];
const NO_BD = "NO_BD";

// Language: German where the system is, English elsewhere (props.lang or beads-dashboard.lang:de|en|auto override).
// The German text is the key; EN holds the English for each.
let lang = "en";
const EN = {
  "Overview": "Overview", "Baum": "Tree", "Ready": "Ready", "Offen": "Open", "Alle": "All",
  "offen": "open", "in Arbeit": "in progress", "blockiert": "blocked", "zurückgestellt": "deferred", "geschlossen": "closed", "angeheftet": "pinned", "gehakt": "hooked",
  "In Arbeit": "In progress", "Blockiert": "Blocked", "Zurückgestellt": "Deferred", "Geschlossen": "Closed",
  "Status": "Status", "Priorität": "Priority", "Person": "Person", "Typ": "Type", "Label": "Label", "Keine": "None", "Eltern": "Parent",
  "bd lieferte kein JSON": "bd returned no JSON", "gerade": "just now", "vor {n} min": "{n} min ago", "vor {n} h": "{n} h ago", "vor {n} T": "{n} d ago",
  "Filtern…": "Filter…", "bd endete mit {n}": "bd exited with {n}", "gestartet": "started", "wieder geöffnet": "reopened",
  "{id} kopiert": "{id} copied", "{id} ins Terminal eingefügt": "{id} pasted into the terminal",
  "Keine Treffer für „{q}“": "No matches for “{q}”", " mit den Schnellfiltern": " with the quick filters", "Keine Treffer für die Schnellfilter": "No matches for the quick filters",
  "Mir": "Me", "Niemand": "Nobody", "offen und nicht blockiert": "open and not blocked", "Klick: Filter aus": "Click: filter off",
  "Klick: nur diese (mit anderen der Gruppe: oder)": "Click: only these (with others of the group: or)", "Alle Schnellfilter aus": "All quick filters off", "× zurücksetzen": "× reset",
  "{a} von {b} Unter-Issues erledigt": "{a} of {b} sub-issues done", "{n} in Arbeit": "{n} in progress", "{n} blockiert": "{n} blocked", "{n} offen": "{n} open",
  "Starten (in Arbeit)": "Start (in progress)", "ID kopieren": "Copy ID", "ID ins Terminal einfügen": "Paste ID into the terminal",
  "Starten": "Start", "Wirklich schließen?": "Really close?", "Schließen": "Close", "Wieder öffnen": "Reopen", "Abhängig von": "Depends on",
  "Zugewiesen": "Assignee", "Zeit": "Time", "Grund": "Reason", "erstellt {t}": "created {t}", " · geändert {t}": " · changed {t}", " · zu {t}": " · closed {t}",
  "{n} hängen hiervon ab": "{n} depend on this", "Kein Issue ausgewählt": "No issue selected",
  "Zeile anklicken · ↑ ↓ wechseln · ← → zu- und aufklappen · Esc schließt": "Click a row · ↑ ↓ move · ← → fold and unfold · Esc closes",
  "niemand": "nobody", "Labels": "Labels", "Erstellt": "Created", "Begonnen": "Started", "Geändert": "Changed", "Extern": "External",
  "UNTER-ISSUES": "SUB-ISSUES", "… {n} weitere im Baum": "… {n} more in the tree", "Beschreibung": "Description", "Akzeptanzkriterien": "Acceptance criteria",
  "Design": "Design", "Notizen": "Notes", "{n} weitere anzeigen": "Show {n} more",
  "Nichts bereit": "Nothing ready", "Keine offenen Issues": "No open issues", "Keine Issues": "No issues", "Alles erledigt oder blockiert.": "Everything is done or blocked.",
  "Ohne Priorität": "No priority", "Priorität {g}": "Priority {g}", "Ohne Typ": "No type", "Ohne Eltern-Issue": "No parent issue",
  "Treffer": "matches", "Issues": "issues", " · {n} Gruppen": " · {n} groups", "Alle Gruppen aufklappen": "Unfold all groups", "Alle Gruppen zuklappen": "Fold all groups",
  "Gruppieren": "Group by", "Klick: zurück zur üblichen Ordnung": "Click: back to the usual order", "Klick: umgekehrt": "Click: reverse", "Nach {c} sortieren": "Sort by {c}",
  "TITEL": "TITLE", "TYP": "TYPE", "FORTSCHRITT": "PROGRESS", "ZUGEWIESEN": "ASSIGNEE", "GEÄNDERT": "CHANGED",
  "{n} geschlossen": "{n} closed", "{id} ist nicht in diesem Repo": "{id} is not in this repo", "{n} Treffer": "{n} matches", "{a} offen · {b} geschlossen": "{a} open · {b} closed",
  "Alles aufklappen": "Unfold all", "Alles zuklappen": "Fold all", "Geschlossene zusammenfassen": "Group closed ones", "Geschlossene einzeln zeigen": "Show closed ones one by one",
  "niemand zugewiesen": "unassigned", "heute": "today", "gestern": "yesterday",
  "{n} nicht zugewiesen": "{n} unassigned", "Offen und auf nichts wartend · zur Liste": "Open and waiting on nothing · to the list", "{n} Personen": "{n} people",
  "In Arbeit · zur Liste": "In progress · to the list", "warten auf andere Issues": "waiting on other issues", "Blockiert · zur Liste": "Blocked · to the list",
  "Offen gesamt": "Open in total", "{n} neu in 7 Tagen": "{n} new in 7 days", "Alles, was nicht geschlossen ist · zum Baum": "Everything not closed · to the tree",
  "Geschlossen · 7 T": "Closed · 7 d", "wie die Woche davor": "same as the week before", "{d} ggü. Woche davor": "{d} vs. the week before",
  "Geschlossen, die letzten Tage zuerst · zur Liste": "Closed, latest first · to the list",
  "Stand": "Standing", "{n} Issues · {p}% erledigt": "{n} issues · {p}% done", "Durchsatz · 30 Tage": "Throughput · 30 days",
  "{a} erstellt · {b} geschlossen": "{a} created · {b} closed", "erstellt {n}": "created {n}", "geschlossen {n}": "closed {n}", "Spitze {n}/Tag": "Peak {n}/day",
  "Offene Issues · 30 Tage": "Open issues · 30 days", "unverändert seit 30 Tagen": "unchanged for 30 days", "{d} in 30 Tagen": "{d} in 30 days", "{d}: {n} offen": "{d}: {n} open",
  "Epics & Eltern-Issues": "Epics & parent issues", "Keine offenen Issues mit Unter-Issues": "No open issues with sub-issues",
  "Als Nächstes": "Up next", "… {n} weitere bereit": "… {n} more ready", "{n} bereit": "{n} ready", "wartet auf": "waiting on", "als blockiert markiert": "marked as blocked",
  "markiert": "marked", "… {n} weitere": "… {n} more", "Nichts blockiert": "Nothing blocked", "{n} offen · zur Liste": "{n} open · to the list",
  "Offen nach …": "Open by …", "PRIORITÄT": "PRIORITY", "ohne": "none", "LABELS": "LABELS", "Aktiv": "Active", "Nichts in Arbeit": "Nothing in progress",
  "erstellt": "created", "übernommen": "claimed", "Heute": "Today", "Gestern": "Yesterday", "Diese Woche": "This week", "Früher": "Earlier",
  "Noch nichts passiert": "Nothing has happened yet", "Aktivität": "Activity", "{a} von {b}": "{a} of {b}",
  "Kein Ordner": "No folder", "Suche Repo…": "Looking for the repo…", "Ordner nicht lesbar": "Folder not readable", "Keine Beads in {x}": "No beads in {x}",
  "Kein Git-Repo": "Not a git repo", "Kein .beads-Verzeichnis gefunden (bd init legt eins an).": "No .beads folder found (bd init creates one).",
  "bd-Fehler": "bd error", "Lade Beads…": "Loading beads…", "{n} Issues": "{n} issues", "Neu laden": "Reload",
  "Als Tab öffnen (Dashboard, Baum)": "Open as a tab (dashboard, tree)", "Schnellfilter einklappen": "Hide quick filters", "Schnellfilter zeigen": "Show quick filters",
  "bd nicht gefunden": "bd not found", "Installiere beads (github.com/steveyegge/beads) auf dieser Maschine, dann neu laden.": "Install beads (github.com/steveyegge/beads) on this machine, then reload.",
};
// The text in the language shown, `{name}` filled from `vars`.
function tx(de, vars) {
  let s = lang === "de" ? de : EN[de] ?? de;
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}
const stName = (s) => STATUS[s] === undefined ? undefined : tx(STATUS[s]);
// A Windows path ("C:\\x", "C:/x"); kept with forward slashes and an upper-case drive.
const isWinPath = (p) => /^[A-Za-z]:([\\/]|$)/.test(p ?? "");
function norm(p) {
  if (!isWinPath(p)) return p;
  p = p.replace(/\\/g, "/").replace(/^[a-z]/, (d) => d.toUpperCase());
  return /^[A-Z]:\/?$/.test(p) ? p.slice(0, 2) + "/" : p.replace(/\/+$/, "");
}
const parentDir = (d) => {
  const i = d.lastIndexOf("/");
  if (i < 0) return d;
  if (isWinPath(d) && i === 2) return d.slice(0, 3);
  return d.slice(0, i) || "/";
};
const samePath = (a, b) => Boolean(a) && Boolean(b) && (isWinPath(a) ? a.toLowerCase() === b.toLowerCase() : a === b);
const STALE = 10000;      // a view (or open detail) older than this reloads while the panel shows
const TICK = 2500;        // how often staleness is checked (cheap; bd only runs when something is old)
const ERR_RETRY = 60000;  // a view that failed is retried this rarely (or on refresh / repo change)
const ROOT_STALE = 30000; // where .beads is, re-checked this often
const NOTE_MS = 6000;     // footer messages fade after this
const ROWS = 400;         // rows drawn at first; "weitere anzeigen" adds as many again
const ACTIVITY = 60;      // events the overview lists (each is a dozen elements; a render has a budget)
const INDENT = 16;        // tree: width of one level
const ICON = `${DIR}/beads.svg`;
const DAY = 86400000;
const WEEKDAY = { de: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
// Wide tree: the columns right of the title, and from which tree width each shows.
const COL = { type: 74, prog: 112, prio: 24, who: 136, upd: 56 };
const SHOW = { type: 640, upd: 760, who: 880 };
const bucket = (w) => (w > SHOW.type) + (w > SHOW.upd) + (w > SHOW.who);

// What bd is asked for; several views share one load ("all").
const LOADS = {
  ready: ["ready", "--json", "-n", "0"],
  open: ["list", "--json", "--flat", "-n", "0"],
  all: ["list", "--all", "--json", "--flat", "-n", "0"],
};
const VIEWS = [
  { id: "overview", label: "Overview", data: "all", wide: true },
  { id: "tree", label: "Baum", data: "all" },
  { id: "ready", label: "Ready", data: "ready" },
  { id: "open", label: "Offen", data: "open" },
  { id: "all", label: "Alle", data: "all" },
];
const dataOf = (view) => VIEWS.find(v => v.id === view)?.data ?? "open";
const isList = (view) => view === "ready" || view === "open" || view === "all";

const STATUS = {
  open: "offen", in_progress: "in Arbeit", blocked: "blockiert", deferred: "zurückgestellt",
  closed: "geschlossen", pinned: "angeheftet", hooked: "gehakt",
};
// Status has its own shape, so it never depends on a hue shared with the priority badges.
const GLYPH = { open: "open", in_progress: "progress", blocked: "blocked", closed: "closed", deferred: "deferred" };
const TYPES = {
  bug: ["B", "ansi1"], feature: ["F", "ansi2"], task: ["T", "ansi4"], epic: ["E", "ansi5"],
  chore: ["C", "muted"], decision: ["D", "ansi6"], "merge-request": ["M", "ansi6"], molecule: ["M", "ansi5"],
};
const RANK = { in_progress: 0, open: 1, blocked: 2, deferred: 3, pinned: 4, hooked: 4, closed: 9 };
const AVATAR = ["ansi4", "ansi5", "ansi6", "ansi2", "ansi3"];
// Quick filters, chips under the filter field: within a group any chip, across groups all.
// Keys are "<group>:<value>": s status, p priority, w who, t type, l label.
const QSTATE = [["open", "Ready"], ["in_progress", "In Arbeit"], ["blocked", "Blockiert"], ["deferred", "Zurückgestellt"], ["closed", "Geschlossen"]];
const QGROUP = { s: "Status", p: "Priorität", w: "Person", t: "Typ", l: "Label" };
// Wide list: how its rows can be grouped, and the columns a header click sorts by.
const GROUPS = [["none", "Keine"], ["status", "Status"], ["prio", "Priorität"], ["who", "Person"], ["type", "Typ"], ["parent", "Eltern"]];
const SORTS = ["auto", "state", "id", "title", "type", "prio", "who", "upd"];
const STATE_ORDER = ["in_progress", "open", "blocked", "deferred", "closed"];
const LIST_ROW = 30;

// The focused pane's folder and machine (as the shipped Files/Changes panels find them).
// A mod pane (this panel opened wide, a viewer) has no folder: the last one in that space stays.
function location(prev) {
  const space = spaces().find(s => s.active), f = focused();
  const pane = f?.pane ? panes().find(p => p.pane === f.pane) : null;
  if (pane && !pane.terminal && prev && prev.space === (space?.id ?? null)) return prev;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  return { cwd: norm(pane?.cwd || f?.cwd || space?.folder || null), on, space: space?.id ?? null };
}

// Whether this panel's block is on screen: no hidden ancestor, and the active child of
// every stack on the way. A copy that isn't in the layout (a mod pane) counts as shown.
function shown() {
  let found = false;
  const walk = (node, visible) => {
    if (!node || found) return null;
    visible = visible && !node.hidden;
    if (node.content?.mod === MOD) { found = true; return visible; }
    const kids = node.children ?? [];
    for (const child of kids) {
      const active = node.type !== "stack" || (node.active ?? kids[0]?.id) === child.id;
      const r = walk(child, visible && active);
      if (r !== null) return r;
    }
    return null;
  };
  const r = walk(layout(), true);
  return found ? r : true;
}

// The wide copy lives in a tab: shown while that tab is the one in front.
function tabShown() {
  const tab = spaces().find(s => s.active)?.tabs.find(t => t.active);
  return Boolean(tab) && panes().some(p => p.tab === tab.id && p.mod === MOD);
}

// Prints the git root ("G ...") and the beads workspace ("B ..."): the first folder from
// here up to the git root whose .beads is a real database (metadata.json / config.yaml;
// a bare ~/.beads with only eventsData is not one). A git worktree without its own falls
// back to the main checkout's. Outside git it walks up to /.
const RESOLVE = [
  'ok() { [ -f "$1/.beads/metadata.json" ] || [ -f "$1/.beads/config.yaml" ]; }',
  'd=$(pwd -P); g=$(git rev-parse --show-toplevel 2>/dev/null); echo "G $g"; echo "U $(git config user.name 2>/dev/null)"',
  'while :; do if ok "$d"; then echo "B $d"; exit 0; fi; [ "$d" = "${g:-/}" ] && break; [ "$d" = / ] && break; d=$(dirname "$d"); done',
  'c=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null | tail -n 1); case "$c" in /*) ;; *) c=;; esac; if [ -n "$c" ]; then m=$(dirname "$c"); if [ "$m" != "$g" ] && ok "$m"; then echo "B $m"; fi; fi',
  'exit 0',
].join("\n");

const firstLine = (text) => (text || "").split("\n").map(l => l.trim()).find(Boolean)?.replace(/^Error:\s*/, "") ?? "";
function parseJson(stdout) {
  const i = stdout.search(/[[{]/);
  if (i < 0) throw new Error(firstLine(stdout) || tx("bd lieferte kein JSON"));
  return JSON.parse(stdout.slice(i));
}
function ago(iso) {
  const t = Date.parse(iso);
  if (!t) return "";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 90) return tx("gerade");
  if (s < 3600) return tx("vor {n} min", { n: Math.round(s / 60) });
  if (s < 86400 * 2) return tx("vor {n} h", { n: Math.round(s / 3600) });
  if (s < 86400 * 60) return tx("vor {n} T", { n: Math.round(s / 86400) });
  return new Date(t).toISOString().slice(0, 10);
}
// Short age: 5m, 8h, 2d, 3w, 4mo.
function age(ms) {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  if (s < 86400 * 60) return `${Math.floor(s / 604800)}w`;
  return `${Math.floor(s / 2592000)}mo`;
}
const ageOf = (iso) => { const ms = Date.parse(iso ?? ""); return ms ? age(ms) : ""; };
const base = (path) => (path || "").replace(/\/+$/, "").split("/").pop() || path;
const under = (path, dir) => {
  if (!dir || !path) return false;
  if (isWinPath(path)) { path = path.toLowerCase(); dir = dir.toLowerCase(); }
  return path === dir || path.startsWith(dir.endsWith("/") ? dir : dir + "/");
};
// Map as a small LRU: re-inserting moves a key to the end, the oldest go past `max`.
function put(map, key, value, max) {
  map.delete(key); map.set(key, value);
  while (map.size > max) map.delete(map.keys().next().value);
}
// The issue-id prefix every row shares ("app-", "my-project-"), so rows show what differs.
function commonPrefix(ids) {
  if (!ids.length) return "";
  let p = ids[0];
  for (const id of ids) { let i = 0; while (i < p.length && p[i] === id[i]) i++; p = p.slice(0, i); if (!p) break; }
  return p.slice(0, p.lastIndexOf("-") + 1);
}
const strip = (id, prefix) => prefix && id.startsWith(prefix) ? id.slice(prefix.length) : id;
const matches = (i, q) => `${i.id} ${i.title ?? ""} ${(i.labels ?? []).join(" ")} ${i.assignee ?? ""} ${i.issue_type ?? ""}`.toLowerCase().includes(q);
const initials = (name) => name.trim().split(/[\s._@-]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?";
// A name as git and bd may each spell it ("janlink" / "Jan Link").
const squash = (name) => name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
function hash(text) { let h = 0; for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }

// ---- tree ----

const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true });
const byPriority = (a, b) => (a.priority ?? 9) - (b.priority ?? 9) || (RANK[a.status] ?? 5) - (RANK[b.status] ?? 5) || natural(a.id, b.id);
const byClosed = (a, b) => (b.closed_at ?? b.updated_at ?? "").localeCompare(a.closed_at ?? a.updated_at ?? "");

// An issue's parent: bd's `parent`, else its parent-child dependency; only one in the set.
function parentOf(i, byId) {
  const p = i.parent ?? (i.dependencies ?? []).find(d => d.type === "parent-child")?.depends_on_id;
  return p && p !== i.id && byId.has(p) ? p : null;
}

// Parents and children of one load, each issue's state (blocked when it waits on an open
// one) and, per parent, its descendants counted by state.
function buildTree(issues) {
  const byId = new Map(issues.map(i => [i.id, i])), kids = new Map(), up = new Map(), roots = [];
  for (const i of issues) {
    const p = parentOf(i, byId);
    if (!p) { roots.push(i); continue; }
    up.set(i.id, p);
    if (!kids.has(p)) kids.set(p, []);
    kids.get(p).push(i);
  }
  const notClosed = new Set(issues.filter(i => i.status !== "closed").map(i => i.id));
  const state = (i) => {
    if (i.status === "closed" || i.status === "in_progress" || i.status === "deferred" || i.status === "blocked") return i.status;
    return (i.dependencies ?? []).some(d => d.type === "blocks" && notClosed.has(d.depends_on_id)) ? "blocked" : "open";
  };
  const stats = new Map();
  const count = (id) => {
    if (stats.has(id)) return stats.get(id);
    const s = { closed: 0, in_progress: 0, blocked: 0, open: 0, total: 0 };
    stats.set(id, s); // set first: a parent cycle in the data sees a partial count, not a loop
    for (const c of kids.get(id) ?? []) {
      const st = state(c);
      s[st in s ? st : "open"]++; s.total++;
      const cs = count(c.id);
      s.closed += cs.closed; s.in_progress += cs.in_progress; s.blocked += cs.blocked; s.open += cs.open; s.total += cs.total;
    }
    return s;
  };
  for (const id of kids.keys()) count(id);
  return { byId, kids, up, roots, state, stats };
}

// Priority as a colour (the overview's left edges).
const prioColor = (p, t) => [t.ansi1, t.ansi3, t.ansi3 + "88", t.dim, t.border][p] ?? t.border;

export default class Beads extends View {
  init(_props, cx) {
    const p = props() ?? {};
    this.wide = Boolean(p.wide);
    // Opened wide from the panel: that repo, whatever is focused later.
    this.fixed = p.cwd ? { cwd: norm(p.cwd), on: p.on ?? null, space: null } : null;
    this.lastLoc = null;
    const stored = localStorage.getItem("view");
    this.view = VIEWS.some(v => v.id === stored && (this.wide || !v.wide)) ? stored : this.wide ? "overview" : "tree";
    this.showClosed = localStorage.getItem("closed") === "1";
    let quick = [];
    try { quick = JSON.parse(localStorage.getItem("quick") ?? "[]"); } catch {}
    this.quick = new Set(Array.isArray(quick) ? quick.filter(k => typeof k === "string" && k[1] === ":") : []);
    this.quickOpen = localStorage.getItem("quickOpen") === "1"; // narrow: all chips, not only the active
    this.filtering = false; this.pass = () => true;
    this.roots = new Map();   // `${on}|${cwd}` -> { beads, git, at, error }
    this.lists = new Map();   // `${on}|${root}|${data}` -> { issues, at, error, ms }
    this.details = new Map(); // `${on}|${root}|${id}` -> { data (bd show), at }
    this.detailBusy = new Set();
    this.collapsed = new Set();  // tree: parents folded by hand
    this.closedOpen = new Set(); // tree: parents ("" for the top) whose closed children show
    this.treeCache = null; this.curTree = null;
    this.pendingReveal = null; this.scrollTo = null; this.hoverId = null; this.peek = null;
    this.factCache = null; this.countCache = null; this.ovCache = null;
    // Wide list: grouping, sort, groups folded by hand (closed is folded unless listed here).
    const group = localStorage.getItem("group");
    this.group = GROUPS.some(g => g[0] === group) ? group : "none";
    let sort = null;
    try { sort = JSON.parse(localStorage.getItem("sort") ?? "null"); } catch {}
    this.sort = sort && SORTS.includes(sort.key) ? { key: sort.key, desc: Boolean(sort.desc) } : { key: "auto", desc: false };
    this.groupFold = new Set();
    this.listCache = null; this.listW = null; this.seen = null; this.noHover = false;
    this.vscroll = VirtualListScrollHandle.new();
    this.open = null; this.confirm = null; this.acting = null; this.note = null;
    this.filter = ""; this.typing = false; this.loading = false; this.queue = null;
    this.limit = ROWS; this.repoKey = null; this.size = null; this.treeW = null;
    this.handle = cx.focus_handle();
    this.scroll = ScrollHandle.new();
    this.bdBin = new Map();  // machine -> { cmd, pre } (or { missing, at })
    // Language: an override (props, beads-dashboard.lang) wins; else what the system was found to be last time, checked again now.
    const pick = p.lang ?? localStorage.getItem("lang");
    this.langFixed = pick === "de" || pick === "en";
    lang = this.langFixed ? pick : localStorage.getItem("lang.auto") === "de" ? "de" : "en";
    this.makeInput();
    if (!this.langFixed) this.detectLang(cx);
    cx.timer.every(TICK, (cx) => this.tick(cx));
    // keys.json can bind "beads-dashboard.<command>" (shown copies only).
    cx.spawn(async (cx) => { for (;;) { const c = await nextCommand(); this.command(String(c), cx); cx.notify(); } });
  }

  // The filter field (again when the language changes: its placeholder is fixed when made).
  makeInput() {
    this.input = InputState.new({ placeholder: tx("Filtern…"), value: this.filter ?? "" });
    this.input.on("change", (_e, cx) => { this.filter = this.input.value(); this.limit = ROWS; cx.notify(); });
    this.input.on("focus", (_e, cx) => { this.typing = true; cx.notify(); });
    this.input.on("blur", (_e, cx) => { this.typing = false; cx.notify(); });
  }

  setLang(next, cx) {
    if (next === lang) return;
    lang = next;
    this.makeInput();
    cx.notify();
  }

  // The system's language: German if it is set to German, else English. Kept for the next start.
  detectLang(cx) {
    cx.spawn(async (cx) => {
      let code = "";
      try {
        const os = String(process.platform);
        if (os === "windows" || os === "win32") {
          const r = await exec("reg", ["query", "HKCU\\Control Panel\\International", "/v", "LocaleName"]);
          code = (r.stdout.match(/LocaleName\s+REG_SZ\s+(\S+)/) ?? [])[1] ?? "";
        } else if (os === "macos" || os === "darwin") {
          code = (await exec("defaults", ["read", "-g", "AppleLocale"])).stdout.trim();
        } else {
          code = (await exec("sh", ["-c", 'echo "${LC_ALL:-${LC_MESSAGES:-$LANG}}"'])).stdout.trim();
        }
      } catch {}
      const next = /^de/i.test(code) ? "de" : "en";
      try { localStorage.setItem("lang.auto", next); } catch {}
      if (!this.langFixed) this.setLang(next, cx);
    });
  }

  location() {
    if (this.fixed) return this.fixed;
    this.lastLoc = location(this.lastLoc);
    return this.lastLoc;
  }

  command(c, cx) {
    const i = c.indexOf(":"), name = i < 0 ? c : c.slice(0, i), arg = i < 0 ? undefined : c.slice(i + 1);
    if (name === "focus") { this.handle.focus(); return; }
    if (name === "lang") {
      this.langFixed = arg === "de" || arg === "en";
      try { localStorage.setItem("lang", this.langFixed ? arg : ""); } catch {}
      if (this.langFixed) this.setLang(arg, cx); else this.detectLang(cx);
      return;
    }
    if (name === "view" && VIEWS.some(v => v.id === arg)) return this.setView(arg, cx);
    if (name === "refresh") return this.reload(cx);
    if (name === "wide") return this.openWide();
    if (name === "filter") { this.input.set_value(arg ?? ""); this.filter = arg ?? ""; this.limit = ROWS; return; }
    if (name === "show") return this.revealIssue(arg, cx);
    if (name === "quick") return this.toggleQuick(arg || null, cx);
    if (name === "next") return this.nav("down", cx);
    if (name === "prev") return this.nav("up", cx);
    if (name === "fold") return this.nav(this.open && !this.collapsed.has(this.open) ? "left" : "right", cx);
    const issue = (this.rows ?? []).find(i => i.id === this.open);
    if (!issue) return;
    if (name === "start" && issue.status !== "closed" && issue.status !== "in_progress") this.act(issue, "start", cx);
    else if (name === "close" && issue.status !== "closed") this.act(issue, "close", cx);
    else if (name === "reopen" && issue.status === "closed") this.act(issue, "reopen", cx);
    else if (name === "copy") this.copy(issue.id, cx);
    else if (name === "insert") this.insert(issue.id, cx);
  }

  // Arrow keys (and beads-dashboard.next/prev/fold): up/down move the selection, right unfolds a
  // parent or steps into it, left folds it or steps out to the parent, escape closes.
  nav(key, cx) {
    const rows = this.rows ?? [];
    const at = rows.findIndex(i => i.id === this.open);
    const tree = this.view === "tree" ? this.curTree : null;
    if (key === "escape") {
      if (!this.open) return false;
      this.open = null; this.confirm = null; cx.notify();
      return true;
    }
    if (!rows.length) return false;
    if (key === "down" || key === "up") {
      const n = key === "down" ? (at < 0 ? 0 : Math.min(rows.length - 1, at + 1)) : (at < 0 ? rows.length - 1 : Math.max(0, at - 1));
      this.select(rows[n], cx);
      return true;
    }
    if (!tree || at < 0 || (key !== "left" && key !== "right")) return false;
    const id = rows[at].id, parent = tree.kids.has(id), filtered = this.filtering;
    const folded = parent && !filtered && this.collapsed.has(id);
    if (key === "right") {
      if (!parent) return true;
      if (folded) { this.collapsed.delete(id); this.scrollTo = id; }
      else { const next = rows[at + 1]; if (next && tree.up.get(next.id) === id) this.select(next, cx); }
    } else if (parent && !folded && !filtered) { this.collapsed.add(id); this.scrollTo = id; }
    else { const up = tree.byId.get(tree.up.get(id)); if (up) this.select(up, cx); }
    cx.notify();
    return true;
  }

  // One bd (or sh) call in flight at a time, for every view and action of this copy.
  async serial(fn) {
    while (this.queue) await this.queue;
    const p = fn();
    this.queue = p.then(() => {}, () => {}).then(() => { this.queue = null; });
    return p;
  }

  bd(args, cwd, on) {
    return this.serial(async () => {
      const b = await this.bdFor(on, isWinPath(cwd));
      if (!b) { const e = new Error(NO_BD); e.noBd = true; throw e; }
      return exec(b.cmd, [...b.pre, ...args], { cwd, on });
    });
  }

  // How to run bd on a machine, found once (a miss is asked again after a while or on reload).
  async bdFor(on, win) {
    const key = `${on}|${win}`, known = this.bdBin.get(key);
    if (known && !(known.missing && Date.now() - known.at > ERR_RETRY)) return known.missing ? null : known;
    let found = null;
    if (win) {
      try {
        const lines = (await exec("where", ["bd"], { on })).stdout.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const exe = lines.find(l => /\.exe$/i.test(l)), script = lines.find(l => /\.(cmd|bat)$/i.test(l));
        if (exe) found = { cmd: exe, pre: [] };
        else if (script) found = { cmd: "cmd", pre: ["/d", "/c", script] };
      } catch {}
      for (const rel of on ? [] : BD_WIN) {
        if (found) break;
        const cmd = `${home()}\\${rel}`;
        try { if ((await exec(cmd, ["version"], { on })).code === 0) found = { cmd, pre: [] }; } catch {}
      }
    } else {
      try {
        const out = (await exec("sh", ["-c", BD_FIND], { on })).stdout.split("\n").map(l => l.trim()).filter(l => l.startsWith("/"));
        if (out.length) found = { cmd: out[out.length - 1], pre: [] };
      } catch {}
    }
    put(this.bdBin, key, found ?? { missing: true, at: Date.now() }, 20);
    return found;
  }

  // Where the repo and its beads are, from a folder: git root, beads workspace, git user.
  // Unix: one sh call (RESOLVE). Windows: the same walk, with git and file reads.
  async resolve(cwd, on) {
    if (!isWinPath(cwd)) {
      const r = await exec("sh", ["-c", RESOLVE], { cwd, on });
      const out = r.stdout.split("\n");
      const line = (p) => out.find(l => l.startsWith(p))?.slice(2).trim() || null;
      return { beads: line("B "), git: line("G "), user: line("U "), at: Date.now() };
    }
    const git = async (args) => { try { const r = await exec("git", args, { cwd, on }); return r.code === 0 ? r.stdout.trim() : ""; } catch { return ""; } };
    const has = async (f) => { try { return (await readTextFile(f, { on })) !== null; } catch { return false; } };
    const ok = async (d) => (await has(`${d}/.beads/metadata.json`)) || (await has(`${d}/.beads/config.yaml`));
    const g = norm(await git(["rev-parse", "--show-toplevel"])) || null;
    const user = (await git(["config", "user.name"])) || null;
    const done = (beads) => ({ beads, git: g, user, at: Date.now() });
    for (let d = norm(cwd); ; ) {
      if (await ok(d)) return done(d);
      if (samePath(d, g)) break;
      const up = parentDir(d);
      if (up === d) break;
      d = up;
    }
    // git before 2.31 echoes the unknown --path-format option as a line of its own: keep the last line, and only an absolute path.
    const commonRaw = (await git(["rev-parse", "--path-format=absolute", "--git-common-dir"])).split("\n").pop()?.trim() ?? "";
    const common = isWinPath(commonRaw) ? norm(commonRaw) : null;
    if (common) { const m = parentDir(common); if (!samePath(m, g) && await ok(m)) return done(m); }
    return done(null);
  }

  // What the panel should show now, and whether any of it is missing or old. Until the
  // exact folder is resolved, a known repo that contains it stands in (a cd inside a repo
  // keeps the list on screen instead of blanking it).
  wanted() {
    const loc = this.location(), rootKey = `${loc.on}|${loc.cwd}`, exact = this.roots.get(rootKey);
    let root = exact ?? null;
    if (!root && loc.cwd) {
      let best = 0;
      for (const [k, r] of this.roots) {
        if (!k.startsWith(`${loc.on}|`) || r.error) continue;
        for (const dir of [r.beads, r.git]) if (dir && dir.length > best && under(loc.cwd, dir)) { best = dir.length; root = r; }
      }
    }
    const listKey = root?.beads ? `${loc.on}|${root.beads}|${dataOf(this.view)}` : null;
    return { loc, rootKey, root, exact: Boolean(exact), listKey, list: listKey ? this.lists.get(listKey) : null };
  }

  old(entry, now = Date.now()) {
    return !entry || now - entry.at > (entry.error ? ERR_RETRY : STALE);
  }

  reload(cx) {
    this.bdBin.clear();
    for (const v of this.lists.values()) v.at = 0;
    for (const d of this.details.values()) d.at = 0;
    this.roots.clear();
    this.refresh(cx);
  }

  tick(cx) {
    const now = Date.now();
    if (this.note && now - this.note.at > NOTE_MS) { this.note = null; cx.notify(); }
    if (!(this.wide ? tabShown() : shown())) return;
    const w = this.wanted();
    if (!w.loc.cwd) return;
    if (this.open && w.root?.beads) {
      const key = `${w.loc.on}|${w.root.beads}|${this.open}`, d = this.details.get(key);
      if (d && now - d.at > STALE) this.fetchDetail(key, this.open, w.root.beads, w.loc.on, cx);
    }
    if (this.loading) return;
    const rootOld = !w.exact || now - w.root.at > ROOT_STALE;
    if (rootOld || (w.listKey && this.old(w.list, now))) this.refresh(cx);
  }

  refresh(cx) {
    if (this.loading) return;
    this.loading = true;
    cx.spawn(async (cx) => {
      try {
        // Until what's wanted stops changing (a tab switch while bd ran).
        for (let i = 0; i < 3; i++) {
          const w = this.wanted(), now = Date.now();
          const { cwd, on } = w.loc;
          if (!cwd) break;
          let root = w.exact ? w.root : null;
          if (!root || now - root.at > ROOT_STALE) {
            try {
              root = await this.serial(() => this.resolve(cwd, on));
            } catch (e) { root = { beads: null, git: null, error: firstLine(String(e)), at: Date.now() }; }
            put(this.roots, w.rootKey, root, 100);
            cx.notify();
          }
          if (!root.beads) break;
          const data = dataOf(this.view), listKey = `${on}|${root.beads}|${data}`, old = this.lists.get(listKey);
          if (!this.old(old)) { if (this.wanted().listKey === listKey) break; continue; }
          const started = Date.now();
          let entry;
          try {
            const r = await this.bd(["--readonly", ...LOADS[data]], root.beads, on);
            if (r.code !== 0) throw new Error(firstLine(r.stderr) || firstLine(r.stdout) || tx("bd endete mit {n}", { n: r.code }));
            const issues = parseJson(r.stdout);
            // `at` is when the load started, so the next tick after STALE reloads it.
            entry = { issues: Array.isArray(issues) ? issues : [], at: started, ms: Date.now() - started, error: null };
          } catch (e) {
            entry = { issues: old?.issues ?? null, at: Date.now(), error: firstLine(String(e?.message ?? e)), noBd: Boolean(e?.noBd) };
          }
          put(this.lists, listKey, entry, 12);
          cx.notify();
          if (this.wanted().listKey === listKey) break;
        }
      } finally { this.loading = false; cx.notify(); }
    });
  }

  setView(id, cx) {
    if (this.view === id || !VIEWS.some(v => v.id === id && (this.wide || !v.wide))) return;
    this.view = id; this.confirm = null; this.limit = ROWS;
    if (this.open) this.scrollTo = this.open;
    // The narrow panel shows the detail under its row: a view switch starts without one.
    if (!this.wide) this.open = null;
    try { localStorage.setItem("view", id); } catch {}
    this.tick(cx); cx.notify();
  }

  // The panel's repo in its own tab, full width, opening on the overview.
  openWide() {
    const w = this.wanted();
    if (!w.root?.beads) return;
    run("tab.new", { name: `Beads · ${base(w.root.beads)}`, mod: MOD, props: { wide: true, cwd: w.root.beads, on: w.loc.on } });
  }

  // The tree of one load, built once per load.
  treeFor(issues) {
    if (this.treeCache?.issues !== issues) this.treeCache = { issues, tree: buildTree(issues) };
    return this.treeCache.tree;
  }

  // An issue shown in the tree: its parents unfolded, its closed group open, selected and
  // scrolled to. The tree does it when it draws (its load may still be on the way).
  revealIssue(id, cx) {
    if (!id) return;
    if (this.view !== "tree") {
      this.view = "tree"; this.limit = ROWS;
      try { localStorage.setItem("view", "tree"); } catch {}
    }
    if (this.filter) { this.input.set_value(""); this.filter = ""; }
    this.pendingReveal = id;
    this.tick(cx); cx.notify();
  }

  ensureDetail(id, cx) {
    const w = this.wanted();
    if (!id || !w.root?.beads) return;
    const key = `${w.loc.on}|${w.root.beads}|${id}`, d = this.details.get(key);
    if (!d || Date.now() - d.at > STALE) this.fetchDetail(key, id, w.root.beads, w.loc.on, cx);
  }

  fetchDetail(key, id, cwd, on, cx) {
    if (this.detailBusy.has(key)) return;
    this.detailBusy.add(key);
    cx.spawn(async (cx) => {
      const started = Date.now();
      try {
        const r = await this.bd(["--readonly", "show", id, "--json"], cwd, on);
        if (r.code !== 0) throw new Error(firstLine(r.stderr));
        const d = parseJson(r.stdout);
        put(this.details, key, { data: Array.isArray(d) ? d[0] : d, at: started }, 50);
      } catch {
        // Keep what was shown; try again after the next STALE.
        const prev = this.details.get(key);
        put(this.details, key, { data: prev?.data ?? null, at: Date.now() }, 50);
      } finally { this.detailBusy.delete(key); cx.notify(); }
    });
  }

  select(issue, cx) {
    if (this.open !== issue.id) { this.open = issue.id; this.confirm = null; }
    this.ensureDetail(issue.id, cx);
    this.scrollTo = issue.id;
    cx.notify();
  }

  toggle(issue, cx) {
    if (this.open === issue.id) { this.open = null; this.confirm = null; cx.notify(); }
    else this.select(issue, cx);
  }

  click(issue, cx) {
    this.handle.focus();
    // Wide: the detail is beside, a click selects; narrow: it opens and closes under the row.
    if (this.wide) this.select(issue, cx); else this.toggle(issue, cx);
  }

  hover(id, on, cx) {
    if (on) { if (this.hoverId !== id) { this.hoverId = id; cx.notify(); } }
    else if (this.hoverId === id) { this.hoverId = null; cx.notify(); }
  }

  say(text, error, cx) {
    const w = this.wanted();
    this.note = { text, error, at: Date.now(), repo: w.root?.beads ? `${w.loc.on}|${w.root.beads}` : null };
    cx.notify();
  }

  // Start / close / reopen: the only writes, each one bd call, then everything of this repo reloads.
  act(issue, kind, cx) {
    const w = this.wanted();
    if (!w.root?.beads || this.acting) return;
    if (kind === "close" && this.confirm !== issue.id) { this.confirm = issue.id; cx.notify(); return; }
    this.confirm = null;
    const on = w.loc.on, root = w.root.beads, id = issue.id, repo = `${on}|${root}`;
    const args = kind === "start" ? ["update", id, "--status", "in_progress"] : kind === "close" ? ["close", id] : ["reopen", id];
    const done = tx({ start: "gestartet", close: "geschlossen", reopen: "wieder geöffnet" }[kind]);
    this.acting = id; this.note = null;
    cx.spawn(async (cx) => {
      try {
        const r = await this.bd([...args, "--json"], root, on);
        if (r.code !== 0) throw new Error(firstLine(r.stderr) || firstLine(r.stdout) || tx("bd endete mit {n}", { n: r.code }));
        this.note = { text: `${id} ${done}`, error: false, at: Date.now(), repo };
      } catch (e) { this.note = { text: `${id}: ${e?.noBd ? tx("bd nicht gefunden") : firstLine(String(e?.message ?? e))}`, error: true, at: Date.now(), repo }; }
      finally {
        for (const [k, v] of this.lists) if (k.startsWith(`${repo}|`)) v.at = 0;
        for (const [k, v] of this.details) if (k.startsWith(`${repo}|`)) v.at = 0;
        this.acting = null;
        this.refresh(cx);
        if (this.open === id) this.ensureDetail(id, cx);
        cx.notify();
      }
    });
    cx.notify();
  }

  copy(id, cx) {
    cx.write_to_clipboard(id);
    this.say(tx("{id} kopiert", { id }), false, cx);
  }

  insert(id, cx) {
    const terminal = focused()?.terminal || this.lastTerminal;
    if (!terminal) { this.copy(id, cx); return; }
    cx.write_to_clipboard(id);
    run("pane.focus", { terminal });
    run("terminal.paste");
    this.say(tx("{id} ins Terminal eingefügt", { id }), false, cx);
  }

  // ---- filter ----

  // A chip on or off (null: all off).
  toggleQuick(key, cx) {
    if (key === null) this.quick.clear();
    else if (this.quick.has(key)) this.quick.delete(key);
    else this.quick.add(key);
    this.limit = ROWS;
    if (this.open) this.scrollTo = this.open;
    try { localStorage.setItem("quick", JSON.stringify([...this.quick])); } catch {}
    cx.notify();
  }

  // Per issue, once per load: its state (ready, blocked, ...) and its assignee as compared.
  // Every chip, count and card asks these; worked out per ask they cost a render its budget.
  facts(issues, isBlocked) {
    const ready = this.view === "ready";
    const c = this.factCache;
    if (c && c.issues === issues && c.ready === ready) return c;
    const state = new Map(), who = new Map();
    for (const i of issues) {
      state.set(i, i.status === "closed" || i.status === "in_progress" || i.status === "deferred" ? i.status : isBlocked(i) ? "blocked" : "open");
      who.set(i, i.assignee ? squash(i.assignee) : "");
    }
    return (this.factCache = { issues, ready, state, who });
  }

  // What the filter (text and chips) is now, as one string: a cache key.
  filterKey() {
    return `${this.filter.trim().toLowerCase()}\u0000${[...this.quick].sort().join(",")}`;
  }

  // Whether an issue fits one chip. `ctx`: the state per issue and who "Mir" is.
  quickTest(key, i, ctx) {
    const g = key[0], v = key.slice(2);
    if (g === "s") return ctx.stateOf(i) === v;
    if (g === "p") return String(i.priority) === v;
    if (g === "w") return v === "none" ? !i.assignee : Boolean(ctx.me) && Boolean(i.assignee) && ctx.whoOf(i) === ctx.me;
    if (g === "t") return i.issue_type === v;
    if (g === "l") return (i.labels ?? []).includes(v);
    return true;
  }

  // The text and the chips as one test, null when nothing filters. `skip`: a group left
  // out (to count what each of its chips would give).
  filterFn(ctx, skip = null) {
    const q = this.filter.trim().toLowerCase(), groups = new Map();
    for (const k of this.quick) {
      if (k[0] === skip) continue;
      if (!groups.has(k[0])) groups.set(k[0], []);
      groups.get(k[0]).push(k);
    }
    if (!q && !groups.size) return null;
    const all = [...groups.values()];
    return (i) => (!q || matches(i, q)) && all.every(keys => keys.some(k => this.quickTest(k, i, ctx)));
  }

  noMatch() {
    const q = this.filter.trim();
    return q ? tx("Keine Treffer für „{q}“", { q }) + (this.quick.size ? tx(" mit den Schnellfiltern") : "") : tx("Keine Treffer für die Schnellfilter");
  }

  // The chips this data offers, each with how many it would give: status, P0-P2, me and
  // nobody, the types there are, the most used labels of open issues. Narrow and folded:
  // only the active ones.
  quickBar(issues, ctx, t) {
    const all = this.wide || this.quickOpen;
    if (!all && !this.quick.size) return null;
    const types = new Map(), labels = new Map();
    for (const i of issues) {
      if (i.issue_type) types.set(i.issue_type, (types.get(i.issue_type) ?? 0) + 1);
      if (i.status !== "closed") for (const l of i.labels ?? []) labels.set(l, (labels.get(l) ?? 0) + 1);
    }
    const chips = [
      ...QSTATE.map(([v, label]) => ({ key: `s:${v}`, label: tx(label), state: v })),
      ...[0, 1, 2].map(p => ({ key: `p:${p}`, label: `P${p}`, prio: p })),
      ...(ctx.user ? [{ key: "w:me", label: tx("Mir"), who: ctx.user }] : []),
      { key: "w:none", label: tx("Niemand") },
      ...[...types.keys()].sort((a, b) => types.get(b) - types.get(a)).map(v => ({ key: `t:${v}`, label: v, type: v })),
      ...[...labels].sort((a, b) => b[1] - a[1] || natural(a[0], b[0])).slice(0, this.wide ? 8 : 6).map(([v]) => ({ key: `l:${v}`, label: v, tag: true })),
    ];
    // Active ones this data doesn't offer (a label of another repo) stay, to be switched off.
    for (const k of this.quick) if (!chips.some(c => c.key === k)) chips.push({ key: k, label: k.slice(2), tag: k[0] === "l" });
    chips.sort((a, b) => "spwtl".indexOf(a.key[0]) - "spwtl".indexOf(b.key[0]));

    // Counts change only with the data and the filter; kept between renders.
    const ck = `${this.filterKey()}\u0000${ctx.me}`;
    if (this.countCache?.issues !== issues || this.countCache.key !== ck) this.countCache = { issues, key: ck, n: new Map() };
    const known = this.countCache.n;
    const fns = new Map();
    const count = (key) => {
      if (known.has(key)) return known.get(key);
      const g = key[0];
      if (!fns.has(g)) fns.set(g, this.filterFn(ctx, g));
      const f = fns.get(g);
      let n = 0;
      for (const i of issues) if ((!f || f(i)) && this.quickTest(key, i, ctx)) n++;
      known.set(key, n);
      return n;
    };
    const items = [];
    let last = null;
    for (const c of chips) {
      const on = this.quick.has(c.key);
      if (!all && !on) continue;
      const n = count(c.key);
      if (!on && n === 0) continue;
      if (last !== null && last !== c.key[0]) items.push(div().w(1).h(14).mx(3).flex_none().bg(t.border));
      last = c.key[0];
      const typeColor = c.type ? t[(TYPES[c.type] ?? ["", "muted"])[1]] ?? t.muted : null;
      items.push(h_flex().id(`q-${c.key}`).h(22).px(8).gap(5).flex_none().items_center().rounded(11).cursor_pointer().text_size(11.5)
        .border_1().border_color(on ? t.accent : t.border).bg(on ? t.accent + "26" : t.background)
        .text_color(on ? t.foreground : t.muted).hover(s => s.text_color(t.foreground).bg(on ? t.accent + "38" : t.hover))
        .tooltip(`${tx(QGROUP[c.key[0]] ?? "")}: ${c.key === "s:open" ? tx("offen und nicht blockiert") : c.key === "w:me" ? ctx.user : c.label}\n${on ? tx("Klick: Filter aus") : tx("Klick: nur diese (mit anderen der Gruppe: oder)")}`)
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click((_e, cx) => { cx.stop_propagation(); this.toggleQuick(c.key, cx); })
        .when(Boolean(c.state), el => el.child(this.status(c.state, t, 10)))
        .when(c.prio !== undefined, el => el.child(div().size(7).flex_none().rounded_full().bg(prioColor(c.prio, t))))
        .when(Boolean(c.who), el => el.child(this.avatar(c.who, t, 14)))
        .when(Boolean(typeColor), el => el.child(div().size(7).flex_none().rounded(2).bg(typeColor)))
        .when(Boolean(c.tag), el => el.child(div().text_color(t.dim).child("#")))
        .child(c.label)
        .child(div().text_size(10.5).text_color(on ? t.muted : t.dim).child(String(n))));
    }
    if (this.quick.size) {
      items.push(div().id("q-clear").h(22).px(7).flex_none().flex().items_center().rounded(11).cursor_pointer().text_size(11.5)
        .text_color(t.dim).hover(s => s.bg(t.hover).text_color(t.foreground)).tooltip(tx("Alle Schnellfilter aus"))
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click((_e, cx) => { cx.stop_propagation(); this.toggleQuick(null, cx); })
        .child(tx("× zurücksetzen")));
    }
    if (!items.length) return null;
    return h_flex().id("beads-quick").flex_none().flex_wrap().px(8).py(6).gap(4).items_center().border_b(1).border_color(t.border).children(items);
  }

  // ---- small parts ----

  badge(p, t) {
    const label = `P${p ?? "?"}`;
    const el = div().w(24).h(17).flex_none().flex().items_center().justify_center().rounded(4).text_size(10.5).font_semibold();
    if (p === 0) return el.bg(t.ansi1).text_color(t.background).child(label);
    if (p === 1) return el.bg(t.ansi3 + "38").text_color(t.ansi3).child(label);
    if (p === 2) return el.bg(t.ansi4 + "24").text_color(t.ansi4).child(label);
    if (p === 3) return el.bg(t.raised).text_color(t.muted).child(label);
    return el.border_1().border_color(t.border).text_color(t.dim).child(label);
  }

  statusColor(status, t) {
    return { open: t.muted, in_progress: t.working, blocked: t.ansi1, closed: t.ansi2, deferred: t.dim }[status] ?? t.muted;
  }

  // The status as a shape: ring (open), half-filled (in progress), struck (blocked),
  // tick (closed), dashed (deferred).
  status(status, t, size = 11) {
    return svg(`${DIR}/st-${GLYPH[status] ?? "open"}.svg`).size(size).flex_none().text_color(this.statusColor(status, t));
  }

  typePill(issue, t) {
    const color = t[(TYPES[issue.issue_type] ?? ["", "muted"])[1]] ?? t.muted;
    return div().h(18).px(7).flex_none().flex().items_center().rounded(4).bg(color + "22").text_color(color).text_size(11).child(issue.issue_type ?? "");
  }

  avatar(name, t, size = 18) {
    const color = t[AVATAR[hash(name) % AVATAR.length]] ?? t.muted;
    return div().size(size).flex_none().flex().items_center().justify_center().rounded_full().bg(color + "30").text_color(color)
      .text_size(Math.round(size * 0.47)).font_semibold().child(initials(name));
  }

  chip(text, t) {
    return div().h(17).px(6).flex_none().flex().items_center().rounded(9).bg(t.raised).text_size(10.5).text_color(t.muted).child(text);
  }

  // The descendants by state as one bar (done, in progress, blocked; the rest is open) and "12/39".
  // `id` null: no tooltip (a virtual list's rows take no handlers).
  progress(id, s, t, w, mono) {
    const total = s.total || 1;
    const segs = [["closed", t.ansi2], ["in_progress", t.working], ["blocked", t.ansi1]]
      .filter(([k]) => s[k] > 0).map(([k, c]) => div().h_full().flex_none().w(Math.max(2, Math.round(w * s[k] / total))).bg(c));
    const tip = [tx("{a} von {b} Unter-Issues erledigt", { a: s.closed, b: s.total }), s.in_progress && tx("{n} in Arbeit", { n: s.in_progress }), s.blocked && tx("{n} blockiert", { n: s.blocked }), s.open && tx("{n} offen", { n: s.open })].filter(Boolean).join("\n");
    return (id === null ? h_flex() : h_flex().id(`prog-${id}`).tooltip(tip)).flex_none().gap(6).items_center()
      .child(h_flex().w(w).h(6).flex_none().rounded(3).overflow_hidden().bg(t.raised).children(segs))
      .child(div().flex_none().font_family(mono).text_size(10.5).text_color(s.closed === s.total ? t.ansi2 : t.muted).child(`${s.closed}/${s.total}`));
  }

  // A small icon button (row actions, tree toolbar, detail pane).
  tool(id, icon, tip, t, onClick, active = false) {
    return div().id(id).size(22).flex_none().flex().items_center().justify_center().rounded(5).cursor_pointer()
      .text_color(active ? t.foreground : t.muted).when(active, el => el.bg(t.raised))
      .hover(s => s.bg(t.raised).text_color(t.foreground)).tooltip(tip)
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => { cx.stop_propagation(); onClick(cx); })
      .child(svg(`${DIR}/${icon}.svg`).size(13));
  }

  // On the hovered row, over its right end: start, copy the id, paste it into the terminal.
  actions(issue, sel, t) {
    const startable = issue.status !== "closed" && issue.status !== "in_progress";
    return h_flex().absolute().top(0).right(0).h_full().pl(6).pr(4).gap(2).items_center().rounded(6).bg(sel ? t.selected : t.hover)
      .when(startable, el => el.child(this.tool(`act-start-${issue.id}`, "play", tx("Starten (in Arbeit)"), t, cx => this.act(issue, "start", cx))))
      .child(this.tool(`act-copy-${issue.id}`, "copy", tx("ID kopieren"), t, cx => this.copy(issue.id, cx)))
      .child(this.tool(`act-term-${issue.id}`, "terminal", tx("ID ins Terminal einfügen"), t, cx => this.insert(issue.id, cx)));
  }

  button(id, label, t, onClick, { primary = false, danger = false, disabled = false } = {}) {
    return div().id(id).h(24).px(9).flex().items_center().rounded(6).text_size(11.5).flex_none()
      .border_1().border_color(danger ? t.ansi1 : primary ? t.solid : t.border)
      .bg(primary ? t.solid : danger ? t.ansi1 + "22" : t.background)
      .text_color(disabled ? t.dim : primary ? t.solid_foreground : danger ? t.ansi1 : t.foreground)
      .when(!disabled, el => el.cursor_pointer().hover(s => s.bg(primary ? t.solid : t.hover)))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => { cx.stop_propagation(); if (!disabled) onClick(cx); })
      .child(label);
  }

  actionButtons(issue, t) {
    const busy = this.acting === issue.id;
    return h_flex().flex_wrap().gap(6)
      .when(issue.status !== "closed" && issue.status !== "in_progress", el => el.child(this.button(`start-${issue.id}`, busy ? "…" : tx("Starten"), t, cx => this.act(issue, "start", cx), { primary: true, disabled: busy })))
      .when(issue.status !== "closed", el => el.child(this.confirm === issue.id
        ? this.button(`close-${issue.id}`, tx("Wirklich schließen?"), t, cx => this.act(issue, "close", cx), { danger: true, disabled: busy })
        : this.button(`close-${issue.id}`, tx("Schließen"), t, cx => this.act(issue, "close", cx), { disabled: busy })))
      .when(issue.status === "closed", el => el.child(this.button(`reopen-${issue.id}`, busy ? "…" : tx("Wieder öffnen"), t, cx => this.act(issue, "reopen", cx), { primary: true, disabled: busy })))
      .child(this.button(`copy-${issue.id}`, tx("ID kopieren"), t, cx => this.copy(issue.id, cx)))
      .child(this.button(`insert-${issue.id}`, "→ Terminal", t, cx => this.insert(issue.id, cx)));
  }

  // What an issue depends on (bd show), each a link into the tree.
  depList(issue, d, t, mono, skipParent = false) {
    const deps = (d.dependencies ?? []).map(x => ({
      id: x.id ?? x.depends_on_id, title: x.title ?? "", status: x.status ?? null, type: x.dependency_type ?? x.type ?? "",
    })).filter(x => x.id && !(skipParent && x.type === "parent-child"));
    if (!deps.length) return null;
    return v_flex().gap(2)
      .child(div().text_size(11).text_color(t.dim).child(tx("Abhängig von")))
      .children(deps.map(x => h_flex().id(`dep-${issue.id}-${x.id}`).gap(6).items_center().h(22).min_w(0).rounded(5).px(4).cursor_pointer().hover(s => s.bg(t.hover))
        .on_click((_e, cx) => { cx.stop_propagation(); this.revealIssue(x.id, cx); })
        .when(Boolean(x.status), r => r.child(this.status(x.status, t, 10)))
        .child(div().flex_none().font_family(mono).text_size(11).text_color(t.dim).child(x.id))
        .child(div().flex_1().min_w(0).truncate().text_size(11.5).child(x.title))
        .when(Boolean(x.type) && x.type !== "blocks", r => r.child(div().flex_none().text_size(10).text_color(t.dim).child(x.type)))));
  }

  // ---- detail under the row (narrow panel) ----

  detail(issue, blocked, key, t, mono) {
    const d = this.details.get(key)?.data ?? issue;
    const status = blocked && issue.status === "open" ? "blocked" : issue.status;
    const labels = d.labels ?? [];
    const meta = (k, v) => h_flex().gap(6).min_w(0).child(div().w(70).flex_none().text_color(t.dim).child(k)).child(div().flex_1().min_w(0).truncate().child(v));
    const text = (d.description || "").trim();
    const deps = this.depList(issue, d, t, mono);
    return v_flex().id(`detail-${issue.id}`).flex_none().mx(4).mt(2).mb(6).p(10).gap(8).rounded(8).bg(t.surface).border_1().border_color(t.border).text_size(12)
      .child(div().text_size(13).font_semibold().whitespace_normal().child(d.title || ""))
      .child(v_flex().gap(3).text_size(11.5).text_color(t.muted)
        .child(meta("ID", div().font_family(mono).text_size(11).child(issue.id)))
        .child(meta("Status", h_flex().gap(6).items_center().child(this.status(status, t, 10)).child(stName(status) ?? status ?? "")))
        .child(meta(tx("Typ"), `${d.issue_type ?? ""} · P${d.priority ?? "?"}`))
        .when(Boolean(d.assignee), el => el.child(meta(tx("Zugewiesen"), d.assignee)))
        .when(Boolean(d.parent), el => el.child(meta(tx("Eltern"), d.parent)))
        .child(meta(tx("Zeit"), tx("erstellt {t}", { t: ago(d.created_at) }) + (d.updated_at && d.updated_at !== d.created_at ? tx(" · geändert {t}", { t: ago(d.updated_at) }) : "") + (d.closed_at ? tx(" · zu {t}", { t: ago(d.closed_at) }) : "")))
        .when(Boolean(d.close_reason), el => el.child(meta(tx("Grund"), d.close_reason))))
      .when(labels.length > 0, el => el.child(h_flex().flex_wrap().gap(4).children(labels.map(l => this.chip(l, t)))))
      .when(Boolean(text), el => el.child(div().max_h(260).overflow_hidden().text_size(12).text_color(t.foreground)
        .child(TextView.markdown(`md-${issue.id}`, text.length > 3000 ? text.slice(0, 3000) + " …" : text))))
      .when(Boolean(deps), el => el.child(deps))
      .when((d.dependent_count ?? 0) > 0, el => el.child(div().text_size(11).text_color(t.dim).child(tx("{n} hängen hiervon ab", { n: d.dependent_count }))))
      .child(this.actionButtons(issue, t).pt(2));
  }

  // ---- detail pane (wide) ----

  panel(issues, isBlocked, loc, root, t, mono) {
    const id = this.open, key = id ? `${loc.on}|${root.beads}|${id}` : null;
    const all = this.lists.get(`${loc.on}|${root.beads}|all`)?.issues ?? null;
    const issue = id ? (issues.find(i => i.id === id) ?? all?.find(i => i.id === id) ?? this.details.get(key)?.data ?? null) : null;
    if (!issue) {
      return v_flex().size_full().items_center().justify_center().gap(8).p(24).bg(t.surface)
        .child(svg(ICON).size(28).text_color(t.dim).opacity(0.5))
        .child(div().text_size(13).text_color(t.muted).child(tx("Kein Issue ausgewählt")))
        .child(div().max_w(280).text_size(11.5).text_color(t.dim).text_center().whitespace_normal()
          .child(tx("Zeile anklicken · ↑ ↓ wechseln · ← → zu- und aufklappen · Esc schließt")));
    }
    const d = this.details.get(key)?.data ?? issue;
    const tree = this.treeFor(all ?? issues);
    const status = issue.status === "open" && (isBlocked(issue) || tree.state(issue) === "blocked") ? "blocked" : issue.status;
    const prefix = commonPrefix((all ?? issues).map(i => i.id));

    // Where it sits: its parents, outermost first, each a link.
    const crumbs = [];
    for (let at = tree.up.get(issue.id); at && crumbs.length < 8; at = tree.up.get(at)) crumbs.unshift(tree.byId.get(at));
    const crumb = (c) => h_flex().id(`crumb-${c.id}`).max_w(240).h(22).px(6).gap(5).items_center().rounded(5).cursor_pointer()
      .hover(s => s.bg(t.hover)).tooltip(`${c.id}\n${c.title ?? ""}`)
      .on_click((_e, cx) => this.revealIssue(c.id, cx))
      .child(this.status(tree.state(c), t, 10))
      .child(div().min_w(0).truncate().text_size(11.5).text_color(t.muted).child(c.title || c.id));

    const meta = (k, v) => h_flex().min_h(22).gap(10).items_center().min_w(0)
      .child(div().w(92).flex_none().text_size(11.5).text_color(t.dim).child(k))
      .child(h_flex().flex_1().min_w(0).gap(6).items_center().text_size(12).child(v));
    const when = (label, iso, who) => meta(label, `${ago(iso)}${who ? ` · ${who}` : ""}`);
    const section = (title, text, k) => {
      const body = (text || "").trim();
      return v_flex().gap(6)
        .child(div().text_size(11).font_semibold().text_color(t.dim).child(title.toUpperCase()))
        .child(div().text_size(12.5).text_color(t.foreground).child(TextView.markdown(`md-${k}-${issue.id}`, body.length > 20000 ? body.slice(0, 20000) + " …" : body)));
    };
    const has = (text) => Boolean((text || "").trim());

    const kids = [...(tree.kids.get(issue.id) ?? [])];
    const openKids = kids.filter(c => c.status !== "closed").sort(byPriority), closedKids = kids.filter(c => c.status === "closed").sort(byClosed);
    const shownKids = [...openKids, ...closedKids].slice(0, 60);
    const stats = tree.stats.get(issue.id);
    const deps = this.depList(issue, d, t, mono, true);
    const labels = d.labels ?? [];

    return v_flex().id(`panel-${issue.id}`).size_full().overflow_y_scrollbar().bg(t.surface).px(18).py(14).gap(14)
      .when(crumbs.length > 0, el => el.child(h_flex().flex_wrap().gap(2).items_center()
        .children(crumbs.flatMap((c, k) => k ? [div().text_size(11).text_color(t.dim).child("›"), crumb(c)] : [crumb(c)]))))
      .child(v_flex().gap(8)
        .child(h_flex().gap(8).items_center()
          .child(this.status(status, t, 14))
          .child(div().font_family(mono).text_size(12).text_color(t.muted).child(issue.id))
          .child(this.typePill(d, t))
          .child(this.badge(d.priority, t))
          .child(div().flex_1())
          .child(this.tool(`panel-copy-${issue.id}`, "copy", tx("ID kopieren"), t, cx => this.copy(issue.id, cx)))
          .child(this.tool(`panel-term-${issue.id}`, "terminal", tx("ID ins Terminal einfügen"), t, cx => this.insert(issue.id, cx))))
        .child(div().text_size(18).font_semibold().whitespace_normal().child(d.title || "")))
      .child(v_flex().gap(1)
        .child(meta("Status", h_flex().gap(6).items_center().child(this.status(status, t, 11)).child(div().text_color(this.statusColor(status, t)).child(stName(status) ?? status ?? ""))))
        .child(meta(tx("Zugewiesen"), d.assignee
          ? h_flex().gap(6).items_center().child(this.avatar(d.assignee, t)).child(d.assignee)
          : div().text_color(t.dim).child(tx("niemand"))))
        .when(labels.length > 0, el => el.child(meta(tx("Labels"), h_flex().flex_wrap().gap(4).children(labels.map(l => this.chip(l, t))))))
        .when(Boolean(d.created_at), el => el.child(when(tx("Erstellt"), d.created_at, d.created_by)))
        .when(Boolean(d.started_at), el => el.child(when(tx("Begonnen"), d.started_at, null)))
        .when(Boolean(d.updated_at) && d.updated_at !== d.created_at, el => el.child(when(tx("Geändert"), d.updated_at, null)))
        .when(Boolean(d.closed_at), el => el.child(when(tx("Geschlossen"), d.closed_at, null)))
        .when(Boolean(d.close_reason), el => el.child(meta(tx("Grund"), div().min_w(0).truncate().child(d.close_reason))))
        .when(Boolean(d.external_ref), el => el.child(meta(tx("Extern"), div().min_w(0).truncate().child(d.external_ref)))))
      .child(this.actionButtons(issue, t))
      .when(kids.length > 0, el => el.child(v_flex().gap(4)
        .child(h_flex().gap(10).items_center()
          .child(div().text_size(11).font_semibold().text_color(t.dim).child(tx("UNTER-ISSUES")))
          .when(Boolean(stats), x => x.child(this.progress(`panel-${issue.id}`, stats, t, 90, mono))))
        .children(shownKids.map(c => this.mini("sub", c, tree.state(c), t, mono, prefix)))
        .when(kids.length > shownKids.length, x => x.child(div().px(6).text_size(11.5).text_color(t.dim).child(tx("… {n} weitere im Baum", { n: kids.length - shownKids.length }))))))
      .when(has(d.description), el => el.child(section(tx("Beschreibung"), d.description, "desc")))
      .when(has(d.acceptance_criteria), el => el.child(section(tx("Akzeptanzkriterien"), d.acceptance_criteria, "ac")))
      .when(has(d.design), el => el.child(section(tx("Design"), d.design, "design")))
      .when(has(d.notes), el => el.child(section(tx("Notizen"), d.notes, "notes")))
      .when(Boolean(deps), el => el.child(deps))
      .when((d.dependent_count ?? 0) > 0, el => el.child(div().text_size(11.5).text_color(t.dim).child(tx("{n} hängen hiervon ab", { n: d.dependent_count }))));
  }

  // Whole-panel states (no bd, no repo, no beads): centred, with the icon.
  empty(t, title, sub) {
    return v_flex().flex_1().min_h(0).items_center().justify_center().gap(6).p(24)
      .child(svg(ICON).size(28).text_color(t.dim).opacity(0.6))
      .child(div().text_size(13).text_color(t.muted).child(title))
      .when(Boolean(sub), el => el.child(div().max_w(260).text_size(11.5).text_color(t.dim).text_center().whitespace_normal().child(sub)));
  }

  // List-level states (no match, nothing ready): at the top, like Files and Changes.
  emptyList(t, title, sub) {
    return v_flex().flex_1().min_h(0).p(12).gap(3)
      .child(div().text_size(12.5).text_color(t.muted).child(title))
      .when(Boolean(sub), el => el.child(div().text_size(11.5).text_color(t.dim).whitespace_normal().child(sub)));
  }

  moreRows(rest, t) {
    return div().id("beads-more").h(28).flex_none().mt(4).px(10).flex().items_center().rounded(6).cursor_pointer()
      .text_size(11.5).text_color(t.muted).hover(s => s.bg(t.hover).text_color(t.foreground))
      .on_click((_e, cx) => { this.limit += ROWS; cx.notify(); })
      .child(tx("{n} weitere anzeigen", { n: rest }));
  }

  // The row to scroll to has to be drawn: past the limit, the limit grows to reach it.
  reach(index) {
    if (index >= this.limit) this.limit = index + 50;
  }

  // ---- list views (Ready, Open, All) ----

  row(issue, blocked, t, mono, idWidth, prefix) {
    const status = blocked && issue.status === "open" ? "blocked" : issue.status;
    const [glyph, color] = TYPES[issue.issue_type] ?? ["·", "muted"];
    const sel = this.open === issue.id, closed = issue.status === "closed";
    return h_flex().id(`row-${issue.id}`).relative().h(30).flex_none().px(8).gap(6).items_center().rounded(7).cursor_pointer()
      .when(sel, el => el.bg(t.selected)).hover(s => s.bg(sel ? t.selected : t.hover))
      .tooltip(`${issue.id} · ${stName(status) ?? status ?? ""}\n${issue.title || ""}`)
      .on_hover((h, cx) => this.hover(issue.id, h, cx))
      .on_click((_e, cx) => this.click(issue, cx))
      .child(this.badge(issue.priority, t).when(closed, el => el.opacity(0.45)))
      .child(div().w(9).flex_none().font_family(mono).text_size(11).font_semibold().text_color(t[color] ?? t.muted).child(glyph))
      .child(div().w(idWidth).flex_none().overflow_hidden().whitespace_nowrap().text_ellipsis_start().font_family(mono).text_size(10.5).text_color(t.dim).child(strip(issue.id, prefix)))
      .child(div().flex_1().min_w(0).truncate().text_size(12.5).text_color(closed ? t.dim : t.foreground).child(issue.title || ""))
      .when(this.wide && Boolean(issue.assignee), el => el.child(this.avatar(issue.assignee, t)))
      .when(this.wide, el => el.child(div().w(30).flex_none().text_right().text_size(11).text_color(t.dim).child(ageOf(issue.updated_at ?? issue.created_at))))
      .child(this.status(status, t))
      .when(this.hoverId === issue.id, el => el.child(this.actions(issue, sel, t)));
  }

  listBody(issues, isBlocked, loc, root, t, mono) {
    const q = this.filtering;
    let rows = q ? issues.filter(this.pass) : issues;
    rows = [...rows].sort((a, b) => {
      const ca = a.status === "closed", cb = b.status === "closed";
      if (ca !== cb) return ca ? 1 : -1;
      if (ca) return byClosed(a, b);
      return (a.priority ?? 9) - (b.priority ?? 9) || (RANK[a.status] ?? 5) - (RANK[b.status] ?? 5)
        || (b.updated_at ?? b.created_at ?? "").localeCompare(a.updated_at ?? a.created_at ?? "");
    });
    this.rows = rows;
    if (!rows.length) return this.emptyList(t, q ? this.noMatch() : tx({ ready: "Nichts bereit", open: "Keine offenen Issues", all: "Keine Issues" }[this.view]), q ? null : this.view === "ready" ? tx("Alles erledigt oder blockiert.") : null);
    if (this.scrollTo) this.reach(rows.findIndex(i => i.id === this.scrollTo));
    const drawn = rows.slice(0, this.limit);
    // The shared id prefix is dropped (the repo is in the header, the full id in the
    // tooltip and detail); the rest gets a narrow column, cut from the left if long.
    const prefix = commonPrefix(issues.map(i => i.id));
    const longest = Math.max(...drawn.map(i => strip(i.id, prefix).length));
    const idWidth = Math.ceil(Math.min(this.wide ? 14 : 7, Math.max(3, longest)) * 6.4);
    const items = [];
    let target = -1;
    for (const issue of drawn) {
      const blocked = isBlocked(issue);
      if (issue.id === this.scrollTo) target = items.length;
      items.push(this.row(issue, blocked, t, mono, idWidth, prefix));
      if (!this.wide && this.open === issue.id) items.push(this.detail(issue, blocked, `${loc.on}|${root.beads}|${issue.id}`, t, mono));
    }
    if (rows.length > drawn.length) items.push(this.moreRows(rows.length - drawn.length, t));
    if (this.scrollTo) { if (target >= 0) this.scroll.scroll_to_item(target); this.scrollTo = null; }
    return v_flex().id(`beads-list-${this.view}`).flex_1().min_h(0).overflow_y_scrollbar().track_scroll(this.scroll).p(6).gap(1).children(items);
  }

  // ---- wide list: every row in a virtual list, sortable columns, groups ----

  // The list's order: a column picked in the header (then the usual order), else the usual
  // one: open before closed, by priority, state, last change; closed newest first.
  sorter(ctx) {
    const upd = (i) => i.updated_at ?? i.created_at ?? "";
    const usual = (a, b) => {
      const ca = a.status === "closed", cb = b.status === "closed";
      if (ca !== cb) return ca ? 1 : -1;
      if (ca) return byClosed(a, b);
      return (a.priority ?? 9) - (b.priority ?? 9) || (RANK[a.status] ?? 5) - (RANK[b.status] ?? 5) || upd(b).localeCompare(upd(a));
    };
    const { key, desc } = this.sort;
    const rank = (i) => { const k = STATE_ORDER.indexOf(ctx.stateOf(i)); return k < 0 ? 9 : k; };
    const by = {
      state: (a, b) => rank(a) - rank(b),
      id: (a, b) => natural(a.id, b.id),
      title: (a, b) => (a.title ?? "").localeCompare(b.title ?? ""),
      type: (a, b) => (a.issue_type ?? "").localeCompare(b.issue_type ?? ""),
      prio: (a, b) => (a.priority ?? 9) - (b.priority ?? 9),
      who: (a, b) => (a.assignee ? 0 : 1) - (b.assignee ? 0 : 1) || (a.assignee ?? "").localeCompare(b.assignee ?? ""),
      upd: (a, b) => upd(b).localeCompare(upd(a)), // newest first
    }[key];
    return by ? (a, b) => (desc ? -by(a, b) : by(a, b)) || usual(a, b) : usual;
  }

  // Which group an issue is in, and the groups in their order.
  groupOf(i, ctx, tree) {
    switch (this.group) {
      case "status": return ctx.stateOf(i);
      case "prio": return i.priority === undefined || i.priority === null ? "none" : String(i.priority);
      case "who": return i.assignee || "";
      case "type": return i.issue_type || "";
      case "parent": return tree.up.get(i.id) ?? "";
      default: return "";
    }
  }

  groupOrder(keys, groups, ctx, tree) {
    const size = (k) => groups.get(k).length;
    const last = (k) => (k === "" || k === "none" ? 1 : 0);
    switch (this.group) {
      case "status": { const at = (k) => { const n = STATE_ORDER.indexOf(k); return n < 0 ? 99 : n; }; return keys.sort((a, b) => at(a) - at(b)); }
      case "prio": return keys.sort((a, b) => last(a) - last(b) || Number(a) - Number(b));
      case "who": return keys.sort((a, b) => last(a) - last(b) || (squash(b) === ctx.me) - (squash(a) === ctx.me) || size(b) - size(a) || a.localeCompare(b));
      case "parent": return keys.sort((a, b) => last(a) - last(b) || byPriority(tree.byId.get(a), tree.byId.get(b)));
      default: return keys.sort((a, b) => last(a) - last(b) || size(b) - size(a) || a.localeCompare(b));
    }
  }

  // Closed is folded until opened; every other group is open until folded.
  folded(gk) {
    return this.groupFold.has(gk) !== (gk === "status:closed");
  }

  setGroup(group, cx) {
    this.group = group;
    try { localStorage.setItem("group", group); } catch {}
    if (this.open) this.scrollTo = this.open;
    cx.notify();
  }

  // A header click: that column, again the other way round, a third time back to the usual.
  setSort(key, cx) {
    const s = this.sort;
    this.sort = s.key !== key ? { key, desc: false } : !s.desc ? { key, desc: true } : { key: "auto", desc: false };
    try { localStorage.setItem("sort", JSON.stringify(this.sort)); } catch {}
    if (this.open) this.scrollTo = this.open;
    cx.notify();
  }

  // The rows, worked out once per data, filter, sort, grouping and folding: headers and issues.
  listRows(issues, all, ctx) {
    const key = [this.filterKey(), this.sort.key, this.sort.desc, this.group, [...this.groupFold].join(","), ctx.me, this.view].join("\u0000");
    const c = this.listCache;
    if (c && c.issues === issues && c.all === all && c.key === key) return c;
    const shown = this.filtering ? issues.filter(this.pass) : issues;
    const tree = this.treeFor(all ?? issues);
    const sorted = [...shown].sort(this.sorter(ctx));
    const out = [], heads = [];
    if (this.group === "none") for (const i of sorted) out.push({ issue: i });
    else {
      const groups = new Map();
      for (const i of sorted) { const g = this.groupOf(i, ctx, tree); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(i); }
      for (const g of this.groupOrder([...groups.keys()], groups, ctx, tree)) {
        const list = groups.get(g), gk = `${this.group}:${g}`, folded = this.folded(gk);
        const s = { closed: 0, in_progress: 0, blocked: 0, open: 0, total: list.length };
        for (const i of list) { const st = ctx.stateOf(i); s[st in s ? st : "open"]++; }
        const head = { group: g, gk, count: list.length, folded, stats: s };
        heads.push(head); out.push(head);
        if (!folded) for (const i of list) out.push({ issue: i });
      }
    }
    return (this.listCache = { issues, all, key, out, heads, tree, count: shown.length, rows: out.filter(r => r.issue).map(r => r.issue) });
  }

  // One issue row: priority edge, status, id, title and labels, then the columns.
  listRow(issue, ctx, tree, t, mono, idW, prefix, cols, hover) {
    const st = ctx.stateOf(issue), sel = this.open === issue.id, closed = issue.status === "closed";
    const s = tree.stats.get(issue.id), labels = issue.labels ?? [];
    let row = h_flex().size_full().px(8).gap(8).items_center().rounded(6)
      .when(sel, el => el.bg(t.selected))
      .child(div().w(3).h(16).flex_none().rounded(1).bg(closed ? t.border : prioColor(issue.priority, t)))
      .child(div().w(14).flex_none().flex().items_center().justify_center().child(this.status(st, t, 12)))
      .child(div().w(idW).flex_none().overflow_hidden().whitespace_nowrap().text_ellipsis_start().font_family(mono).text_size(11.5).text_color(t.dim).child(strip(issue.id, prefix)))
      .child(h_flex().flex_1().min_w(0).gap(6).items_center()
        .child(div().flex_shrink(1).min_w(0).truncate().text_size(13).text_color(closed ? t.dim : t.foreground)
          .when((s?.total ?? 0) > 0 && !closed, el => el.font_medium()).child(issue.title || ""))
        .when(cols.labels && labels.length > 0, el => el.children(labels.slice(0, 2).map(l => this.chip(l, t)))))
      .child(h_flex().flex_none().h_full().gap(12).pl(12).items_center()
        .when(cols.type, el => el.child(div().w(COL.type).flex_none().child(this.typePill(issue, t).when(closed, x => x.opacity(0.6)))))
        .when(cols.prog, el => el.child(div().w(COL.prog).flex_none().when((s?.total ?? 0) > 0, x => x.child(this.progress(null, s, t, 56, mono)))))
        .child(div().w(COL.prio).flex_none().child(this.badge(issue.priority, t).when(closed, x => x.opacity(0.45))))
        .when(cols.who, el => el.child(h_flex().w(COL.who).flex_none().gap(6).items_center()
          .when(Boolean(issue.assignee), x => x.child(this.avatar(issue.assignee, t)).child(div().min_w(0).truncate().text_size(11.5).text_color(t.muted).child(issue.assignee)))))
        .when(cols.upd, el => el.child(div().w(COL.upd).flex_none().text_right().text_size(11).text_color(t.dim).child(ageOf(issue.updated_at ?? issue.created_at)))));
    if (hover) row = row.hover(x => x.bg(sel ? t.selected : t.hover));
    return div().h(LIST_ROW).w_full().px(6).child(row);
  }

  // A group's header: fold mark, what it is, how many, how far along.
  groupHead(r, ctx, tree, t, mono, hover) {
    const g = r.group;
    let icon = null, label;
    switch (this.group) {
      case "status": icon = this.status(g, t, 12); label = tx((QSTATE.find(q => q[0] === g) ?? [g, STATUS[g] ?? g])[1]); break;
      case "prio": icon = this.badge(g === "none" ? null : Number(g), t); label = g === "none" ? tx("Ohne Priorität") : tx("Priorität {g}", { g }); break;
      case "who": icon = g ? this.avatar(g, t, 18) : div().size(18).flex_none().rounded_full().border_1().border_color(t.border); label = g || tx("Niemand"); break;
      case "type": icon = div().size(9).flex_none().rounded(2).bg(t[(TYPES[g] ?? ["", "muted"])[1]] ?? t.muted); label = g || tx("Ohne Typ"); break;
      case "parent": {
        const p = tree.byId.get(g);
        icon = p ? this.status(tree.state(p), t, 12) : div().size(12).flex_none();
        label = p ? p.title || p.id : tx("Ohne Eltern-Issue");
        break;
      }
      default: label = g;
    }
    const parentId = this.group === "parent" && g ? g : null;
    let head = h_flex().size_full().px(8).gap(8).items_center().rounded(6).bg(t.surface).border_1().border_color(t.border)
      .child(svg(`${DIR}/chev-${r.folded ? "right" : "down"}.svg`).size(12).flex_none().text_color(t.dim))
      .when(Boolean(icon), el => el.child(icon))
      .when(Boolean(parentId), el => el.child(div().flex_none().font_family(mono).text_size(11).text_color(t.dim).child(parentId)))
      .child(div().flex_shrink(1).min_w(0).truncate().text_size(12.5).font_semibold().child(label))
      .child(div().flex_none().font_family(mono).text_size(11).text_color(t.muted).child(String(r.count)))
      .child(div().flex_1())
      .when(this.group !== "status", el => el.child(this.progress(null, r.stats, t, 90, mono)));
    if (hover) head = head.hover(x => x.bg(t.hover));
    return div().h(LIST_ROW).w_full().px(6).py(2).child(head);
  }

  listWide(issues, ctx, loc, root, t, mono) {
    const all = this.lists.get(`${loc.on}|${root.beads}|all`)?.issues ?? null;
    const L = this.listRows(issues, all, ctx), { out, tree } = L;
    this.rows = L.rows;
    const q = this.filtering;
    const prefix = commonPrefix(issues.map(i => i.id));
    const chars = Math.max(3, ...L.rows.slice(0, 400).map(i => strip(i.id, prefix).length));
    const idW = Math.ceil(Math.min(14, chars) * 6.9);
    const W = this.listW ?? 1200;
    const cols = { type: W > SHOW.type, prog: Boolean(all), upd: W > SHOW.upd, who: W > SHOW.who, labels: W > 1000 };

    // The selected row on screen, moving the list only when it is not.
    if (this.scrollTo) {
      const at = out.findIndex(r => r.issue?.id === this.scrollTo);
      const s = this.seen;
      if (at >= 0 && (!s || at <= s.start || at >= s.end - 1)) this.vscroll.scroll_to_item(at, "center");
      this.scrollTo = null;
    }

    const grouped = this.group !== "none";
    const toolbar = h_flex().h(36).flex_none().px(10).gap(8).items_center().border_b(1).border_color(t.border)
      .child(div().flex_1().min_w(0).truncate().text_size(11.5).text_color(t.dim)
        .child(`${L.count} ${tx(q ? "Treffer" : "Issues")}${grouped ? tx(" · {n} Gruppen", { n: L.heads.length }) : ""}`))
      .when(grouped, el => el
        .child(this.tool("grp-open", "unfold", tx("Alle Gruppen aufklappen"), t, cx => {
          for (const h of L.heads) { if (h.gk === "status:closed") this.groupFold.add(h.gk); else this.groupFold.delete(h.gk); }
          cx.notify();
        }))
        .child(this.tool("grp-fold", "fold", tx("Alle Gruppen zuklappen"), t, cx => {
          for (const h of L.heads) { if (h.gk === "status:closed") this.groupFold.delete(h.gk); else this.groupFold.add(h.gk); }
          cx.notify();
        })))
      .child(div().flex_none().text_size(11).text_color(t.dim).child(tx("Gruppieren")))
      .child(ToggleGroup.new("list-group").flex().flex_row().flex_none().gap(2).p(2).rounded(7).bg(t.background).border_1().border_color(t.border)
        .children(GROUPS.map(([k, label]) => {
          const on = this.group === k;
          return Toggle.new(`grp-${k}`).pressed(on).on_change((v, cx) => this.setGroup(v ? k : "none", cx))
            .h(22).px(9).flex().items_center().rounded(5).cursor_pointer().text_size(11.5)
            .text_color(on ? t.foreground : t.muted).when(on, el => el.bg(t.raised)).hover(s => s.text_color(t.foreground))
            .child(tx(label));
        })));

    // The header: the same widths as the rows; a click sorts by that column.
    const head = (key, w, text, right = false) => {
      const on = this.sort.key === key;
      return h_flex().id(`sort-${key}`).when(w !== null, el => el.w(w).flex_none()).when(w === null, el => el.flex_1().min_w(0))
        .h_full().gap(3).items_center().cursor_pointer().when(right, el => el.justify_end())
        .text_color(on ? t.foreground : t.dim).hover(s => s.text_color(t.foreground))
        .tooltip(on ? tx(this.sort.desc ? "Klick: zurück zur üblichen Ordnung" : "Klick: umgekehrt") : tx("Nach {c} sortieren", { c: text.toLowerCase() }))
        .on_click((_e, cx) => this.setSort(key, cx))
        .child(text).when(on, el => el.child(div().text_size(10).child(this.sort.desc ? "▼" : "▲")));
    };
    const header = h_flex().h(28).flex_none().px(14).gap(8).items_center().border_b(1).border_color(t.border).text_size(10.5).font_medium()
      .child(div().w(3).flex_none())
      .child(head("state", 14, "S"))
      .child(head("id", idW, "ID"))
      .child(head("title", null, tx("TITEL")))
      .child(h_flex().flex_none().h_full().gap(12).pl(12).items_center()
        .when(cols.type, el => el.child(head("type", COL.type, tx("TYP"))))
        .when(cols.prog, el => el.child(div().w(COL.prog).flex_none().text_color(t.dim).child(tx("FORTSCHRITT"))))
        .child(head("prio", COL.prio, "P"))
        .when(cols.who, el => el.child(head("who", COL.who, tx("ZUGEWIESEN"))))
        .when(cols.upd, el => el.child(head("upd", COL.upd, tx("GEÄNDERT"), true))));

    const body = !out.length
      ? this.emptyList(t, q ? this.noMatch() : tx({ ready: "Nichts bereit", open: "Keine offenen Issues", all: "Keine Issues" }[this.view] ?? "Keine Issues"), null)
      : div().relative().flex_1().min_h(0)
        .child(v_virtual_list("beads-vlist", out.length, LIST_ROW,
          (k) => out[k].issue ? `i:${out[k].issue.id}` : `g:${out[k].gk}`,
          (range) => {
            this.seen = range; // where the list is: keeps a click from scrolling it
            const items = [];
            for (let k = range.start; k < range.end && k < out.length; k++) items.push(this.listItem(out[k], ctx, tree, t, mono, idW, prefix, cols));
            return items;
          }).size_full().pt(4).track_scroll(this.vscroll)
          .on_item_click((key, cx) => {
            if (key.startsWith("g:")) {
              const gk = key.slice(2);
              this.groupFold.has(gk) ? this.groupFold.delete(gk) : this.groupFold.add(gk);
              cx.notify();
              return;
            }
            const issue = this.listCache?.rows.find(i => i.id === key.slice(2));
            if (issue) this.click(issue, cx);
          }))
        .child(Scrollbar.vertical("beads-vlist").absolute().inset_0());

    return v_flex().id("beads-list-wide").flex_1().min_h(0)
      .on_size_change((size, cx) => {
        const was = this.listW;
        this.listW = size.width;
        if (was === null || bucket(was) !== bucket(size.width) || (was > 1000) !== (size.width > 1000)) cx.notify();
      })
      .child(toolbar).child(header).child(body);
  }

  // One item of the virtual list. Should hover styling not be allowed in a list row, the rows
  // are drawn without it from then on rather than failing the list.
  listItem(r, ctx, tree, t, mono, idW, prefix, cols) {
    const make = (hover) => r.issue ? this.listRow(r.issue, ctx, tree, t, mono, idW, prefix, cols, hover) : this.groupHead(r, ctx, tree, t, mono, hover);
    if (this.noHover) return make(false);
    try { return make(true); } catch { this.noHover = true; return make(false); }
  }

  // ---- tree ----

  // The tree as rows, each with its ancestors (`path`) for the indent guides. Per parent
  // its closed children fold into one "23 closed" row unless opened there or shown
  // everywhere. `keep`: with a filter, only these (matches and their parents), nothing folded.
  flatten(tree, keep) {
    const out = [];
    const walk = (list, key, path) => {
      let open = list.filter(i => i.status !== "closed"), closed = list.filter(i => i.status === "closed");
      if (keep) { open = open.filter(i => keep.has(i.id)); closed = closed.filter(i => keep.has(i.id)); }
      open.sort(byPriority); closed.sort(byClosed);
      const visit = (it) => {
        if (path.includes(it.id)) return; // a parent cycle in the data
        const kids = tree.kids.get(it.id) ?? [];
        const collapsed = !keep && kids.length > 0 && this.collapsed.has(it.id);
        out.push({ issue: it, path, depth: path.length, kids: kids.length, stats: tree.stats.get(it.id), collapsed, dim: Boolean(keep) && !this.pass(it) });
        if (kids.length && !collapsed) walk(kids, it.id, [...path, it.id]);
      };
      open.forEach(visit);
      if (!keep && !this.showClosed && closed.length) {
        const opened = this.closedOpen.has(key);
        out.push({ group: true, key, count: closed.length, opened, path, depth: path.length });
        if (opened) closed.forEach(visit);
      } else closed.forEach(visit);
    };
    walk(tree.roots, "", []);
    return out;
  }

  // One vertical line per level; the one of the selected issue's parent stands out.
  guides(path, t, active) {
    return path.map(id => div().w(INDENT).h_full().flex_none().child(div().ml(7).w(1).h_full().bg(id === active ? t.muted : t.border)));
  }

  chevron(id, r, t) {
    const el = div().w(16).h_full().flex_none().flex().items_center().justify_center();
    if (!r.kids) return el;
    return el.id(`fold-${id}`).cursor_pointer().text_color(t.dim).hover(s => s.text_color(t.foreground))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => {
        cx.stop_propagation();
        if (this.filtering) return; // filtered: everything on the way is open
        this.collapsed.has(id) ? this.collapsed.delete(id) : this.collapsed.add(id);
        cx.notify();
      })
      .child(svg(`${DIR}/chev-${r.collapsed ? "right" : "down"}.svg`).size(12));
  }

  // Wide: type, progress, priority, who, last change, right of the title.
  columns(r, t, mono, cols) {
    const { issue } = r, closed = issue.status === "closed";
    return h_flex().flex_none().h_full().gap(12).pl(12).items_center()
      .when(cols.type, el => el.child(div().w(COL.type).flex_none().child(this.typePill(issue, t).when(closed, x => x.opacity(0.6)))))
      .child(div().w(COL.prog).flex_none().when(r.kids > 0, el => el.child(this.progress(issue.id, r.stats, t, 56, mono))))
      .child(div().w(COL.prio).flex_none().child(this.badge(issue.priority, t).when(closed, x => x.opacity(0.45))))
      .when(cols.who, el => el.child(h_flex().w(COL.who).flex_none().gap(6).items_center()
        .when(Boolean(issue.assignee), x => x.child(this.avatar(issue.assignee, t)).child(div().min_w(0).truncate().text_size(11.5).text_color(t.muted).child(issue.assignee)))))
      .when(cols.upd, el => el.child(div().w(COL.upd).flex_none().text_right().text_size(11).text_color(t.dim).child(ageOf(issue.updated_at ?? issue.created_at))));
  }

  treeRow(r, tree, t, mono, idW, prefix, active, cols) {
    const { issue } = r, wide = this.wide, st = tree.state(issue);
    const sel = this.open === issue.id, closed = issue.status === "closed", labels = issue.labels ?? [];
    return h_flex().id(`tree-${issue.id}`).relative().h(wide ? 30 : 28).flex_none().pr(6).items_center().rounded(6).cursor_pointer()
      .when(sel, el => el.bg(t.selected)).hover(s => s.bg(sel ? t.selected : t.hover))
      .tooltip(`${issue.id} · ${stName(st) ?? st ?? ""}\n${issue.title || ""}`)
      .on_hover((h, cx) => this.hover(issue.id, h, cx))
      .on_click((_e, cx) => this.click(issue, cx))
      .children(this.guides(r.path, t, active))
      .child(this.chevron(issue.id, r, t))
      .child(h_flex().flex_1().min_w(0).h_full().gap(7).items_center()
        .child(this.status(st, t, 12))
        .child(div().w(idW).flex_none().overflow_hidden().whitespace_nowrap().text_ellipsis_start().font_family(mono).text_size(11.5).text_color(t.dim)
          .child(wide ? issue.id : strip(issue.id, prefix)))
        .child(div().flex_1().min_w(0).truncate().text_size(wide ? 13 : 12.5).text_color(closed || r.dim ? t.dim : t.foreground)
          .when(r.kids > 0 && !closed, el => el.font_medium()).child(issue.title || ""))
        .when(wide && labels.length > 0, el => el.children(labels.slice(0, 2).map(l => this.chip(l, t)))))
      .child(wide ? this.columns(r, t, mono, cols)
        : h_flex().flex_none().gap(6).pl(6).items_center()
          .when(r.kids > 0, el => el.child(this.progress(issue.id, r.stats, t, 26, mono)))
          .child(this.badge(issue.priority, t).when(closed, el => el.opacity(0.45))))
      .when(this.hoverId === issue.id, el => el.child(this.actions(issue, sel, t)));
  }

  groupRow(r, t, active) {
    return h_flex().id(`closed-${r.key || "top"}`).h(this.wide ? 28 : 26).flex_none().items_center().rounded(6).cursor_pointer()
      .text_color(t.dim).hover(s => s.bg(t.hover).text_color(t.foreground))
      .on_click((_e, cx) => { this.closedOpen.has(r.key) ? this.closedOpen.delete(r.key) : this.closedOpen.add(r.key); cx.notify(); })
      .children(this.guides(r.path, t, active))
      .child(div().w(16).h_full().flex_none().flex().items_center().justify_center()
        .child(svg(`${DIR}/chev-${r.opened ? "down" : "right"}.svg`).size(11)))
      .child(h_flex().h(20).px(8).gap(6).items_center().rounded(10).bg(t.raised)
        .child(svg(`${DIR}/st-closed.svg`).size(10).text_color(t.ansi2))
        .child(div().text_size(11.5).child(tx("{n} geschlossen", { n: r.count }))));
  }

  treeBody(issues, loc, root, t, mono, cx) {
    const tree = this.treeFor(issues);
    this.curTree = tree;
    if (this.pendingReveal) {
      const id = this.pendingReveal;
      this.pendingReveal = null;
      if (tree.byId.has(id)) {
        for (let at = id; at; at = tree.up.get(at)) {
          if (tree.byId.get(at)?.status === "closed") this.closedOpen.add(tree.up.get(at) ?? "");
          if (at !== id) this.collapsed.delete(at);
        }
        this.open = id; this.confirm = null; this.scrollTo = id;
        this.ensureDetail(id, cx);
      } else this.note = { text: tx("{id} ist nicht in diesem Repo", { id }), error: true, at: Date.now(), repo: null };
    }
    // Filtered: the matches and, for where they sit, their parents (those dimmed).
    const q = this.filtering;
    let keep = null, hits = 0;
    if (q) {
      keep = new Set();
      for (const i of issues) if (this.pass(i)) { hits++; for (let at = i.id; at && !keep.has(at); at = tree.up.get(at)) keep.add(at); }
    }
    const flat = this.flatten(tree, keep);
    this.rows = flat.filter(r => r.issue).map(r => r.issue);

    const closedN = issues.filter(i => i.status === "closed").length;
    const toolbar = h_flex().h(32).flex_none().px(10).gap(2).items_center().border_b(1).border_color(t.border)
      .child(div().flex_1().min_w(0).truncate().text_size(11.5).text_color(t.dim)
        .child(q ? tx("{n} Treffer", { n: hits }) : tx("{a} offen · {b} geschlossen", { a: issues.length - closedN, b: closedN })))
      .child(this.tool("tree-expand", "unfold", tx("Alles aufklappen"), t, cx => { this.collapsed.clear(); cx.notify(); }))
      .child(this.tool("tree-collapse", "fold", tx("Alles zuklappen"), t, cx => { this.collapsed = new Set(tree.kids.keys()); cx.notify(); }))
      .child(this.tool("tree-closed", "st-closed", tx(this.showClosed ? "Geschlossene zusammenfassen" : "Geschlossene einzeln zeigen"), t, cx => {
        this.showClosed = !this.showClosed;
        try { localStorage.setItem("closed", this.showClosed ? "1" : "0"); } catch {}
        cx.notify();
      }, this.showClosed));
    if (!flat.length) return v_flex().flex_1().min_h(0).child(toolbar).child(this.emptyList(t, q ? this.noMatch() : tx("Keine Issues"), null));

    if (this.scrollTo) this.reach(flat.findIndex(r => r.issue?.id === this.scrollTo));
    const drawn = flat.slice(0, this.limit);
    const prefix = commonPrefix(issues.map(i => i.id));
    const chars = Math.max(0, ...drawn.filter(r => r.issue).map(r => (this.wide ? r.issue.id : strip(r.issue.id, prefix)).length));
    const idW = Math.ceil(Math.min(this.wide ? 16 : 9, Math.max(3, chars)) * 6.9);
    const o = this.open;
    const active = !o ? null : tree.kids.has(o) && !this.collapsed.has(o) && !q ? o : tree.up.get(o) ?? null;
    const W = this.treeW ?? 1200, cols = { type: W > SHOW.type, upd: W > SHOW.upd, who: W > SHOW.who };

    const items = [];
    let target = -1;
    for (const r of drawn) {
      if (r.group) { items.push(this.groupRow(r, t, active)); continue; }
      if (r.issue.id === this.scrollTo) target = items.length;
      items.push(this.treeRow(r, tree, t, mono, idW, prefix, active, cols));
      if (!this.wide && this.open === r.issue.id) {
        items.push(this.detail(r.issue, tree.state(r.issue) === "blocked", `${loc.on}|${root.beads}|${r.issue.id}`, t, mono).ml(4 + (r.depth + 1) * INDENT));
      }
    }
    if (flat.length > drawn.length) items.push(this.moreRows(flat.length - drawn.length, t));
    if (this.scrollTo) { if (target >= 0) this.scroll.scroll_to_item(target); this.scrollTo = null; }

    const head = (w, text, right = false) => div().w(w).flex_none().when(right, el => el.text_right()).child(text);
    return v_flex().id("beads-tree-root").flex_1().min_h(0)
      .on_size_change((size, cx) => {
        const was = this.treeW;
        this.treeW = size.width;
        if (was === null || bucket(was) !== bucket(size.width)) cx.notify();
      })
      .child(toolbar)
      .when(this.wide, el => el.child(h_flex().h(26).flex_none().pl(6 + 16).pr(12).items_center().border_b(1).border_color(t.border)
        .text_size(10.5).font_medium().text_color(t.dim)
        .child(div().flex_1().min_w(0).pl(19).child(tx("TITEL")))
        .child(h_flex().flex_none().gap(12).pl(12).items_center()
          .when(cols.type, x => x.child(head(COL.type, tx("TYP"))))
          .child(head(COL.prog, tx("FORTSCHRITT")))
          .child(head(COL.prio, "P"))
          .when(cols.who, x => x.child(head(COL.who, tx("ZUGEWIESEN"))))
          .when(cols.upd, x => x.child(head(COL.upd, tx("GEÄNDERT"), true))))))
      .child(v_flex().id("beads-tree").flex_1().min_h(0).overflow_y_scrollbar().track_scroll(this.scroll).p(6).gap(0).children(items));
  }

  // ---- overview (wide only) ----

  // A dashboard card: title, something on the right of it, the body.
  card(id, title, t, body, extra = null) {
    return v_flex().id(id).min_w(0).rounded(10).border_1().border_color(t.border).bg(t.surface).p(12).gap(8)
      .child(h_flex().h(18).gap(8).items_center()
        .child(div().flex_1().min_w(0).truncate().font_semibold().text_size(12.5).child(title))
        .when(extra !== null, el => el.child(div().flex_none().text_size(11).text_color(t.dim).child(extra))))
      .children(Array.isArray(body) ? body : [body]);
  }

  // What resting the pointer on an issue shows: enough to know it without opening it.
  preview(issue, status, t, mono) {
    // Cut first: some descriptions run to 100 KB, and a regex over all of it stalls the render.
    const text = (issue.description || "").slice(0, 400).replace(/\s+/g, " ").trim();
    const s = this.treeCache?.tree.stats.get(issue.id);
    return v_flex().w(360).p(12).gap(8).rounded(8).bg(t.popover).border_1().border_color(t.border).shadow_lg().text_size(12)
      .child(h_flex().gap(7).items_center()
        .child(this.status(status, t, 12))
        .child(div().font_family(mono).text_size(11.5).text_color(t.muted).child(issue.id))
        .child(this.typePill(issue, t))
        .child(div().flex_1())
        .child(this.badge(issue.priority, t)))
      .child(div().text_size(13.5).font_semibold().whitespace_normal().child(issue.title ?? ""))
      .child(h_flex().gap(8).items_center().text_size(11.5).text_color(t.muted)
        .when(Boolean(issue.assignee), el => el.child(this.avatar(issue.assignee, t, 16)).child(issue.assignee))
        .when(!issue.assignee, el => el.child(div().text_color(t.dim).child(tx("niemand zugewiesen"))))
        .child(div().flex_1())
        .child(div().text_color(t.dim).child(ago(issue.updated_at ?? issue.created_at))))
      .when(Boolean(s), el => el.child(this.progress(`pv-${issue.id}`, s, t, 120, mono)))
      .when(Boolean(text), el => el.child(div().text_size(11.5).text_color(t.muted).whitespace_normal()
        .child(text.length > 320 ? text.slice(0, 320) + " …" : text)))
      .when((issue.labels ?? []).length > 0, el => el.child(h_flex().flex_wrap().gap(4).children(issue.labels.slice(0, 6).map(l => this.chip(l, t)))));
  }

  // One issue in a dashboard card or the sub-issues: priority edge, status, short id, title,
  // something on the right; a click opens it in the tree, resting on it shows the preview.
  mini(section, issue, status, t, mono, prefix, right = null) {
    const row = h_flex().id(`mini-${section}-${issue.id}`).h(26).flex_none().px(4).gap(7).items_center().rounded(5).cursor_pointer()
      .hover(s => s.bg(t.hover))
      .on_click((_e, cx) => this.revealIssue(issue.id, cx))
      .child(div().w(3).h(14).flex_none().rounded(1).bg(prioColor(issue.priority, t)))
      .child(this.status(status, t, 11))
      .child(div().w(62).flex_none().overflow_hidden().whitespace_nowrap().text_ellipsis_start().font_family(mono).text_size(11).text_color(t.dim).child(strip(issue.id, prefix)))
      .child(div().flex_1().min_w(0).truncate().text_size(12.5).text_color(status === "closed" ? t.dim : t.foreground).child(issue.title ?? ""))
      .child(right ?? div().flex_none().text_size(11).font_semibold().text_color(prioColor(issue.priority, t)).child(`P${issue.priority ?? "?"}`));
    // The full preview only for the row the pointer is on: built for every row, it costs the
    // render its budget. The card opens after a pause, by then this row has its preview.
    const id = `hc-${section}-${issue.id}`;
    const content = this.peek === id ? this.preview(issue, status, t, mono)
      : div().w(360).p(12).rounded(8).bg(t.popover).border_1().border_color(t.border).text_size(13.5).font_semibold().whitespace_normal().child(issue.title ?? "");
    return HoverCard.new(id).open_delay(550).close_delay(120).anchor("top_left")
      .trigger(row.on_hover((on, cx) => { if (on && this.peek !== id) { this.peek = id; cx.notify(); } }))
      .content(content);
  }

  more(id, text, t, onClick) {
    return div().id(id).h(22).flex_none().px(6).flex().items_center().text_size(11.5).text_color(t.dim).rounded(4)
      .when(Boolean(onClick), el => el.cursor_pointer().hover(s => s.bg(t.hover).text_color(t.foreground)).on_click((_e, cx) => onClick(cx)))
      .child(text);
  }

  // From a number on the dashboard to the list behind it: that view, that one chip.
  drill(view, key, cx) {
    this.quick = new Set(key ? [key] : []);
    try { localStorage.setItem("quick", JSON.stringify([...this.quick])); } catch {}
    this.open = null; this.confirm = null;
    this.setView(view, cx);
    cx.notify();
  }

  // A horizontal bar for a share (by priority, type, label): the Progress parts, filled to `pct`.
  meter(id, pct, color, t) {
    const p = Math.max(0, Math.min(100, Math.round(pct)));
    return Progress.new(id).value(p).flex_1().min_w(40)
      .child(ProgressTrack.new().w_full().h(6).rounded(3).overflow_hidden().bg(t.raised)
        .child(ProgressIndicator.new().h_full().rounded(3).w(`${p}%`).bg(color)));
  }

  // A line (and the area under it) through `values`, scaled into the box it fills.
  areaChart(values, color, t) {
    const lo = Math.min(...values), hi = Math.max(...values);
    const pad = Math.max(1, (hi - lo) * 0.15), min = Math.max(0, lo - pad), max = hi + pad;
    const n = values.length;
    const pts = values.map((v, k) => [`${(100 * k / (n - 1)).toFixed(2)}%`, `${(100 - 100 * (v - min) / (max - min)).toFixed(2)}%`]);
    // Each builder call answers the builder; kept as answered, not assumed to change in place.
    let area = PathBuilder.fill().move_to("0%", "100%");
    for (const [x, y] of pts) area = area.line_to(x, y);
    area = area.line_to("100%", "100%").close();
    let line = PathBuilder.stroke(1.5).move_to(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) line = line.line_to(x, y);
    return [
      window.paint_path(area.build(), Background.linear_gradient(180, color + "55", color + "05")).absolute().top(0).left(0).size_full(),
      window.paint_path(line.build(), color).absolute().top(0).left(0).size_full(),
    ];
  }

  // The dashboard's numbers. They change only with the data, the filter and the day, so
  // they are kept between renders (hovering, resizing): a render has a time budget.
  overviewData(all, ctx) {
    const day0 = new Date(); day0.setHours(0, 0, 0, 0);
    const today = day0.getTime(), DAYS = 30, now = Date.now();
    const key = `${this.filterKey()}\u0000${today}\u0000${ctx.me}\u0000${this.view}`;
    if (this.ovCache && this.ovCache.all === all && this.ovCache.key === key) return this.ovCache;

    const issues = this.filtering ? all.filter(this.pass) : all;
    const prefix = commonPrefix(all.map(i => i.id));
    const stateOf = ctx.stateOf;
    const notClosed = new Set(all.filter(i => i.status !== "closed").map(i => i.id));

    // Now: how many in each state; ready = open and waiting on nothing open.
    const by = { open: [], in_progress: [], blocked: [], deferred: [], closed: [] };
    for (const i of issues) (by[stateOf(i)] ?? by.open).push(i);
    const ready = by.open.sort(byPriority), blocked = by.blocked.sort(byPriority), active = by.in_progress;
    const openN = issues.length - by.closed.length;

    // Per day, the last 30 (today last): made, closed, and how many were open at its end.
    const starts = Array.from({ length: DAYS }, (_, k) => today - (DAYS - 1 - k) * DAY);
    const made = Array(DAYS).fill(0), done = Array(DAYS).fill(0), backlog = Array(DAYS).fill(0);
    const dayOf = (ms) => { const k = DAYS - 1 - Math.floor((today + DAY - 1 - ms) / DAY); return ms <= now && k >= 0 && k < DAYS ? k : -1; };
    for (const i of issues) {
      const c = Date.parse(i.created_at ?? ""), z = Date.parse(i.closed_at ?? "");
      if (c) { const k = dayOf(c); if (k >= 0) made[k]++; }
      if (z) { const k = dayOf(z); if (k >= 0) done[k]++; }
      for (let k = 0; k < DAYS; k++) {
        const end = Math.min(now, starts[k] + DAY);
        if (c && c < end && !(z && z < end)) backlog[k]++;
      }
    }
    const week = done.slice(-7).reduce((a, b) => a + b, 0), lastWeek = done.slice(-14, -7).reduce((a, b) => a + b, 0);
    const madeWeek = made.slice(-7).reduce((a, b) => a + b, 0);

    // Parents still open, epics first; what's open by priority, type, label; who has what.
    const tree = this.treeFor(all);
    const parents = issues.filter(i => i.status !== "closed" && (tree.stats.get(i.id)?.total ?? 0) >= 2)
      .sort((a, b) => (a.issue_type === "epic" ? 0 : 1) - (b.issue_type === "epic" ? 0 : 1) || byPriority(a, b));
    const openIssues = issues.filter(i => i.status !== "closed");
    const count = (f) => { const m = new Map(); for (const i of openIssues) for (const k of f(i)) m.set(k, (m.get(k) ?? 0) + 1); return m; };
    const prios = [...count(i => [i.priority ?? 9])].sort((a, b) => a[0] - b[0]);
    const types = [...count(i => i.issue_type ? [i.issue_type] : [])].sort((a, b) => b[1] - a[1]);
    const labels = [...count(i => i.labels ?? [])].sort((a, b) => b[1] - a[1] || natural(a[0], b[0])).slice(0, 8);
    const byWho = new Map();
    for (const i of active) { const who = i.assignee || ""; if (!byWho.has(who)) byWho.set(who, []); byWho.get(who).push(i); }
    const people = [...byWho].sort((a, b) => b[1].length - a[1].length);
    for (const [, list] of people) list.sort(byPriority);

    // What happened, newest first.
    const events = [];
    for (const i of issues) {
      const created = Date.parse(i.created_at ?? ""), started = Date.parse(i.started_at ?? ""), closed = Date.parse(i.closed_at ?? "");
      if (created) events.push({ at: created, kind: "created", i, who: i.created_by });
      if (started) events.push({ at: started, kind: "claimed", i, who: i.assignee });
      if (closed) events.push({ at: closed, kind: "closed", i, who: i.assignee });
    }
    events.sort((a, b) => b.at - a.at);

    return (this.ovCache = { all, key, issues, prefix, tree, notClosed, by, ready, blocked, active, openN, today, DAYS, starts, made, done, backlog,
      week, lastWeek, madeWeek, parents, openIssues, prios, types, labels, people, events });
  }

  overviewBody(all, ctx, t, mono) {
    const { issues, prefix, tree, notClosed, by, ready, blocked, active, openN, today, DAYS, starts, made, done, backlog,
      week, lastWeek, madeWeek, parents, openIssues, prios, types, labels, people, events } = this.overviewData(all, ctx);
    const stateOf = ctx.stateOf;
    this.rows = [];
    const dayName = (k) => k === DAYS - 1 ? tx("heute") : k === DAYS - 2 ? tx("gestern") : (() => {
      const d = new Date(starts[k]), wd = WEEKDAY[lang][d.getDay()];
      return lang === "de" ? `${wd} ${d.getDate()}.${d.getMonth() + 1}.` : `${wd} ${d.getMonth() + 1}/${d.getDate()}`;
    })();
    const signed = (n) => `${n > 0 ? "+" : "−"}${Math.abs(n)}`;

    // ---- the numbers ----
    const kpi = (id, glyph, label, value, color, sub, tip, onClick) => v_flex().id(id).flex_1().min_w(150).px(14).py(12).gap(2)
      .rounded(10).border_1().border_color(t.border).bg(t.surface).cursor_pointer().hover(s => s.border_color(t.input).bg(t.hover))
      .tooltip(tip).on_click((_e, cx) => onClick(cx))
      .child(h_flex().gap(6).items_center().text_size(11.5).text_color(t.muted).child(this.status(glyph, t, 11)).child(tx(label)))
      .child(div().text_size(28).font_semibold().text_color(color).child(String(value)))
      .child(div().text_size(11).text_color(t.dim).truncate().child(sub));
    const unassigned = ready.filter(i => !i.assignee).length;
    const trend = week - lastWeek;
    const kpis = h_flex().flex_none().flex_wrap().gap(10)
      .child(kpi("kpi-ready", "open", "Ready", ready.length, t.ansi2, tx("{n} nicht zugewiesen", { n: unassigned }), tx("Offen und auf nichts wartend · zur Liste"), cx => this.drill("open", "s:open", cx)))
      .child(kpi("kpi-progress", "in_progress", "In Arbeit", active.length, t.working, tx("{n} Personen", { n: new Set(active.map(i => i.assignee || "–")).size }), tx("In Arbeit · zur Liste"), cx => this.drill("open", "s:in_progress", cx)))
      .child(kpi("kpi-blocked", "blocked", "Blockiert", blocked.length, blocked.length ? t.ansi1 : t.foreground, tx("warten auf andere Issues"), tx("Blockiert · zur Liste"), cx => this.drill("open", "s:blocked", cx)))
      .child(kpi("kpi-open", "open", "Offen gesamt", openN, t.foreground, tx("{n} neu in 7 Tagen", { n: madeWeek }), tx("Alles, was nicht geschlossen ist · zum Baum"), cx => this.drill("tree", null, cx)))
      .child(kpi("kpi-closed", "closed", "Geschlossen · 7 T", week, t.ansi2, trend === 0 ? tx("wie die Woche davor") : tx("{d} ggü. Woche davor", { d: signed(trend) }), tx("Geschlossen, die letzten Tage zuerst · zur Liste"), cx => this.drill("all", "s:closed", cx)));

    // ---- where everything stands: one bar ----
    const parts = [["closed", "Geschlossen", t.ansi2], ["in_progress", "In Arbeit", t.working], ["blocked", "Blockiert", t.ansi1], ["open", "Ready", t.accent], ["deferred", "Zurückgestellt", t.dim]]
      .map(([k, label, color]) => ({ k, label: tx(label), color, n: by[k].length })).filter(p => p.n > 0);
    const total = Math.max(1, issues.length);
    const standing = this.card("ov-standing", tx("Stand"), t, [
      h_flex().id("ov-standing-bar").h(10).w_full().rounded(5).overflow_hidden().bg(t.raised).gap(0)
        .children(parts.map(p => div().id(`st-${p.k}`).h_full().w(`${(100 * p.n / total).toFixed(3)}%`).bg(p.color).tooltip(`${p.label}: ${p.n}`))),
      h_flex().flex_wrap().gap(14).children(parts.map(p => h_flex().id(`st-l-${p.k}`).gap(6).items_center().text_size(11.5).cursor_pointer()
        .hover(s => s.text_color(t.foreground)).text_color(t.muted)
        .on_click((_e, cx) => this.drill(p.k === "closed" ? "all" : "open", `s:${p.k}`, cx))
        .child(div().size(8).rounded(2).bg(p.color)).child(p.label)
        .child(div().font_family(mono).text_size(11).text_color(t.foreground).child(String(p.n)))
        .child(div().text_size(11).text_color(t.dim).child(`${Math.round(100 * p.n / total)}%`)))),
    ], tx("{n} Issues · {p}% erledigt", { n: issues.length, p: Math.round(100 * by.closed.length / total) }));

    // ---- per day: made and closed ----
    const peak = Math.max(1, ...made, ...done);
    const throughput = this.card("ov-throughput", tx("Durchsatz · 30 Tage"), t, [
      h_flex().h(96).w_full().gap(2).items_end().children(starts.map((_, k) => h_flex().id(`tp-${k}`).flex_1().h_full().gap(1).items_end().justify_center().rounded(2)
        .hover(s => s.bg(t.hover)).tooltip(`${dayName(k)}\n${tx("{a} erstellt · {b} geschlossen", { a: made[k], b: done[k] })}`)
        .child(div().flex_1().max_w(7).rounded_t(2).h(made[k] ? Math.max(2, Math.round(92 * made[k] / peak)) : 0).bg(t.muted + "88"))
        .child(div().flex_1().max_w(7).rounded_t(2).h(done[k] ? Math.max(2, Math.round(92 * done[k] / peak)) : 0).bg(t.ansi2)))),
      h_flex().text_size(10.5).text_color(t.dim).child(div().flex_1().child(dayName(0))).child(div().flex_1().text_center().child(dayName(15))).child(div().flex_1().text_right().child(tx("heute"))),
      h_flex().gap(14).text_size(11.5).text_color(t.muted)
        .child(h_flex().gap(6).items_center().child(div().size(8).rounded(2).bg(t.muted + "88")).child(tx("erstellt {n}", { n: made.reduce((a, b) => a + b, 0) })))
        .child(h_flex().gap(6).items_center().child(div().size(8).rounded(2).bg(t.ansi2)).child(tx("geschlossen {n}", { n: done.reduce((a, b) => a + b, 0) }))),
    ], tx("Spitze {n}/Tag", { n: peak }));

    // ---- how many were open, day by day ----
    const delta = backlog[DAYS - 1] - backlog[0];
    const lo = Math.min(...backlog), hi = Math.max(...backlog);
    const backlogCard = this.card("ov-backlog", tx("Offene Issues · 30 Tage"), t, [
      h_flex().gap(10).items_end()
        .child(div().text_size(24).font_semibold().child(String(backlog[DAYS - 1])))
        .child(div().pb(4).text_size(11.5).text_color(delta > 0 ? t.ansi3 : delta < 0 ? t.ansi2 : t.dim)
          .child(delta === 0 ? tx("unverändert seit 30 Tagen") : tx("{d} in 30 Tagen", { d: signed(delta) }))),
      h_flex().h(84).w_full().gap(6)
        .child(v_flex().flex_none().h_full().justify_between().text_size(10).text_color(t.dim).font_family(mono).child(String(hi)).child(String(lo)))
        .child(div().id("ov-backlog-plot").relative().flex_1().h_full()
          .children(hi > lo ? this.areaChart(backlog, t.accent, t) : [div().absolute().left(0).right(0).top("50%").h(1).bg(t.accent)])
          .child(h_flex().absolute().top(0).left(0).size_full().children(backlog.map((v, k) => div().id(`bl-${k}`).flex_1().h_full()
            .hover(s => s.bg(t.foreground + "0c")).tooltip(tx("{d}: {n} offen", { d: dayName(k), n: v })))))),
      h_flex().text_size(10.5).text_color(t.dim).child(div().flex_1().child(dayName(0))).child(div().text_right().child(tx("heute"))),
    ]);

    // ---- epics: parents still open, how far along ----
    const epicRows = parents.slice(0, 12).map(p => {
      const s = tree.stats.get(p.id);
      const pct = Math.round(100 * s.closed / Math.max(1, s.total));
      return this.mini("epic", p, stateOf(p), t, mono, prefix, h_flex().flex_none().gap(8).items_center()
        .child(this.progress(`ep-${p.id}`, s, t, 110, mono))
        .child(div().w(32).text_right().text_size(11).text_color(pct === 100 ? t.ansi2 : t.muted).child(`${pct}%`)));
    });
    const epics = this.card("ov-epics", tx("Epics & Eltern-Issues"), t,
      epicRows.length ? [...epicRows, ...(parents.length > 12 ? [this.more("ov-more-epics", tx("… {n} weitere im Baum", { n: parents.length - 12 }), t, cx => this.drill("tree", null, cx))] : [])]
        : [div().text_size(12).text_color(t.dim).child(tx("Keine offenen Issues mit Unter-Issues"))],
      parents.length ? String(parents.length) : null);

    // ---- what to pick up, what waits ----
    const queue = this.card("ov-ready", tx("Als Nächstes"), t,
      ready.length ? [...ready.slice(0, 8).map(i => this.mini("ready", i, "open", t, mono, prefix, h_flex().flex_none().gap(6).items_center()
        .when(Boolean(i.assignee), x => x.child(this.avatar(i.assignee, t, 16)))
        .child(this.badge(i.priority, t)))),
        ...(ready.length > 8 ? [this.more("ov-more-ready", tx("… {n} weitere bereit", { n: ready.length - 8 }), t, cx => this.drill("open", "s:open", cx))] : [])]
        : [div().text_size(12).text_color(t.dim).child(tx("Nichts bereit"))],
      tx("{n} bereit", { n: ready.length }));
    const waits = (i) => (i.dependencies ?? []).filter(d => d.type === "blocks" && notClosed.has(d.depends_on_id)).map(d => d.depends_on_id);
    const blockedCard = this.card("ov-blocked", tx("Blockiert"), t,
      blocked.length ? [...blocked.slice(0, 8).map(i => {
        const w = waits(i);
        return this.mini("blocked", i, "blocked", t, mono, prefix, h_flex().id(`wait-${i.id}`).flex_none().max_w(140).gap(4).items_center()
          .tooltip(w.length ? `${tx("wartet auf")}\n${w.join("\n")}` : tx("als blockiert markiert"))
          .child(div().text_size(10.5).text_color(t.dim).child(tx(w.length ? "wartet auf" : "markiert")))
          .when(w.length > 0, x => x.child(div().min_w(0).truncate().font_family(mono).text_size(11).text_color(t.ansi1).child(strip(w[0], prefix) + (w.length > 1 ? ` +${w.length - 1}` : "")))));
      }), ...(blocked.length > 8 ? [this.more("ov-more-blocked", tx("… {n} weitere", { n: blocked.length - 8 }), t, cx => this.drill("open", "s:blocked", cx))] : [])]
        : [div().text_size(12).text_color(t.dim).child(tx("Nichts blockiert"))],
      String(blocked.length));

    // ---- what's open, by priority, type, label ----
    const bars = (section, entries, colorOf, labelOf, keyOf) => {
      const top = Math.max(1, ...entries.map(e => e[1]));
      return entries.map(([k, n]) => h_flex().id(`br-${section}-${k}`).h(22).gap(8).items_center().rounded(4).px(4).cursor_pointer()
        .hover(s => s.bg(t.hover)).tooltip(tx("{n} offen · zur Liste", { n }))
        .on_click((_e, cx) => this.drill("open", keyOf(k), cx))
        .child(div().w(92).flex_none().truncate().text_size(11.5).text_color(t.muted).child(labelOf(k)))
        .child(this.meter(`m-${section}-${k}`, 100 * n / top, colorOf(k), t))
        .child(div().w(28).flex_none().text_right().font_family(mono).text_size(11).child(String(n))));
    };
    const breakdown = this.card("ov-breakdown", tx("Offen nach …"), t, [
      div().text_size(10.5).font_semibold().text_color(t.dim).child(tx("PRIORITÄT")),
      ...bars("p", prios, k => prioColor(k, t), k => k === 9 ? tx("ohne") : `P${k}`, k => k === 9 ? null : `p:${k}`),
      div().h(2), div().text_size(10.5).font_semibold().text_color(t.dim).child(tx("TYP")),
      ...bars("t", types, k => t[(TYPES[k] ?? ["", "muted"])[1]] ?? t.muted, k => k, k => `t:${k}`),
      ...(labels.length ? [div().h(2), div().text_size(10.5).font_semibold().text_color(t.dim).child("LABELS"),
        ...bars("l", labels, () => t.ansi6, k => `#${k}`, k => `l:${k}`)] : []),
    ], tx("{n} offen", { n: openIssues.length }));

    // ---- who works on what ----
    const activeRows = [];
    for (const [who, list] of people) {
      activeRows.push(h_flex().h(28).flex_none().gap(8).items_center().pt(2)
        .child(this.avatar(who || "?", t, 20))
        .child(div().flex_1().min_w(0).truncate().font_semibold().text_size(12.5).child(who || tx("niemand")))
        .child(div().text_size(11).text_color(t.dim).child(tx("{n} in Arbeit", { n: list.length }))));
      list.slice(0, 12).forEach(i => activeRows.push(this.mini("active", i, "in_progress", t, mono, prefix, div().flex_none().text_size(11).text_color(t.dim).child(ageOf(i.started_at ?? i.updated_at)))));
      if (list.length > 12) activeRows.push(this.more(`ov-more-${hash(who)}`, tx("… {n} weitere", { n: list.length - 12 }), t, null));
    }
    const activeCard = this.card("ov-active", tx("Aktiv"), t, activeRows.length ? activeRows : [div().text_size(12).text_color(t.dim).child(tx("Nichts in Arbeit"))], `${active.length}`);

    // ---- what happened ----
    const KIND = { created: ["open", tx("erstellt"), t.muted], claimed: ["in_progress", tx("übernommen"), t.working], closed: ["closed", tx("geschlossen"), t.ansi2] };
    const activity = [];
    let lastGroup = null;
    events.slice(0, ACTIVITY).forEach((e, k) => {
      const group = tx(e.at >= today ? "Heute" : e.at >= today - DAY ? "Gestern" : e.at >= today - 6 * DAY ? "Diese Woche" : "Früher");
      if (group !== lastGroup) {
        lastGroup = group;
        activity.push(div().h(24).flex_none().px(6).pt(6).text_size(10.5).font_semibold().text_color(t.dim).child(group.toUpperCase()));
      }
      const [glyph, label, color] = KIND[e.kind];
      activity.push(h_flex().id(`ev-${k}`).h(38).flex_none().px(6).gap(9).items_center().rounded(6).cursor_pointer()
        .hover(s => s.bg(t.hover)).tooltip(`${e.i.id} ${label} ${ago(new Date(e.at).toISOString())}${e.who ? ` · ${e.who}` : ""}\n${e.i.title ?? ""}`)
        .on_click((_e, cx) => this.revealIssue(e.i.id, cx))
        .child(e.who ? this.avatar(e.who, t, 20) : div().size(20).flex_none().rounded_full().bg(t.raised))
        .child(v_flex().flex_1().min_w(0).gap(0)
          .child(div().truncate().text_size(12.5).text_color(e.kind === "closed" ? t.muted : t.foreground).child(e.i.title ?? ""))
          .child(h_flex().gap(5).items_center().text_size(10.5).text_color(t.dim)
            .child(this.status(glyph, t, 9)).child(div().text_color(color).child(label))
            .child(div().font_family(mono).child(strip(e.i.id, prefix)))))
        .child(div().flex_none().font_family(mono).text_size(10.5).text_color(t.dim).child(age(e.at))));
    });
    if (!activity.length) activity.push(this.emptyList(t, this.filtering ? this.noMatch() : tx("Noch nichts passiert"), null));
    const feed = v_flex().id("ov-activity").min_w(0).min_h(0).rounded(10).border_1().border_color(t.border).bg(t.surface).p(8).gap(1)
      .child(h_flex().h(22).px(4).gap(8).items_center()
        .child(div().flex_1().font_semibold().text_size(12.5).child(tx("Aktivität")))
        .child(div().text_size(11).text_color(t.dim).child(events.length > ACTIVITY ? tx("{a} von {b}", { a: ACTIVITY, b: events.length }) : String(events.length))))
      .child(v_flex().id("ov-activity-list").flex_1().min_h(0).overflow_y_scrollbar().children(activity));

    const w = this.size?.width ?? 1400;
    const pair = (a, b) => w >= 980
      ? h_flex().flex_none().gap(12).items_start().child(div().flex_1().min_w(0).child(a)).child(div().flex_1().min_w(0).child(b))
      : v_flex().flex_none().gap(12).child(a).child(b);
    const main = [kpis, standing, pair(throughput, backlogCard), epics, pair(queue, blockedCard), breakdown];

    // Wide: the dashboard left, who's active and what happened right. Narrow: all one column.
    if (w < 1180) {
      return v_flex().id("ov-stack").flex_1().min_h(0).overflow_y_scrollbar().p(12).gap(12)
        .children(main).child(activeCard).child(feed.flex_none().h(560));
    }
    return h_flex().flex_1().min_h(0).p(12).gap(12)
      .child(v_flex().id("ov-main").flex_1().min_w(0).h_full().overflow_y_scrollbar().gap(12).pr(2).children(main))
      .child(v_flex().w(380).flex_none().h_full().gap(12)
        .child(v_flex().id("ov-active-scroll").flex_none().max_h(320).overflow_y_scrollbar().child(activeCard))
        .child(feed.flex_1()));
  }

  render(cx) {
    const t = theme(), mono = settings().font_family ?? "JetBrains Mono";
    const f = focused();
    if (f?.terminal) this.lastTerminal = f.terminal;
    this.tick(cx);
    const w = this.wanted(), { loc, root, list } = w;
    const repoKey = root?.beads ? `${loc.on}|${root.beads}` : null;
    if (repoKey !== this.repoKey) {
      // A repo change starts clean; the first repo keeps an issue asked for before it resolved.
      if (this.repoKey !== null) { this.open = null; this.confirm = null; }
      this.repoKey = repoKey; this.limit = ROWS;
      this.collapsed.clear(); this.closedOpen.clear(); this.curTree = null;
    }

    // Which issues, and which open ones wait on another open one.
    const issues = list?.issues ?? null;
    let body = null, progress = 0;
    this.rows = [];
    if (this.view !== "tree") this.curTree = null;
    const notClosed = new Set((issues ?? []).filter(i => i.status !== "closed").map(i => i.id));
    const isBlocked = (i) => i.status === "blocked" || (this.view !== "ready" && i.status !== "closed" && (i.dependencies ?? []).some(d => d.type === "blocks" && notClosed.has(d.depends_on_id)));
    // The filter (text and chips) every view applies.
    const facts = this.facts(issues ?? [], isBlocked);
    const stateOf = (i) => facts.state.get(i) ?? (i.status === "closed" || i.status === "in_progress" || i.status === "deferred" ? i.status : isBlocked(i) ? "blocked" : "open");
    const whoOf = (i) => facts.who.get(i) ?? (i.assignee ? squash(i.assignee) : "");
    const user = root?.user ?? null;
    const ctx = { user, me: user ? squash(user) : null, stateOf, whoOf };
    // Shown as bd spells it, when it does.
    if (ctx.me) ctx.user = (issues ?? []).find(i => i.assignee && whoOf(i) === ctx.me)?.assignee ?? user;
    const fn = this.filterFn(ctx);
    this.filtering = Boolean(fn); this.pass = fn ?? (() => true);
    const quickBar = issues && root?.beads ? this.quickBar(issues, ctx, t) : null;
    if (!loc.cwd) body = this.empty(t, tx("Kein Ordner"), null);
    else if (!root) body = this.empty(t, tx("Suche Repo…"), loc.cwd);
    else if (root.error) body = this.empty(t, tx("Ordner nicht lesbar"), root.error);
    else if (!root.beads) body = this.empty(t, root.git ? tx("Keine Beads in {x}", { x: base(root.git) }) : tx("Kein Git-Repo"), root.git ? tx("Kein .beads-Verzeichnis gefunden (bd init legt eins an).") : loc.cwd);
    else if (!issues && list?.noBd) body = this.empty(t, tx("bd nicht gefunden"), tx("Installiere beads (github.com/steveyegge/beads) auf dieser Maschine, dann neu laden."));
    else if (!issues && list?.error) body = this.empty(t, tx("bd-Fehler"), list.error);
    else if (!issues) body = this.empty(t, tx("Lade Beads…"), null);
    else {
      progress = this.view === "ready" ? 0 : issues.filter(i => i.status === "in_progress").length;
      if (this.view === "overview") body = this.overviewBody(issues, ctx, t, mono);
      else {
        const main = this.view === "tree" ? this.treeBody(issues, loc, root, t, mono, cx) : this.wide ? this.listWide(issues, ctx, loc, root, t, mono) : this.listBody(issues, isBlocked, loc, root, t, mono);
        // Wide: the list left, the selected issue right, the divider draggable (kept by the window).
        body = !this.wide ? main : h_resizable("beads-split").flex_1().min_h(0).w_full()
          .child(resizable_panel().child(v_flex().size_full().min_w(0).child(main)))
          .child(resizable_panel().size(480).size_range(320, 1100).child(this.panel(issues, isBlocked, loc, root, t, mono)));
      }
    }

    const repo = root?.beads ? base(root.beads) : null;
    const views = VIEWS.filter(v => this.wide || !v.wide);
    const segment = (v) => {
      const on = this.view === v.id;
      // A count only for the lists, and only while current: after a write, other views show none until reloaded.
      const entry = isList(v.id) && root?.beads ? this.lists.get(`${loc.on}|${root.beads}|${v.data}`) : null;
      const n = entry && entry.at > 0 && !entry.error ? entry.issues?.length : undefined;
      return h_flex().id(`view-${v.id}`).h(24).px(this.wide ? 10 : 7).gap(5).items_center().rounded(6).cursor_pointer().text_size(12)
        .bg(on ? t.raised : t.chrome).text_color(on ? t.foreground : t.muted).when(on, el => el.border_1().border_color(t.border))
        .hover(s => s.text_color(t.foreground))
        .on_click((_e, cx) => this.setView(v.id, cx))
        .child(tx(v.label)).when(n !== undefined && this.wide, el => el.child(div().text_size(10.5).text_color(on ? t.muted : t.dim).child(String(n))));
    };
    const note = this.note && (!this.note.repo || this.note.repo === repoKey) ? this.note : null;
    const iconButton = (id, child, tip, onClick) => div().id(id).size(22).flex_none().flex().items_center().justify_center().rounded(6).cursor_pointer()
      .text_color(t.dim).hover(s => s.bg(t.hover).text_color(t.foreground)).tooltip(tip)
      .on_click((_e, cx) => onClick(cx)).child(child);
    const all = root?.beads ? this.lists.get(`${loc.on}|${root.beads}|all`) : null;

    return v_flex().id("beads").size_full().min_h(0).rounded(10).overflow_hidden().bg(t.background).border_1().border_color(t.border)
      .text_color(t.foreground).text_size(13).track_focus(this.handle)
      .on_size_change((size, cx) => { const was = this.size?.width ?? 0; this.size = size; if ((was < 820) !== (size.width < 820)) cx.notify(); })
      .on_key_down((e, cx) => {
        if (this.typing) {
          if (e.key === "escape") {
            if (this.filter) { this.input.set_value(""); this.filter = ""; this.limit = ROWS; }
            else { this.typing = false; this.handle.focus(); }
            cx.stop_propagation(); cx.notify();
          }
          return;
        }
        const m = e.modifiers ?? {};
        if (m.control || m.alt || m.platform || m.shift) return;
        if (["up", "down", "left", "right", "escape"].includes(e.key) && this.nav(e.key, cx)) cx.stop_propagation();
      })
      .child(h_flex().h(42).flex_none().px(14).gap(8).items_center().border_b(1).border_color(t.border)
        .child(svg(ICON).size(15).flex_none().text_color(t.muted))
        .child(div().font_semibold().flex_none().child(this.wide ? "Beads Dashboard" : "Beads"))
        .child(div().flex_1().min_w(0).truncate().text_size(12).text_color(t.dim).child(this.wide && root?.beads ? root.beads : repo ?? ""))
        .when(this.wide && Boolean(all?.issues), el => el.child(div().flex_none().text_size(11.5).text_color(t.dim).child(tx("{n} Issues", { n: all.issues.length }))))
        .when(progress > 0, el => el.child(h_flex().id("beads-progress").flex_none().gap(4).items_center().text_size(11).text_color(t.muted)
          .tooltip(tx("{n} in Arbeit", { n: progress })).child(this.status("in_progress", t, 10)).child(String(progress))))
        .when(this.loading, el => el.child(svg(`${DIR}/spinner.svg`).size(12).flex_none().text_color(t.dim).spin(900)))
        .when(!this.loading && Boolean(root?.beads), el => el.child(iconButton("beads-refresh", svg(`${DIR}/refresh.svg`).size(13), tx("Neu laden"), cx => this.reload(cx))))
        .when(!this.wide && Boolean(root?.beads), el => el.child(iconButton("beads-wide", div().text_size(13).child("⤢"), tx("Als Tab öffnen (Dashboard, Baum)"), () => this.openWide()))))
      .when(Boolean(root?.beads), el => el.child(h_flex().h(38).flex_none().px(8).gap(6).items_center().border_b(1).border_color(t.border)
        .child(h_flex().flex_none().gap(2).p(2).rounded(8).bg(t.chrome).children(views.map(segment)))
        .child(h_flex().id("beads-filter").flex_1().min_w(60).when(this.wide, el => el.max_w(360)).h(26).px(7).gap(5).items_center().rounded(7).border_1()
          .border_color(this.typing ? t.accent : t.border).cursor_text().on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .child(svg(`${DIR}/search.svg`).size(12).flex_none().text_color(t.dim))
          .child(Input.new(this.input).flex_1().h_full().text_size(12).text_color(t.foreground))
          .when(!this.wide, x => x.child(h_flex().id("beads-quick-toggle").h(18).px(4).gap(3).flex_none().items_center().rounded(4).cursor_pointer()
            .text_color(this.quickOpen || this.quick.size ? t.foreground : t.dim).when(this.quickOpen, y => y.bg(t.raised))
            .hover(s => s.bg(t.hover).text_color(t.foreground)).tooltip(tx(this.quickOpen ? "Schnellfilter einklappen" : "Schnellfilter zeigen"))
            .on_click((_e, cx) => {
              cx.stop_propagation();
              this.quickOpen = !this.quickOpen;
              try { localStorage.setItem("quickOpen", this.quickOpen ? "1" : "0"); } catch {}
              cx.notify();
            })
            .child(svg(`${DIR}/filter.svg`).size(12))
            .when(this.quick.size > 0, y => y.child(div().text_size(10.5).font_semibold().child(String(this.quick.size)))))))))
      .when(Boolean(quickBar), el => el.child(quickBar))
      .when(Boolean(list?.error && issues), el => el.child(div().px(12).py(5).text_size(11).text_color(t.ansi1).border_b(1).border_color(t.border).truncate().child(`bd: ${list.noBd ? tx("bd nicht gefunden") : list.error}`)))
      .child(body)
      .when(Boolean(note), el => el.child(h_flex().id("beads-note").flex_none().px(12).py(6).gap(8).items_center().border_t(1).border_color(t.border).text_size(11.5)
        .text_color(note.error ? t.ansi1 : t.muted).cursor_pointer().on_click((_e, cx) => { this.note = null; cx.notify(); })
        .child(div().flex_1().min_w(0).truncate().child(note.text)).child(div().text_color(t.dim).child("×"))));
  }
}
