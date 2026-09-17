# Plug Inu

**The most connected dog online.** Plug Inu shares his tools and know-how to help you build your own connections and become self-reliant.

A small Chrome/Chromium Manifest V3 extension that highlights your chosen words and phrases on webpages. Plain JavaScript, no runtime dependencies, no accounts or external requests.

## Develop and load

Before starting any requested work, save the user prompt in the repository. Follow the [prompt processing flow](docs/prompt-processing-flow.md) for every prompt, including follow-ups, and record completion notes afterward.

Requires Node.js 22+ and Chrome/Chromium 120+.

```sh
npm ci
npm test
npm run check
npm run build
```

1. Open `chrome://extensions` and enable **Developer mode**.
2. Choose **Load unpacked**, then select this repository's `dist/` directory.
3. Pin Plug Inu; its temporary icon is a lowercase **p** on green. Open its popup and add a profile, then a positive or negative rule.
4. Open or refresh an ordinary HTTP/HTTPS webpage. Existing tabs need one refresh after installation or extension reload; subsequent rule changes apply without reloading.
5. Use **Open side panel** for persistent controls, or **Settings** to change colors.
6. Choose **Manage skills** to activate domain skills, load instructions and manage local definitions. See the [skills guide](docs/domain-skills.md).

Rebuild and click Reload on the extension after source changes. `dist/` is generated and ignored by Git.

## Included

- Global and independent profile switches; create/delete profiles and rules.
- Exact words, phrases, prefixes, suffixes, substring, word length, and restricted advanced regex.
- Positive highlights and distinct red, underlined negative highlights; configurable colors.
- Shared popup, side panel, and options interface.
- Versioned local storage with migrations and serialized writes.
- Dynamic page observation and removable range highlights, without DOM text wrappers.
- Dedicated **Manage skills** configuration with activation, search, on-demand loading, bundled + local definitions, URL/input/output/action contracts, file import, and Markdown/JSON export. See [domain skills](docs/domain-skills.md).
- Provider-neutral connection and AI suggestion interfaces; no speculative integrations.

The initial profile list is empty so nothing is highlighted until you choose your interests. Rules are local to this browser and are not synced. Rule editing currently means deleting and recreating a rule.

The [expanded feature requirements](docs/feature-requirements.md) describe the Plug Inu roadmap, including reviewed AI discovery, keyword counts, Auto Scroll, visit history and ad skipping. See the [feature status table](docs/features.md#expanded-feature-status) for what is available today.

## Permissions and privacy

`storage` saves local configuration. `sidePanel` provides the persistent interface. Declared HTTP/HTTPS content scripts allow highlighting across websites and cause Chrome to request website access. Chrome's extension details let you restrict site access. No history, cookies, network services or telemetry are used. Do not store credentials in connection configuration; authentication is not implemented.

Browser internal pages, extension stores, PDFs, shadow DOM and frames are outside the first version. Matching is per text node, so phrases spanning inline elements are not matched. See [features and limits](docs/features.md), [architecture](docs/architecture.md), [manual browser checks](docs/manual-testing.md), and [changelog](docs/changelog.md).

## Verification

Automated tests cover matching, profile enablement, storage/migrations, concurrent writes, DOM eligibility, range cleanup, dynamic content, connection contracts, and domain skill merging, activation, import and management UI. `npm run check` is a syntax check, not a type checker. Build validates declared manifest entry points. Native Chrome installation and visual behavior require the manual checklist; they are not asserted by the unit tests.
