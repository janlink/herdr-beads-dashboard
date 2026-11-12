# Beads Dashboard

A [Herdr](https://herdr.dev) mod for the [beads](https://github.com/steveyegge/beads)
issue tracker: a docked issue tree and list for the repo of the focused terminal,
and a full-tab dashboard. English or German (follows the system).

![Beads Dashboard](preview.png)

## Install

Copy `mods/beads-dashboard/` to `~/.config/herdr-app/mods/` (or ask your Herdr
agent to add `github.com/janlink/herdr-beads-dashboard`). `bd` must be installed
on each machine whose repos you open (Windows and WSL count separately).

It docks on the right of the layout shown when Herdr first sees it. Herdr's own
layouts (`main` and the others it ships) are read-only, so there it does not
appear by itself; for a tab-bar button next to Files and Changes, clone the
layout and the `tabs` mod as described under "Watch out" in [RECIPE.md](RECIPE.md).

Optional keys (`keys.json`), e.g.:

```json
{ "mod:beads-dashboard": { "ctrl-r": "beads-dashboard.refresh" } }
```

Commands: `focus`, `refresh`, `wide`, `view:overview|tree|ready|open|all`,
`filter:<text>`, `show:<id>`, `quick:<chip>`, `next`, `prev`, `fold`, `start`, `close`, `reopen`,
`copy`, `insert`, `lang:de|en|auto`.

See [RECIPE.md](RECIPE.md) for the full description.

## License

MIT, see [LICENSE](LICENSE).
