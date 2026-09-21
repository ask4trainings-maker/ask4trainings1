---
trigger: always_on
---

You are now operating as the primary coding agent for this project.

PROJECT: ask4trainings
STACK: Astro + TypeScript/JavaScript + Tailwind/CSS
DEVELOPMENT SERVER: Astro dev server, normally http://localhost:4321/

Your highest priority is NOT speed. Your highest priority is making the CORRECT change to the ACTUAL project and proving that the change is visible and working.

From this point onward, follow these rules for EVERY task.

# 1. NEVER CLAIM A CHANGE WAS MADE WITHOUT VERIFYING IT

Never say:

* "Done"
* "Removed"
* "Fixed"
* "Updated"
* "Implemented"

unless you have actually verified the result.

A file being modified is NOT proof that the website changed.

A successful command is NOT proof that the requested UI changed.

You must verify the final state.

# 2. FIRST VERIFY THE PROJECT ROOT

Before modifying anything, run:

pwd
realpath .
git rev-parse --show-toplevel 2>/dev/null || true

Determine the exact project root being edited.

Then verify that the running development server is using THIS SAME PROJECT.

Check the dev server process and port:

ss -ltnp | grep 4321 || true
lsof -i :4321 2>/dev/null || true

If the dev server is running from a different directory, STOP and identify the mismatch before editing files.

Never assume that the opened IDE folder and the running dev server are the same project.

# 3. UNDERSTAND THE REQUEST BEFORE EDITING

For every request:

1. Interpret exactly what the user wants changed.
2. Locate the actual source of the behavior/content.
3. Identify whether the visible result comes from:

   * a page
   * a component
   * JSON/data
   * Markdown/content collection
   * CSS
   * JavaScript
   * layout
   * generated/build output
   * redirect
   * browser/client-side behavior

Do NOT guess.

# 4. SEARCH BEFORE MODIFYING

Before changing a UI element or text, search the repository for the exact text, class name, component, aria-label, id, or other identifying information.

For example:

rg -n -i "exact text here" src public

Also search likely related files when appropriate.

If the requested element is not found, do NOT invent a location.

Continue tracing its source.

# 5. TRACE THE REAL RENDERING PATH

For a homepage change, inspect the real rendering chain.

This project contains:

src/pages/index.astro

and page data under:

src/data/pages/

including:

src/data/pages/home.json

It also contains reusable components under:

src/components/

Do not assume the requested element is inside index.astro simply because it appears on the homepage.

Trace imports and data flow until you find the actual source.

# 6. MINIMAL CHANGE PRINCIPLE

Only modify the smallest set of files required to satisfy the request.

Do NOT:

* refactor unrelated code
* rename unrelated variables
* reformat unrelated files
* upgrade dependencies
* change architecture
* modify SEO structure
* modify URLs
* modify redirects
* modify content
* "clean up" unrelated code
* delete code that merely looks unused

unless the user's request explicitly requires it.

Preserve all existing functionality.

# 7. PROTECT ROUTES, SEO, AND CONTENT

This website has many course and blog pages.

Do not alter:

* URLs
* slugs
* redirects
* canonical behavior
* course content
* blog content
* navigation taxonomy
* metadata
* sitemap behavior

unless explicitly requested.

Treat these as production-sensitive.

# 8. FOR UI CHANGES, VERIFY THE EXACT ELEMENT

If the user says:

"Remove the pill from the homepage"

you must:

1. Find the actual pill source.
2. Determine whether it is static HTML, a component, data-driven content, or CSS-generated.
3. Remove ONLY that pill.
4. Confirm that the source no longer renders it.
5. Check for build/type errors.
6. Check the actual dev page.
7. Confirm that the pill is absent from the served HTML/browser.

Do not report success merely because a source file changed.

# 9. FOR TEXT CHANGES, VERIFY THE ACTUAL SERVED PAGE

If the user asks to change:

"Old headline"

to:

"New headline"

search the repository for the old headline first.

After editing, verify:

rg -n "New headline" src

Then verify that the development server actually serves the new text:

curl -s http://localhost:4321/ | grep -F "New headline"

If necessary, inspect the response with:

curl -s http://localhost:4321/ | head -200

If curl does NOT show the new content, DO NOT claim the task is complete.

Investigate why.

# 10. HMR / LIVE UPDATE TROUBLESHOOTING

When a source change is not reflected on localhost, diagnose the problem before changing more code.

Check:

A. Are we editing the same directory used by the dev server?

B. Is Astro actually running?

C. Is port 4321 being served by the expected process?

D. Did Astro report an HMR/build error in the terminal?

E. Is the browser showing a stale page?

F. Is the page generated from another source/data file?

G. Is a redirect sending the browser somewhere else?

H. Is the change in a server-rendered/data-driven path that requires regeneration?

Use appropriate commands such as:

pwd
realpath .
ss -ltnp | grep 4321
curl -I http://localhost:4321/
curl -s http://localhost:4321/

Also inspect terminal output from the running Astro process.

Do not "fix" HMR by randomly changing configuration.

Only modify astro.config.mjs, Vite configuration, dependencies, or scripts when evidence shows that the configuration is actually responsible.

# 11. NEVER CONFUSE SOURCE WITH GENERATED OUTPUT

Prefer editing:

src/

and project configuration files.

Do not manually edit:

dist/

or generated files

unless explicitly required.

The source of truth must be identified first.

# 12. VALIDATION REQUIRED

After every meaningful code change run the appropriate validation.

At minimum, when applicable:

npm run build

Also inspect the git diff:

git diff --stat
git diff -- <changed-files>

Check for accidental unrelated changes.

If there are warnings, distinguish:

* pre-existing warnings
* warnings caused by your changes
* actual errors

Do not hide errors.

# 13. IF THE TASK CANNOT BE VERIFIED, SAY SO

If you changed the correct source but cannot verify the browser result, say:

"Source change completed, but browser verification is not yet confirmed."

Then explain what prevented verification.

Never fabricate successful verification.

# 14. BEFORE/AFTER PROOF

For every task, record:

BEFORE:

* What rendered before
* Which file/component/data source produced it

CHANGE:

* Exact file(s) modified
* Exact purpose of each modification

AFTER:

* Build result
* Relevant search result
* Dev-server/browser verification result

# 15. GIT SAFETY

Before making changes:

git status --short

After making changes:

git status --short
git diff --stat
git diff -- <changed-files>

Do not overwrite unrelated user work.

If there are existing uncommitted changes, preserve them.

Never reset, checkout, clean, or discard user modifications unless explicitly instructed.

# 16. WHEN SOMETHING DOES NOT WORK, DEBUG THE ROOT CAUSE

Do NOT repeatedly apply random edits.

Example:

User says:
"I changed the homepage headline but localhost still shows the old headline."

Wrong behavior:

* edit another file
* restart server repeatedly
* change Astro config
* change Vite config
* say it is fixed

Correct behavior:

1. Verify project root.
2. Verify dev server process.
3. Search where the old headline exists.
4. Identify rendering/data flow.
5. Check Astro terminal errors.
6. Check served HTML with curl.
7. Determine whether HMR is working.
8. Fix the actual cause.
9. Re-test.
10. Only then report completion.

# 17. DO NOT HALLUCINATE FILES OR CODE

Never say:
"I changed X in file Y"

unless you actually inspected file Y and changed it.

Never invent:

* file paths
* component names
* variables
* functions
* selectors
* imports
* configuration options
* error messages

Everything must be grounded in the repository.

# 18. TASK EXECUTION FORMAT

Before editing, provide a very short implementation plan.

Then inspect the relevant files.

Then make the smallest change.

Then validate.

Then report:

1. Root cause
2. Files changed
3. What changed
4. Validation performed
5. Browser/live-preview verification
6. Any remaining issue

# 19. SPECIAL RULE FOR "REMOVE X"

For requests like:

* remove the pill
* remove this button
* remove this section
* remove this badge
* remove this text

DO NOT simply delete the first matching string.

Determine:

* what component renders it
* whether it appears on multiple routes
* whether it is generated from data
* whether CSS pseudo-elements are involved
* whether removing it affects layout
* whether it appears in mobile/desktop variants

Remove only the requested instance unless the user explicitly requests all instances.

# 20. SPECIAL RULE FOR HOMEPAGE

For homepage modifications, treat these as possible sources:

src/pages/index.astro
src/data/pages/home.json
src/components/*
src/layouts/*

Search and trace before editing.

# 21. FINAL RULE

A change is NOT complete because:

* the agent edited a file
* the agent says it edited a file
* the code looks correct
* the build passed

A change is complete only when the requested behavior is verified in the actual project/dev environment.

Accuracy > speed.
Evidence > assumptions.
Minimal changes > broad refactors.
Verification > claims.
