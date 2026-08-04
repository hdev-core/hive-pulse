# Build Instructions for AMO Reviewers

HivePulse is written in TypeScript + React and bundled with **Vite (Rollup)**, which
combines and minifies the source into the `assets/*.js` files shipped in the add-on.
These steps reproduce the exact contents of the submitted Firefox package.

## Build environment

- **OS:** Windows, macOS, or Linux (the build is platform-independent)
- **Node.js:** v20.20.2 (any Node 20 LTS works)
- **npm:** 10.8.2 (ships with Node 20)

No global tools are required; all build dependencies are in `package.json` /
`package-lock.json` and installed locally.

## Steps to reproduce the add-on

```bash
# 1. Install exact dependency versions from the lockfile
npm ci        # (or: npm install)

# 2. Build the Firefox target
npm run build:firefox
```

This outputs the unpacked extension to **`dist-firefox/`**, whose contents are
identical to the uploaded package:

- `dist-firefox/manifest.json`  ← from `manifest.firefox.json` (copied at build time)
- `dist-firefox/assets/background.js`  ← built from `background.ts`
- `dist-firefox/assets/content.js`     ← built from `content.ts`
- `dist-firefox/assets/compose.js`     ← built from `compose.ts`
- `dist-firefox/assets/popup.js` + `popup.css`  ← built from `index.html` + `App.tsx` and components
- `dist-firefox/index.html`, `icon.png`, `icon.svg`, `logos/`

The submitted `.zip` is simply the **contents** of `dist-firefox/` (manifest.json at the
root). It can be regenerated with:

```bash
npx web-ext build --source-dir=dist-firefox --artifacts-dir=. --overwrite-dest
```

## Source entry points

| Built file            | Source entry                         |
|-----------------------|--------------------------------------|
| `assets/popup.js`     | `index.html` → `index.tsx` / `App.tsx` |
| `assets/background.js`| `background.ts`                      |
| `assets/content.js`   | `content.ts`                         |
| `assets/compose.js`   | `compose.ts`                         |

Build configuration: `vite.config.ts` (the `--mode firefox` flag selects the Firefox
manifest and the `dist-firefox` output directory).

## Notes

- No remote/hosted code is loaded; all executed code is contained in the package.
- The extension makes network requests only to public Hive blockchain RPC nodes,
  Ecency APIs (chat), Hive-Engine, and CoinGecko (prices) — all declared in
  `host_permissions`.
- No data is collected or transmitted to the developer (see
  `data_collection_permissions: { required: ["none"] }`).
