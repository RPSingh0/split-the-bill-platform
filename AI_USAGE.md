# AI usage

How AI tools were used to build this frontend, what I did myself, and where the AI got things wrong.

## Tools

| Tool | Used for |
|---|---|
| **Claude desktop app** | Brainstorming the product, the design review that locked the requirements, and the design spec shared with the backend. |
| **Claude Code** (Claude Opus 5.5, in the terminal) | Planning and implementing the frontend feature by feature, reading the installed libraries' docs and source, and checking each feature against a real backend and a real browser. |

Claude Code used three installed design skills as references: Apple-style interface guidance (`apple-design`), UI polish rules (`better-ui`) and Vercel's Web Interface Guidelines (`web-design-guidelines`).

## How we worked

- **Spec first.** The same locked spec as the backend. Where it was silent, Claude picked the simplest option and flagged it; those choices are in the README under "Decisions we made".
- **Plan, approve, then code.** For each feature, Claude wrote a plan (files, behaviour, error cases). I reviewed it, and only after my approval did Claude create a feature branch and write the code.
- **One branch per feature, commits by me.** Claude never committed or pushed. It wrote a commit message for each branch; I reviewed, committed and merged, so the history is one reviewed branch per feature: scaffold, auth, my bills, extract, review, bill join, live bill, host controls, docs.
- **Rules I set for the code:** no code before approval; the simplest possible code with plain loops and small functions; no comments in code files.
- **Decisions I made:** npm instead of pnpm; which design skills to use; approving the feature plan and its order.
- **Verification:** the spec has no frontend tests, so every feature was checked with throwaway scripts kept outside the repo — form submissions against the production build, the review logic compared with the real backend, and headless Chrome (driven by `playwright-core`) with several browsers at once acting as the host and friends. All of it ran against the backend in Docker; nothing was written to the production database.

## Where the AI got it wrong

### 1. Live updates never started (main example)

**What happened.** For the live bill page, Claude used SWR with the server-rendered bill as `fallbackData` and wrote the polling interval as a function: `(latest) => latest?.status === "open" ? 3000 : 0`. It built, it linted, and the page looked right. But nothing ever polled. SWR decides the interval from its **cache**, and `fallbackData` is not in the cache, so the function saw `undefined` and returned 0. SWR only reschedules after a re-render, and the first background fetch returned exactly the same bill, so there was no re-render and the timer was never set. A friend's claim would only have appeared on the host's screen after a manual reload — the opposite of the spec's "within about 3 seconds, without reloading".

**How it was found.** The end-to-end check opened three browsers (host, Priya, Ravi), had Priya claim an item, and waited for it on the host's screen. It timed out. A small debug script then logged the page's network requests: one fetch on load, then silence.

**The fix.** The interval now falls back to the initial bill's status when the cache is empty (`pollInterval` in `components/bill-page.tsx`). The same check then saw Priya's claim on the host's screen after 2.9 seconds, and the idle page polled every 3 seconds with `?since=`, getting `{changed:false}` back.

**Lesson.** "It builds" says nothing about behaviour that happens between two browsers over time; the requirement has to be tested the way a user would notice it.

### 2. Layout bugs only a screenshot could show

All of these passed lint, type checks and the functional tests. They were caught by checking the layout at phone width, mostly from headless-browser screenshots:

- **Dropdowns shorter than the inputs.** Claude sized the selects with `h-10`, but shadcn's own `data-[size=default]:h-8` rule is more specific and won, leaving 32 px dropdowns next to 40 px inputs. Fixed by overriding that same data rule.
- **Squashed buttons.** The host's **Mark done** and **Cancel bill** used `flex-1` inside a column on phones, which sets their height basis to 0, so both rendered about 20 px tall. Fixed with `sm:flex-1`, so they only stretch when side by side.
- **Toasts over the "You owe" bar.** Error toasts appeared at the bottom on phones, on top of the sticky total. Moved to the top.
- **A cramped charge row.** The first mobile layout gave the charge-kind dropdown about 70 px, too narrow for "Service charge"; the row was reworked into three lines on phones.

### 3. Mistakes in its own test scripts

Several first failures were in the test scripts, not the app. Claude investigated each before touching app code:
- Checks for an error message found Next.js's own empty `role="alert"` route announcer instead of the form's message.
- A check searching for the text "Host controls" matched the test bill's name, "HOST CONTROLS CAFE".
- "Red borders after the fix" turned out to be screenshots taken during the 150 ms colour transition; reading the computed styles a second later showed the normal border.
- PowerShell 5.1 silently drops a hand-set `Cookie` header, which first made a logged-in check look like a redirect to login.

### Something the AI did to avoid mistakes

This build used newer versions than Claude knew well: Next.js 16 (where middleware became `proxy.ts`), shadcn's Base UI components and SWR 2.5. Instead of guessing, it read the docs bundled in `node_modules/next/dist/docs` before using `proxy.ts`, `refresh()`, the error boundary's `retry` prop and catch-all route params. It also read the Base UI and SWR type definitions and source, for example to confirm that the select's hidden input can't break the grid layout. When shadcn added an unfamiliar two-letter npm package, `cn`, it checked who publishes it before keeping it, because short names are easy to squat.

## What was verified, and how

| Check | How |
|---|---|
| Login, signup, logout | Form submissions against the production build: cookie attributes, redirects, the `next` parameter (including `//evil.com`), duplicate and invalid usernames, wrong passwords |
| Extraction route | Missing cookie, expired session (cookie cleared), missing provider or key, both or neither input, a 5 MB file, a HEIC file, and fake OpenAI and Gemini keys sent to the real providers; the server log was scanned to confirm no key appeared |
| Browser checks match the server | 12 broken drafts sent through the browser rules and to the backend: identical error codes and field paths on every one |
| Money | Exact rupee-to-paise parsing, rejection of 3 decimals, and a percentage tip computed the same as the server's |
| Review screen | Headless Chrome: key restored after a reload, live issues, server issues cleared on edit, sample receipt 3 fixed by adding the torn-off line, draft kept across a reload, bill created and draft cleared |
| Joining | 32 checks with separate browsers: nothing about the bill shown before joining, the "is that you?" paths, the host's name refused, Not you?, a removed participant, full, settled, cancelled and unknown bills, the pass-through allowlist |
| Live claiming | 16 checks with three browsers: claims seen on another screen in under 3 seconds, the unit cap and its rollback toast, the split adding up to the bill, polling with `?since=`, Copy link, and settled bills no longer polling |
| Host controls | 15 checks: Remove with confirmation, Mark done blocked until everything is claimed (including a last-moment unclaim), and Cancel reaching every screen |
| Look and feel | Screenshots of the main screens at 390 px and 1280 px, in light and dark mode |
