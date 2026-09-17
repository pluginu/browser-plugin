# Implementation prompt history

## 2026-09-16 — Initial foundation

User context: “this is a new project”

Original attached brief follows verbatim.

# Plug Inu Browser Plugin

You are building the initial version of the **Plug Inu browser plugin**.

Repository:

`pluginu/browser-plugin`

## Product Identity

**Name:** Plug Inu

**Core idea:** Plug Inu is the most connected dog on the internet.

This is a **browser plugin**, not a literal electrical-plug product. The word "Plug" represents being connected.

The central concept is:

**DOG → CONNECTED → BROWSER**

Plug Inu connects the user to the things that matter while browsing.

The browser plugin should eventually become the main browser-side component of a larger Plug Inu ecosystem that can connect users, websites, tools, services, data, and other applications.

Core messaging:

**Everything you need to get connected.**

Another useful positioning statement:

**The most connected dog on the internet.**

## Mascot

The mascot is a dog called **Plug Inu**.

The original visual concept experimented with a dog combined with an electrical plug. That was useful for establishing the "plugged in" idea, but the brand has evolved.

Do **not** treat Plug Inu primarily as a literal electrical plug.

Plug Inu should instead look like a dog that is extremely connected.

Think of him almost like a well-connected boss. He knows everyone, knows what's happening, and has connections everywhere.

The connection metaphor can appear visually through things such as:

* browser connections
* extension/plugin symbols
* networks
* cables
* connected devices
* services
* applications
* communication
* the web

A useful visual concept is a collar, leash, cable, or other connection flowing from the dog into a browser/plugin symbol.

The important idea is:

**The dog is connected.**

Not:

**The dog is an electrical plug.**

## Origin of the Product

Plug Inu evolves from the original **Spot a Dog / Spot** browser-plugin concept.

The original problem was simple:

People spend too much time reading pages, search results, posts, feeds, and captions trying to find the small amount of information they actually care about.

The original plugin solved this by allowing users to specify what they were looking for and then highlighting those words, phrases, subjects, or concepts directly on webpages.

Instead of searching and then manually reading everything:

**Spot what matters. Skip the noise.**

That capability should remain part of the DNA of Plug Inu.

Plug Inu expands the concept from simply "spotting" information into a broader browser connection platform.

## Initial Product Philosophy

Keep the first implementation small.

Do not try to build the entire future Plug Inu ecosystem at once.

The initial repository should establish a clean browser-plugin foundation that can grow without requiring a rewrite.

Prefer:

* simple components
* clear responsibilities
* minimal dependencies
* readable code
* modular architecture
* testable functionality
* straightforward browser APIs
* documented interfaces

Avoid unnecessary frameworks, abstraction layers, infrastructure, or dependencies.

Do not overengineer.

## Browser Plugin

Use modern browser-extension architecture.

Chrome/Chromium should be the initial target.

Use **Manifest V3**.

The architecture should account for:

* manifest
* background/service worker
* content scripts
* popup
* side panel
* options/settings
* browser storage
* page scanning
* text matching
* highlighting
* profiles
* connection management

Structure the project so additional browsers can potentially be supported later without rewriting the core functionality.

## Spotting / Highlighting Engine

The original Spot capability should be implemented as a core module.

Users should be able to create multiple profiles representing things they want to spot.

Example conceptual profiles:

`Crypto`

`People`

`Companies`

`News`

`Research`

A profile contains rules describing what the user wants or does not want to see.

Each profile can be independently enabled or disabled.

Support:

### Positive keywords

Highlight things the user wants to find.

### Negative keywords

Identify things the user specifically does not want.

Negative matches should have a clearly different visual treatment from positive matches.

The original design used red for negative matches.

## Matching

Design the matching engine so it can support:

* exact words
* phrases
* starts with
* ends with
* contains
* character length
* regular expressions

Regular expressions should remain an advanced feature.

The normal UI should stay understandable to someone who does not know regex.

## Page Processing

The content script should scan webpage text without unnecessarily modifying the site's structure.

Important requirements:

* avoid breaking page layouts
* avoid changing form inputs
* avoid processing script/style elements
* avoid recursively highlighting already processed content
* handle dynamically loaded content
* minimize performance impact
* allow highlights to be removed cleanly
* allow profiles/rules to update without requiring a page reload whenever practical

Modern sites frequently update their DOM dynamically, so design page observation accordingly.

## User Controls

Users need simple global controls.

At minimum account for:

* Plug Inu ON/OFF
* profile ON/OFF
* positive rules
* negative rules
* highlight preferences
* popup interface
* side-panel interface
* settings/options

The user should be able to quickly understand whether Plug Inu is currently connected and active.

## Side Panel

Plug Inu should support being used as a browser side panel.

The side panel will eventually become particularly important because Plug Inu is intended to do more than highlighting.

Architect it as a first-class interface rather than an afterthought.

## Connection Architecture

Create a clean abstraction for future **connections**.

A connection represents something Plug Inu can communicate with or use.

Future connections could include:

* websites
* APIs
* AI services
* applications
* local tools
* Plug Inu services
* user-defined integrations

Do not implement speculative integrations yet.

Create only enough architecture that adding connections later will not require restructuring the entire plugin.

## AI

The architecture should leave room for AI-assisted functionality.

The earlier Spot concept included AI-assisted keyword discovery where a user could provide a subject and receive suggested related words or phrases.

Suggestions must be presented to the user for approval rather than silently becoming rules.

Keep AI functionality isolated behind an interface so the rest of the browser plugin does not depend on one AI provider.

Never hard-code API keys.

## Storage

Create a versioned storage model.

Store things such as:

* plugin settings
* profiles
* profile rules
* enabled state
* UI preferences
* connection configuration

Design migrations from the beginning so storage structures can evolve.

Do not store secrets in ordinary extension storage without considering the security implications.

## Repository Structure

Use a structure similar to:

```text
browser-plugin/
├── src/
│   ├── background/
│   ├── content/
│   ├── popup/
│   ├── sidepanel/
│   ├── options/
│   ├── highlighting/
│   ├── matching/
│   ├── profiles/
│   ├── connections/
│   ├── storage/
│   ├── shared/
│   └── types/
├── tests/
├── docs/
├── prompts/
├── public/
├── manifest.json
├── package.json
└── README.md
```

Modify this structure when technically justified, but preserve clear separation of responsibilities.

## Larger Plug Inu Ecosystem

Do not put every future Plug Inu component into this repository.

The intended ecosystem can eventually contain separate repositories such as:

```text
pluginu/
├── browser-plugin
├── website
├── shared-sdk
├── cli
└── docs
```

A repository should represent something that can reasonably be developed, versioned, released, deployed, or reused independently.

Do not create separate repositories for internal browser-plugin components such as popup, highlighting, storage, or content scripts.

Those belong in `browser-plugin`.

## Development Rules

Before implementing a feature:

1. Understand its dependencies.
2. Identify the smallest useful implementation.
3. Implement lower-level dependencies first.
4. Add unit tests.
5. Run existing tests.
6. Verify the build.
7. Update relevant documentation.

Do not rewrite working code merely to make it stylistically different.

Do not add dependencies when a small amount of straightforward code can accomplish the same thing.

Do not introduce large architectural changes without documenting why they are necessary.

## Testing

Unit tests are required.

Prioritize tests around:

* matching
* positive rules
* negative rules
* regex
* profile behavior
* storage
* migrations
* highlighting
* connection interfaces

Browser behavior that cannot reasonably be covered by unit tests should be documented for manual testing.

The user will perform live browser testing and provide feedback.

## Documentation

Maintain documentation as development progresses.

At minimum maintain:

`README.md`

`docs/architecture.md`

`docs/features.md`

`docs/changelog.md`

Document important architectural decisions.

## Prompt History

Create:

`prompts/`

Maintain a prompt-history document inside it.

Whenever a substantial implementation prompt is provided, append the prompt to the prompt history so development instructions remain reproducible.

Do not overwrite previous prompts.

## Git Workflow

Before making changes, inspect:

* current branch
* git status
* repository structure
* existing documentation
* package configuration
* existing tests

Do not assume the repository is empty.

Preserve existing working functionality.

After completing a logical unit of work:

1. Run unit tests.
2. Run lint/type checking if configured.
3. Run the production build.
4. Review `git diff`.
5. Update documentation and changelog.
6. Report exactly what changed.
7. Report tests performed and their results.
8. Report anything that still requires manual browser testing.

Do not claim something works unless it was actually tested at the appropriate level.

## First Task

Inspect the repository and establish the initial Plug Inu browser-plugin foundation.

If the repository is empty or nearly empty:

1. Create the project structure.
2. Configure Manifest V3.
3. Establish the service worker.
4. Establish the content-script system.
5. Create the popup foundation.
6. Create the side-panel foundation.
7. Create settings/options foundation.
8. Implement versioned storage.
9. Implement the profile data model.
10. Implement the initial matching engine.
11. Implement positive and negative highlighting.
12. Add global and profile enable/disable controls.
13. Add unit tests.
14. Create the initial documentation.
15. Create prompt history.
16. Verify that the plugin builds and can be loaded as an unpacked Chromium extension.

Keep the UI simple for this first pass.

The objective is not to make Plug Inu feature-complete.

The objective is to create a **small, working, tested foundation for the most connected dog on the internet.**

## 2026-09-17 — Publish current implementation

The complete publication prompt and its implementation/review notes are preserved in [Prompt 002 — Push to GitHub](../docs/prompts/002-push-to-github.md).
