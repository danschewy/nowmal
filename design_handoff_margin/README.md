# Handoff: Margin — a task and commitment layer over Gmail

## Overview

Margin is a desktop web app that sits above a user's Gmail account. It reads mail (read-only) and infers structured work from it: **Tasks** (what other people have asked of you), **Promises** (what you committed to in your own sent mail), **Trackers** (multi-thread processes like a job search or an apartment search), and **Clusters** (mail reorganised by subject matter rather than time). An assistant called **Eve** lives in a persistent right-hand panel, drafts replies, and answers questions about the inbox.

The product's central thesis, which every screen must preserve: **Eve reads and drafts; a human sends.** Nothing leaves the account without a person clearing a gate. The "Now" screen exists specifically to make that gate visible and unavoidable.

Hero persona for this version: a job seeker running a search across ~6 companies while also looking for a flat.

## About the Design Files

`Margin.dc.html` in this bundle is a **design reference created in HTML** — a working prototype that shows intended look, copy, and behaviour. It is **not production code to copy directly**. It is authored in a bespoke streaming-template runtime (`support.js`) that you should not port.

Your task is to **recreate these designs in the target codebase's existing environment** — React, Vue, SwiftUI, native, whatever the project already uses — following its established patterns, component library, routing, and data layer. If no environment exists yet, choose the framework most appropriate for the project and implement there.

To view the prototype: open `Margin.dc.html` in a browser with `support.js` beside it. It is fully interactive — click through it before implementing.

## Fidelity

**High-fidelity.** Colors, typography, spacing, copy, and interaction states are all final and intentional. Recreate the UI faithfully using the codebase's own primitives. Every string in the prototype is deliberate product copy — reuse it verbatim unless a stakeholder changes it.

---

## Design Tokens

### Color

| Token | Value | Use |
|---|---|---|
| `bone` | `#f2efe7` | App background, text on ink |
| `paper` | `#fbf9f4` | Raised surfaces: expanded rows, cards, drafts |
| `paper-alt` | `#f7f5ef` | Unselected cluster tiles |
| `ink` | `#16150f` | Primary text, filled buttons, Eve panel background |
| `ink-soft` | `#5c5a50` | Secondary body text |
| `ink-mute` | `#8a8779` | Mono labels, inactive nav |
| `ink-faint` | `#a8a496` | Tertiary labels, metadata keys |
| `ink-ghost` | `#c9c5b6` | Disabled text, dashed-border text, "let go" states |
| `hairline` | `#ddd9cd` | Row dividers, borders, inactive controls |
| `hairline-soft` | `#e6e2d6` | Dividers inside cards |
| `hairline-dash` | `#e0dccf` | Suggestion row dividers |
| `accent` (rust) | `oklch(0.62 0.16 25)` | "Needs you", evidence highlight, unresolved gate, collisions, overdue |
| `moss` | `oklch(0.62 0.16 145)` | Verified, connected, kept, "waiting on them" |

`accent` is themeable (see Props). Alternates offered: `oklch(0.62 0.16 75)` ochre, `oklch(0.62 0.16 250)` indigo, `oklch(0.62 0.16 320)` plum. All share chroma and lightness; only hue varies. `moss` is fixed.

Evidence highlight: `color-mix(in oklab, <accent> 26%, transparent)` with `padding: 1px 2px`.
Verified-slot highlight: `color-mix(in oklab, <moss> 22%, transparent)`.

On the ink panel, use `rgba(242,239,231,α)`: `0.14` hairlines, `0.22` draft borders, `0.30`–`0.45` labels, `0.62` secondary text, `1.0` primary.

### Typography

Two families, both Google Fonts:

- **Bricolage Grotesque** (variable, `opsz 12..96`, `wght 200..800`) — all prose. Fallback `"Helvetica Neue", Helvetica, sans-serif`.
- **JetBrains Mono** (400, 500) — all metadata, labels, buttons, counts, timestamps, system voice.

The rule is absolute and load-bearing: **Bricolage for anything a human wrote, JetBrains Mono for anything the machine is reporting.** Never mix.

| Role | Family | Size | Weight | Letter-spacing | Line-height |
|---|---|---|---|---|---|
| Page h1 | Bricolage | 46px | 500 | -0.04em | 1.05 |
| Section h1 (search) | Bricolage | 38px | 500 | -0.035em | 1.1 |
| Now task title | Bricolage | 28px | 500 | -0.03em | 1.2 |
| Empty-state h1 | Bricolage | 44px | 500 | -0.04em | 1.06 |
| Wordmark | Bricolage | 27px | 600 | -0.035em | 1 |
| Lede paragraph | Bricolage | 17px | 400 | — | 1.6 |
| Task title | Bricolage | 21px | 500 | -0.022em | 1.25 |
| Promise quote | Bricolage | 19px | 400 | -0.02em | 1.45 |
| Tracker row title | Bricolage | 20px | 500 | -0.02em | — |
| Evidence quote (expanded) | Bricolage | 18px | 400 | -0.01em | 1.55 |
| Draft body | Bricolage | 16.5px | 400 | -0.01em | 1.65 |
| Brief line / thread quote | Bricolage | 16px | 400 | -0.01em | 1.55 |
| Nav item | Bricolage | 16px | 400/600 | -0.02em | — |
| Cluster tile name | Bricolage | 17px | 500 | -0.02em | — |
| Thread subject | Bricolage | 15.5px | 400 | -0.01em | — |
| Check text | Bricolage | 15.5px | 400 | -0.015em | 1.4 |
| Eve message | Bricolage | 14.5px | 400 | -0.01em | 1.6 |
| Secondary note | Bricolage | 13.5px | 400 | — | 1.5–1.55 |
| Mono section label | JetBrains | 10px | 400 | 0.18em | — |
| Mono row meta | JetBrains | 10px | 400 | 0.12–0.14em | — |
| Mono button | JetBrains | 9.5–10.5px | 400 | 0.12–0.14em | — |
| Mono micro | JetBrains | 9–9.5px | 400 | 0.10–0.16em | 1.7–1.9 |
| Mono key/value | JetBrains | 10–12.5px | 400 | 0.01–0.10em | — |

All mono text is `text-transform: uppercase` **except** endpoint URLs, token strings, tool names, draft bodies, and the "learned" ledger, which stay sentence case.

Body prose uses `text-wrap: pretty` throughout.

### Geometry & spacing

**Border radius is 0 everywhere.** No rounded corners anywhere in the product. This is deliberate.

- Borders: `1px solid` for structure, `1px dashed` for anything Eve is proposing rather than asserting, `2px solid #16150f` for the "you are editing this" underline and the thread-reader left rule.
- Content column: `max-width: 1080px`, padding `52px 56px 120px`. Individual views constrain further: 640px (empty state), 720px (Setup), 760px (Brief), 800px (Now), 820px (Search), 860px (Rules), 880px (Promises), 900px (Agents).
- Row padding: `19px 4px` default (Balanced density). Airy `26px`, Dense `12px`.
- Button padding: `8px 12px` small, `9px 13px` standard, `14px 20px` primary.
- Section header pattern: mono label + `border-bottom: 1px solid #16150f` + `padding-bottom: 12px`, then rows divided by `1px solid #ddd9cd`.

### Motion

Only three animations exist. Do not add more.

```css
@keyframes mgfade { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
@keyframes mgpulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.28 } }
```

- Expanding rows: `mgfade .18s ease both`
- Live-pull indicator: `mgpulse 1.9s ease-in-out infinite`
- Toast: `bottom` transitions `.28s cubic-bezier(.2,.7,.3,1)` from `-80px` to `32px`
- Setup scan bar: `width` transitions `1.6s cubic-bezier(.3,.8,.3,1)`

---

## App Shell

Three columns, `display: flex`, `height: 100vh`, root `overflow-x: auto; overflow-y: hidden`.

**1. Left rail** — `flex: 0 0 236px`, `border-right: 1px solid #ddd9cd`, padding `30px 24px 24px`, `display: flex; flex-direction: column; gap: 30px`, `min-height: 0; overflow-y: auto` (required — without it the footer shears when a horizontal scrollbar appears).

Contents top to bottom:
- Wordmark "Margin" + mono subtitle "A QUIET LAYER OVER GMAIL"
- Search input: full width, transparent, `border-bottom: 1px solid #ddd9cd`, mono 10.5px, placeholder "Search everything"
- Primary nav (6 items, each `padding: 9px 24px`, negative margin to bleed full-width, `border-left: 3px solid` accent when active, ink/600 when active vs ink-mute/400, right-aligned mono count): **Brief · Now · Tasks · Promises · Trackers · Mail**
- Spacer (`flex: 1`)
- Secondary nav, mono 9.5px: **Setup · Rules · Agents**
- Footer block above a hairline: account email (mono 10px), moss square + "SYNCED 2 MIN AGO", then "READ-ONLY ACCESS / NOTHING SENT WITHOUT YOU" in ink-ghost, `line-height: 1.55`

**2. Center column** — `flex: 1`, **`min-width: 680px`** (required; below this the desktop layout must scroll horizontally rather than compress), `overflow-y: auto; overflow-x: hidden`.

**3. Eve panel** — `flex: 0 0 376px`, `background: #16150f`, `color: #f2efe7`, full height, `display: flex; flex-direction: column`. Detailed below.

**Toast** — `position: fixed`, centered, `bottom: 32px` when present / `-80px` when not, ink background, mono 10.5px uppercase, `padding: 13px 18px`, `z-index: 50`, with an underlined "Undo" 16px to the right of the message. Auto-dismisses "mark done" toasts after 4200ms; others persist until replaced.

---

## Screens

### 1. Brief

**Purpose:** the 09:00 digest. Everything that changed since the last pull, then get out.

Eyebrow "BRIEF · SATURDAY 16 AUGUST, 09:00". H1 "Six lines, then you can go." Lede explains Eve only writes this at the user's pull times so there is nothing to check in between.

Six rows, `grid-template-columns: 96px 1fr`, gap 24px, padding `19px 2px`, hairline between, hover `background: #fbf9f4`, whole row clickable and routes to the relevant view. Left column is a mono tag; tag color is accent for `Collision` and `Broken`, ink-ghost for `Clear`, ink-mute otherwise.

| Tag | Text | Routes to |
|---|---|---|
| Moved | Owen Reyes offered two slots for next week. Neither is confirmed, and you said you would answer today. | Tasks |
| Quiet | Halyard, six days. Priya's own window closed on Friday. | Trackers |
| Collision | Friday is carrying two reference requests, Kestrel and Ostler Lane. Same day, same favour, different people. | Tasks |
| Broken | You told Marguerite the scope would go out this week. It did not. | Promises |
| New | Two listings matched your filters overnight. Neither is over budget. | Mail |
| Clear | Nothing new in Money, and nothing in Everything Else has asked you for anything. | Mail |

Footer: primary "START THE SESSION" (routes to Now, marks brief read), text button "MARK READ" / "MARKED READ", right-aligned "NEXT BRIEF 16:00 · LIVE IN BETWEEN" (reflects the pull setting from Tasks).

Nav badge shows `6` until read, then `0`.

### 2. Now — the focused session

**Purpose:** clear the day's sends one at a time, through a gate that a machine cannot clear alone. This is the most important screen in the product.

Eyebrow "NOW · FOCUSED SESSION". H1 "One at a time, until they are gone." Below it, a progress strip: one 9px square per session task (filled ink = done, accent = current, `1px solid #c9c5b6` = upcoming), then mono "1 OF 3 · ABOUT 12 MINUTES LEFT".

**Task block:**
1. Title, Bricolage 28px/500.
2. Evidence line: accent 5px square + the source sentence in quotes at 14px ink-soft, with mono provenance appended (`AUG 14, 09:12 · THREAD #4412`).
3. **Draft card** — `border: 1px solid #16150f`, `background: #fbf9f4`. Two mono header rows (`TO`, `SUBJECT`, `grid-template-columns: 60px 1fr`, divided by `#e6e2d6`), then the body at 16.5px with `white-space: pre-wrap` and `padding: 26px 20px`. Unfilled slots render as `————————————` in accent; filled slots render with the moss highlight.
4. **"Before this sends"** section header with a right-aligned count — `N LEFT` in accent, or `ALL CLEAR` in moss.
5. **Check rows** — `grid-template-columns: 14px 1fr auto`. Marker: moss filled square = machine-verified; ink filled = you answered it; `1px solid accent` hollow = unanswered. Right tag: the verification source (`VERIFIED · CALENDAR, AUG 19`), or `ANSWERED BY YOU`, or `NEEDS YOU` in accent. Unanswered rows are clickable and expand (`mgfade`) to show the question, an explanation of why Eve won't answer it, and option chips. Selecting an option fills the slot, rewrites the draft, and collapses the row.
6. **Gate footer** — Send button is `1px dashed #c9c5b6` with ink-ghost text and `cursor: not-allowed`, labelled `LOCKED · N UNANSWERED`, until every check resolves; then it becomes solid ink `SEND AND CLOSE`. Beside it "SKIP FOR NOW". Right-aligned two-line mono note: "Eve wrote the draft. / She cannot clear these for you." → "Every claim in this draft / traces back to a source."

**Session content (3 tasks):**

*Task 1 — Kestrel references.* Draft: `Hi Dana,\n\nGreat to meet you Thursday. My two references are {slot}.\n\n{conditional}\n\nBest,\nJ.` Checks: (a) "Names two referees" — options *Tobin Wray and Alia Ferrand* / *Only Tobin Wray* / *Neither, I will add them*; note explains Eve found both in sent mail from March but won't put a name in an email you didn't choose. (b) "Both have agreed to be contacted" — options *Yes, both agreed* / *Not yet, soften the line*; picking "soften" swaps the second paragraph to "I am checking with them today and will confirm before Friday." (c) verified: "Friday end of day is the deadline they set".

*Task 2 — Northline confirmation.* All three checks pre-verified (calendar free, no clash with the Kestrel panel, same timezone). Send is unlocked immediately. This is the deliberate contrast case.

*Task 3 — Halyard nudge.* Two verified checks, then the one that matters: **"Read it. Does this sound like you?"** — ask: "Eve cannot judge tone, and will not pretend to." Note: "This is the one gate that never clears on its own. Someone has to have read the words before they leave." Options *Yes, send as written* / *Too soft* / *Too pushy*, each producing a different draft.

**Completion state:** "Cleared." + a mono ledger of what was sent or skipped + "RUN IT AGAIN".

Sending appends an Eve message naming the recipient and the next task, marks the underlying task done, and fires an undo toast.

### 3. Tasks

Header row (`flex-wrap: wrap`, `justify-content: space-between`, `gap: 20px 32px` — must wrap, or the control clips): eyebrow "TASKS · INFERRED, NEVER TYPED" on the left; on the right a **pull control**:

- Two-segment ink-bordered toggle: **Live** (with a 6px moss square animating `mgpulse`) / **Scheduled**. Active segment is ink-filled.
- When Scheduled: a row of cadence chips — *15 MIN* / *HOURLY* / *9:00 & 16:00*.
- Status line below: moss "WATCHING NOW · 3 THREADS SINCE 09:00" when live; ink-faint "PAUSED · NEXT PULL 12:00" when scheduled (time derived from cadence).

H1 "What your inbox is actually asking you to do." Mono subline "3 need you · 2 waiting on someone else · 2 later".

**Collision banner** (dismissible, appears above the filters): `1px dashed #c9c5b6` on paper, accent 7px square + "FRIDAY 21 AUGUST IS CARRYING TWO OF THE SAME FAVOUR". Two rows (`150px 1fr auto`): Kestrel Labs / "Two references, by end of day" / "Their deadline"; Ostler Lane / "References for the tenancy, by Friday" / "Their deadline". Note: "Both want the same favour from the same two people. Tobin and Alia would each get two requests in one afternoon." Actions: primary "ASK OSTLER LANE FOR MONDAY" (dismisses banner, drafts the reschedule in Eve) and "BOTH ARE FINE".

**Filters:** All open / Needs you / Waiting / Later / Done, plus **Not tasks** which appears only once the user has dismissed something. Active filter carries a `2px solid accent` bottom border.

**Task rows:** `grid-template-columns: 14px 1fr auto`, gap 18px. Status glyph is a 9px square: accent = needs you, moss = waiting, `1px solid #a8a496` hollow = later, `#c9c5b6` filled = done. Title 21px/500 (ink-faint + `line-through` when done). Mono meta line: `COMPANY · STAGE · 94% CONFIDENCE`. Right column: due label in accent when today, ink-ghost when closed. Expanded rows get `background: #fbf9f4`.

**Expanded row** — `grid-template-columns: 1.35fr 1fr`, gap 52px, padding `2px 0 34px 32px`:

*Left, "EVIDENCE":* the source sentence at 18px with the extracted phrase highlighted in accent; mono provenance; then above a hairline, an accent 5px dot + the **lineage** line — "2 threads merged. Deduped against the Aug 12 request so this only asks you once."

*Right, "STASHED":* key/value rows, `grid-template-columns: 76px 1fr`, mono 10px, keys ink-faint uppercase. Fields: Company, Role, Stage, Contact, Due, Threads. Then actions: **Mark done** (ink filled) / **Ask Eve** (ink outline; pushes a message into the panel quoting the extracted line and the lineage) / **Snooze** (opens a chip row: *Tomorrow morning* / *Monday* / *A week* / *When they reply*) / **Not a task** (ink-ghost outline; turns accent-outlined "Put it back" once set). Below, a mono footnote: "Wrong inference? Not a task tells Eve, and she stops / reading that shape of sentence as an ask."

Below the list: "Eve read 41 threads to build this list and threw away 7 duplicates. / A task never appears twice, even when the same ask arrives from three people."

**Task data (9):** Kestrel references (needs you, today), Northline confirmation (needs you, today), Atlas take-home scope (needs you, tomorrow), Halyard offer timeline (waiting, 6 days), Atlas panel feedback (waiting, 3 days), Figma renewal (later, Aug 29), Cove & Wick NDA (later, Sep 2), plus two pre-closed: Cove & Wick portfolio PDF and Meridian reschedule. Each carries evidence split into three parts (pre / highlighted / post), source, lineage, confidence 0.72–0.97, and six stash fields.

### 4. Promises

**Purpose:** the symmetric half of Tasks — what *you* committed to, read out of *sent* mail.

Eyebrow "PROMISES · READ OUT OF YOUR SENT MAIL". H1 "The things you said you would do." Lede: "Tasks come from what people ask of you. These come from what you wrote back. Same evidence, opposite direction, and the one nobody tracks."

Filters: Open / On time / Overdue / Kept.

Rows, `grid-template-columns: 14px 1fr auto`, padding `20px 4px`: glyph (moss = kept, accent = late or broken, hollow = due), the promise **quoted verbatim at 19px**, mono attribution "YOU WROTE THIS · AUG 14 · TO DANA WHITFIELD · KESTREL LABS", a 13.5px context line, then **Mark kept** (ink filled) and **Say it will be late** (outline; pushes an Eve draft request). Right column: `DUE · FRI AUG 21`, accent when overdue.

**Promise data (7):**

| Quote | To | Status | Context |
|---|---|---|---|
| I will confirm a slot today. | Owen Reyes · Northline | Due today | Same commitment as the Northline task. Eve keeps it as one thing, not two. |
| I will get those over to you by Friday. | Dana Whitfield · Kestrel | Due Fri Aug 21 | This is where the Friday deadline actually came from, you set it yourself. |
| I will let you know before I put your name down. | Tobin Wray | Due before Friday | This one gates another. The Kestrel reference goes out Friday, and Tobin has not been told. |
| I will confirm by the weekend whether we want a second viewing. | Ilse Kramer · Verge Road | Late | Nothing sent since. The flat is still listed, so the door has not closed. |
| Let me come back to you on September early next week. | Rae Odell · Coalfell | Late | You said early next week on the 13th. That is the same phrase you are currently annoyed at Halyard for using. |
| I will send the scope through this week. | Marguerite Vance · Atlas | Broken | The week ended and nothing went out. Eve suggests saying so rather than quietly delivering late. |
| Portfolio PDF coming your way today. | Ines Barros · Cove & Wick | Kept | Kept. Sent three hours later, closed automatically. |

### 5. Trackers

**Purpose:** multi-thread processes, assembled without the user entering anything. Renameable, removable, and suggested by Eve.

Eyebrow "TRACKERS · BUILT OUT OF YOUR MAIL, NAMED BY YOU". Then a tab row (one chip per active tracker, ink-filled when selected, label is `NAME  COUNT` with `white-space: pre`).

Below: the tracker name as an **editable h1** (46px) with mono "RENAME" and "STOP TRACKING" links beside it. Rename swaps the h1 for an input styled identically (`border-bottom: 2px solid #16150f`, transparent, same 46px type) with a SAVE button; Enter commits. Below, a two-line mono note.

**Suggestion card** (when a tracker is proposed but not accepted): dashed border on paper, `grid-template-columns: 5px 1fr auto` — accent dot, name + reason, then **TRACK IT** / **NO**.
> Places to Live — "Four letting agents and twelve threads since Aug 9, all following the same shape: enquire, view, apply. Eve can track them the way she tracks the job search."

**Stage rail:** `repeat(5, 1fr)`, `border-top: 1px solid #16150f`, each cell mono stage name + a 34px count. Counts are cumulative reach (rows whose stage index ≥ this stage), i.e. a funnel.

**Rows:** `grid-template-columns: 1fr 168px 128px`, gap `14px 32px`. Left: company/address 20px/500 + mono role or price, then a 13.5px "last signal" line in plain English. Middle: a five-segment progress track — 1px hairline segments, filled ink up to the current stage, with the current segment rendered as `border-top: 3px solid accent`. Right: age (accent when the row is flagged warm) over the stage name. Closed rows drop to `opacity: 0.45`.

Clicking a row reveals a `grid-column: 1 / -1` action strip: **Advance to *next stage*** (ink filled; dashed and disabled at the final stage), **Closed, no** / **Reopen**, **Not a real one** (removes with undo).

**Tracker data:** *Job Search* (stages Applied · Screen · Interview · Onsite · Offer) with Halyard (offer pending, 6 days quiet, warm), Kestrel Labs, Atlas Foundry, Northline Systems, Cove & Wick, Meridian Freight (11 days quiet, warm). *Places to Live* (stages Enquired · Viewing · Viewed · Applied · Signed) with Ostler Lane, Bramble Street, Verge Road, Halsey Court, Pike Wharf.

Removing the last tracker gives a real empty state: "Nothing tracked" + "Nothing is being tracked. Eve keeps reading, and will offer something again when a pattern is worth a tracker."

### 6. Mail

**Purpose:** the inbox reorganised by subject matter, with Eve's read of each thread visible.

Eyebrow "MAIL · 275 THREADS, 4 CLUSTERS". H1 "Sorted by what it is about, not when it arrived."

**Suggestion strip** (above the tiles, dashed top border): "EVE NOTICED A PATTERN", then rows of `5px 1fr auto` — accent dot, name + mono count + reason, then **MAKE A CLUSTER** / **NOT A THING**.
> *Conference and travel* — 9 threads · 3 senders — "Nine threads since Aug 2 about the same two dates in October. Flights, a ticket and a hotel hold, currently scattered."
> *Coalfell, freelance* — 6 threads · 1 client — "Invoices and briefs from one client, sitting inside the job search where they keep being mistaken for applications."

**Cluster tiles:** `grid-template-columns: repeat(N, 1fr)`, `gap: 1px` over a `#ddd9cd` background (the gap *is* the hairline), `border: 1px solid #ddd9cd`. Each tile padding `20px 18px 22px`, `#f7f5ef` normally, ink-filled when selected. Header row must be `display: flex; justify-content: space-between; align-items: baseline; gap: 14px` with the name `min-width: 0` and the count `flex: 0 0 auto` — without this, wrapped two-line names collide with the count. Muted tiles show "muted" in place of the count and drop to `opacity: 0.5`.

**Cluster action bar** below the grid: selected cluster name, then **Rename** / **Mute** / **Delete**, then a standing ink-ghost line: "Deleting a cluster never deletes mail. Threads go back to Everything Else." Rename swaps in a mono input. Below it, when anything has been dismissed: "2 DISMISSED · SHOW THEM".

**Thread rows:** `grid-template-columns: 170px 1fr auto`, gap 28px. Left: sender + mono date. Middle: subject 15.5px, then an accent (task) or hairline (filed) dot beside Eve's one-line read. Right: a `TASK` pill (ink outline) or `FILED` (ink-ghost, no border).

Clicking a row opens the **reader**: `background: #fbf9f4`, `border-left: 2px solid #16150f`, padding `18px 20px`. Contains a mono head — "THE SENTENCE EVE ACTED ON" or "WHAT EVE READ, AND LET GO" — the quoted sentence at 16px, an outcome paragraph, then **OPEN IN GMAIL** and **STOP READING THIS THREAD**. This is deliberately *not* a mail client: it shows what Eve saw and what she did with it.

**Clusters:** The Search (41), Places to Live (12, "Cluster created Aug 9"), Money (8), Everything Else (214, "Nothing in here has asked you for anything"), plus the two accepted suggestions. Every thread carries `from`, `when`, `subject`, `quote` (the real sentence), `eve` (her one-line read), and `task: boolean`.

### 7. Setup

Eyebrow "SETUP · STEP 2 OF 3". H1 "Margin reads. It does not write." Lede covers the 90-day single pass, new mail thereafter, and that nothing is sent on your behalf.

Account card (`1px solid #16150f` on paper): email 19px/500 + "READ-ONLY · 90 DAYS · 4,118 THREADS FOUND", with a **CONNECT GMAIL** button that toggles to a ghosted **CONNECTED**. Below it a 2px scan bar that animates `width: 0 → 100%` over 1.6s on connect, with a mono status line: "WAITING TO CONNECT" → "4,118 THREADS READ · 41 OPEN · 9 TASKS · 7 DUPLICATES DISCARDED".

Permission list, `grid-template-columns: 22px 1fr auto`: moss square for granted, hollow for denied.
- Read the last 90 days, once — Required
- Watch new mail as it arrives — Required
- Keep a stash per task — Required ("Company, role, stage, contact, dates, thread ids. Stored so a task is never invented twice.")
- **Send on your behalf — Never** ("Off. Eve drafts, you press send. This cannot be turned on from here.")

Disconnecting puts every content screen into the first-run empty state: "There is nothing here yet, and that is correct." / "Margin has nothing of its own. Every task, tracker and cluster in it is read out of your mail. Connect the account and the first pass takes about a minute." / **GO TO SETUP**.

### 8. Rules

Eyebrow "RULES · WHAT EVE IS ALLOWED TO INFER". H1 "You decide how far Eve gets to go." Lede defines the three settings: "Off means Eve never looks. Suggest means she writes it down and waits. Act means she does it and tells you, with an undo."

Six rules, `grid-template-columns: 1fr 246px`, gap 40px. Right side is a three-cell segmented control inside `1px solid #ddd9cd`, cells divided by `border-left`, selected cell ink-filled.

| Rule | Default | Description |
|---|---|---|
| Turn asks into tasks | Act | A question with a deadline becomes a task. Everything else stays mail. |
| Merge duplicate asks | Act | Three people asking for the same references produce one task, not three. |
| Track prospects | Act | Build a pipeline when the same company appears across several threads. |
| Invent new clusters | Suggest | Notice a new theme, like a flat search, and give it a home. |
| Hold calendar slots | Suggest | Place tentative holds when times are offered, before you reply. |
| Draft nudges when someone goes quiet | Suggest | Write the follow-up. Sending is always yours. |

**"What Eve learned from you"** section: dated correction lines, `grid-template-columns: 14px 1fr`, each with a 7px ink-ghost square (accent for a live entry).
- Aug 12 · "let me know if" stopped reading as an ask. You corrected it three times.
- Aug 09 · Newsletters from 41 senders never become tasks, whatever they say.
- Aug 06 · Calendar invites are not tasks unless there is a question in the body.
- Jul 30 · "no rush" now pushes a due date out a week instead of dropping it.
- Jul 24 · Threads where you are on cc and never named are read, not surfaced.

When the user marks anything "Not a task", prepend a live accent-dotted line: "Today · you called N inference wrong. Eve is looking for what they share." Footer: "Corrections are the only training signal here. / Nothing you write is used to train anything outside this account."

Closing note (moss dot + mono): how clusters get created, that Places to Live appeared on Aug 9 after four letting agents in one week, and that a deleted cluster is never proposed again.

### 9. Agents (MCP)

Eyebrow "AGENTS · MODEL CONTEXT PROTOCOL". H1 "Other agents can work here. Same gates." Lede: Margin exposes tasks, evidence and stashed metadata over MCP so an agent the user already has can read state and do work — but it cannot clear a gate.

Connection card (`1px solid #16150f` on paper), rows `grid-template-columns: 96px 1fr auto`:
- ENDPOINT · `https://mcp.margin.app/sse/j-ellery` · **COPY** (ink filled → moss "COPIED" for 1600ms)
- TOKEN · `mgn_live_························7f21` · **ROTATE**
- TRANSPORT · "SSE · READ SCOPE BY DEFAULT · EVERY CALL LOGGED BELOW"

Tool list, `grid-template-columns: 1fr 108px 96px`: mono tool name, description, a scope tag, and an Enabled/Off switch. Scope tag styling: Read = ink-mute on hairline border; Write = ink on ink border; **Gated = accent on accent border**.

| Tool | Scope | Default | Description |
|---|---|---|---|
| `list_tasks` | Read | on | Every open task with its status, stage and due date. |
| `get_evidence` | Read | on | The exact sentence a task came from, plus thread id and sender. |
| `get_stash` | Read | on | Company, role, contact, dates, thread ids. The dedupe key lives here. |
| `search_threads` | Read | on | Full-text over the ninety days Eve has read. |
| `draft_reply` | Write draft | on | Write a draft into Now. It queues, it does not send. |
| `answer_check` | Gated | on | Resolve an evidence check, but only with a citable source. |
| `create_task` | Write | off | Add a task by hand. Deduped against everything Eve already found. |
| `update_pipeline` | Write | off | Move a prospect between stages. |

Below, accent dot + mono: "send_email is not a tool and will not become one. / An agent can fill a draft and answer evidence checks it can source. / The tone check, and the send, stay with you."

Connected agents: moss/ghost dot + name, last-activity line, call count, and a Revoke/Reconnect button.
- **Claude Desktop** — "Pulled evidence for four tasks this morning. Drafted the Kestrel reply you have open in Now." — 214 calls · 7 days
- **Research runner** — "Reads the pipeline nightly and looks up who else works at each company." — 38 calls · 7 days
- **Calendar agent** — "Revoked Aug 12 after it tried to answer a tone check." — 0 calls

### 10. Search

Typing in the rail search field replaces the center column entirely (all other views hide). Eyebrow "SEARCH · N ACROSS TASKS, PROMISES, THREADS AND TRACKERS". H1 is the query in quotes, or "Nothing matches …".

Results, `grid-template-columns: 96px 1fr`: a mono kind label (Task / Promise / Thread / Tracked) and title + subtitle. Clicking routes to the item **in context** — a task result opens Tasks with that row expanded; a thread result opens Mail on the right cluster with the reader open; a promise result opens Promises. Clearing the query restores the previous view.

---

## Eve Panel

Fixed 376px, ink background, full height.

**Header:** moss 7px square + "EVE" (mono 10.5px, `0.22em`), right-aligned "READING YOUR MAIL" at 40% opacity. Bottom border `rgba(242,239,231,0.14)`.

**Message list:** `flex: 1; overflow-y: auto`, padding 22px, `gap: 22px`. Eve messages are full-width with a mono "EVE" label at 45% opacity above 14.5px bone text. User messages are indented `padding-left: 34px` with the label and text at 30% / 62% opacity. No bubbles.

**Draft blocks** inside a message: `1px solid rgba(242,239,231,0.22)`, padding 14px, mono 11px, `line-height: 1.75`, `white-space: pre-wrap`.

**Suggestion chips:** wrapping row above the input, mono 9.5px uppercase, `1px solid rgba(242,239,231,0.32)`, padding `8px 11px`; hover inverts to bone fill with ink text.

**Input:** transparent, borderless, 13.5px, placeholder "Ask about your inbox", with a mono SEND to the right at 50% opacity. Enter submits.

**Scripted conversation.** Opening message: "Halyard has been quiet for six days. Priya said 'early next week' on the 10th, and that window closed on Friday." Chips: *Draft a nudge* / *Show me the thread* / *Leave it*.

The script is a map from chip label → `{ text, draft?, chips[], go? }`. Implement it as data, not branching code. Nodes: Draft a nudge, Make it shorter, Put it back, Send it, Show me the thread, Leave it, Actually draft the nudge, Snooze it a week, Not yet, What else is quiet?, Show me the pipeline (navigates), Draft a reply, Ask Ostler Lane to move the references to Monday. Unrecognised free text gets: "I only have your mail to go on, and nothing in it speaks to that yet. I will flag it the moment something does."

The panel auto-scrolls to the bottom 30ms after any new message. "Ask Eve" on a task pushes a two-message exchange quoting the extracted sentence and the dedupe lineage.

---

## State

Single store. Keys, with defaults:

```
view: 'tasks'                 // brief | now | tasks | promises | pipeline | mail | setup | rules | agents
query: ''                     // non-empty overrides view with search results
connected: true               // false → first-run empty state on all content views

// tasks
filter: 'all'                 // all | now | wait | later | done | wrong
open: null                    // expanded task id
done: ['t8','t9']
notTasks: []                  // corrected-away task ids
snoozing: null                // task id whose snooze chips are showing
collisionGone: false
pull: 'live'                  // live | sched
cadence: 'Hourly'

// now
nowIdx: 0
slots: {}                     // checkKey → chosen value; drives draft text + gate
openCheck: null
ledger: []

// promises
promFilter: 'all'
keptPromises: ['p7']

// trackers
trackerId: 'job'
trackersOn: ['job']
trackerNames: { job: 'Job Search', places: 'Places to Live' }
renaming: false, renameVal: ''
prospectState: {}             // rowKey → { at, closed, gone }
openProspect: null

// mail
cluster: 'search'
clusterNames: {}, deletedClusters: [], mutedClusters: []
acceptedClusters: [], dismissed: [], showBin: false
renamingCluster: false, clusterRenameVal: ''
openThread: null

// setup / rules / agents
rules: { tasks:'Act', dedupe:'Act', pipeline:'Act', clusters:'Suggest', holds:'Suggest', nudge:'Suggest' }
tools: {}                     // toolName → boolean override
revoked: ['Calendar agent']
copied: false

// eve
msgs: [ { who, text, draft? } ]
chips: [...]
input: ''

// chrome
briefRead: false
toast: null                   // { text, id, ...payload }
```

**Derived, never stored:** task status (`done` list overrides the datum), filter counts, gate count (`checks.filter(c => !c.ok && !slots[c.k]).length`), stage funnel counts, search results, the visible cluster list, tracker totals.

**Undo contract.** Every destructive or creative action fires a toast carrying a discriminator (`cl` accept cluster, `cd` delete cluster, `nt` not-a-task, `pr` remove tracked row, `ts` stop tracking, `tk` accept tracker, `sn` snooze, `rn` rename, `gm` gmail/mute, task id for mark-done). The Undo handler branches on it. Mark-done toasts self-dismiss after 4200ms; the rest persist until replaced.

**The three removal verbs** — keep these distinct in the model, they are the product's manners:
- *Not a thing / Not a task / Not a real one* — the inference was wrong. Records a correction, feeds the learned ledger, reversible.
- *Delete / Stop tracking* — the inference was right, the user doesn't want it. Content is untouched.
- *Mute* — keep it, stop surfacing it.

---

## Props (themeable)

The prototype exposes four:

| Prop | Type | Default | Effect |
|---|---|---|---|
| `accent` | color | `oklch(0.62 0.16 25)` | Every accent surface. Alternates: hue 75, 250, 320 at the same chroma/lightness. |
| `density` | enum | `Balanced` | Row vertical padding: Airy 26px / Balanced 19px / Dense 12px. |
| `showEvidenceInline` | boolean | `false` | Show the evidence quote on collapsed task rows. |
| `showConfidence` | boolean | `true` | Show `94% CONFIDENCE` in the task meta line. |

---

## Responsive

Desktop web only. The layout does **not** reflow to mobile; below ~1290px the shell scrolls horizontally rather than compressing (rail 236 + center min 680 + panel 376). Two constraints are load-bearing and were bugs before they were fixed: the center column needs `min-width: 680px`, and the rail needs `min-height: 0; overflow-y: auto` so it isn't sheared by the horizontal scrollbar. If the target product needs a real mobile layout, that is new design work — ask before inventing it.

## Accessibility notes for implementation

The prototype uses `div`s with click handlers throughout. In production: real `<button>` elements for every action, `<nav>` for the rail, `aria-expanded` on expanding rows, `aria-live="polite"` on the toast and the Eve message list, keyboard access to all chips and segmented controls, and a visible focus ring (the design has none — use a 2px ink outline offset 2px). The locked Send button should be `disabled` with `aria-describedby` pointing at the remaining-checks count.

## Assets

None. No images, no icon set, no SVG. Every graphic element is a CSS square, rule, or dot. Fonts load from Google Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

## Files

- `Margin.dc.html` — the complete interactive prototype. All screens, all data, all copy. Open it in a browser (with `support.js` beside it) and click through before implementing.
- `support.js` — the prototype's runtime. **Do not port this.** It exists only to make the HTML file run.
