# UBGE Bunker Siege Calculator

A siege planning tool for **Foxhole** bunkers: how many shells to open a breach, how many to
level the whole island, and which weapon gets there fastest.

**Live: https://ubge-bunker-calc.vercel.app**

Built by **Chico — Builder da UBGE** (Colonial). Fan-made, not affiliated with Siege Camp.
The tool itself is faction-neutral — the numbers are the same for everyone.

---

## What it does

- **Import a build in one paste.** Hit *Copy* on the stats card at
  [foxbunker.com](https://foxbunker.com) and paste it in. No rebuilding piece by piece.
- **Two-phase breach model.** Foxhole does not let you destroy pieces until the island's shared
  HP drops to the breach threshold. The tool separates *hits to reach the threshold* from *hits
  inside the breach* — and applies each ammo's Breaching Modifier only where it actually applies.
- **Weapon comparison.** All 21 weapons ranked against your bunker, so you can answer "what do we
  bring?" instead of guessing. Click a row to load it into the planner.
- **Real fire rates.** Reload auto-fills from the datamine's mount data per weapon, instead of a
  made-up default. Still editable.
- **Artillery Shelter modelling**, including which damage types it affects and which bypass it.
- **Saved targets.** Keep known enemy bunkers between sessions.
- **"How it works" tab** explaining where a bunker's HP number comes from, with the formula
  running live.

## Where the numbers come from

Everything is read from the **Foxhole datamine (Update 65)** — `Ammo`, `Damage Types`,
`Damage Profiles`, `Structures (Bunkers)` and `Mount Points`.

The project has one rule: **never invent a game value.** If something is not in a primary source
it is either left blank or shown as an estimate, never quietly filled in. Two things are currently
flagged as estimates in the UI:

- **Stacking of the 2nd and 3rd Artillery Shelter.** The datamine defines only the first
  (`Base Shelter Bonus = 0.15`). There is no field anywhere describing how it stacks.
- **The wet-concrete damage multiplier and its decay curve.** The 18h curing window is from the
  datamine (`Concrete Settle Duration Mins = 1080`), but the ×10 multiplier and the shape of the
  falloff come from foxholeplanner, which still uses the older 24h window.

"Repair rate" is shown blank for the same reason — it is not confirmed in any source we have.

## Known gaps

- The Artillery Shelter bonus applies to pieces **adjacent** to the shelter, so the selector asks
  how many shelters sit next to *the piece you will shell*. That is a manual input: the imported
  stats carry no shelter information at all, so it cannot be derived from them.
- The optional image-import path calls the Anthropic API with **your own key**, stored only in
  your browser's localStorage and sent only to Anthropic. The paste-text method is offline, free
  and exact — prefer it.

## Feedback

Bug reports, wrong numbers and feature ideas are very welcome —
[open an issue](https://github.com/rafaelfranciscoap-sys/ubge-bunker-calc/issues). If you think a
number is wrong, please include the bunker's stats line so it can be reproduced.

---

## Development

```bash
npm install
npm run dev        # dev server
npm run build      # typecheck + production build
npm test           # vitest
npm run lint       # oxlint
```

Stack: React 19, TypeScript, Vite, Tailwind v4, Zustand. Everything runs client-side — no backend,
no telemetry, no accounts.
