# Native Cross-Platform Mosh Client

Status: **shipped via [MoshCatty](https://github.com/binaricat/MoshCatty)**
Related: [#2025](https://github.com/DrOlu/Sensor/issues/2025), [#2072](https://github.com/DrOlu/Sensor/issues/2072)

## Canonical repository

**https://github.com/binaricat/MoshCatty**

Sensor only **consumes** `moshcatty-*` release binaries into `resources/mosh/`
via `scripts/fetch-mosh-binaries.cjs` / `scripts/resolve-mosh-bin-release.cjs`
(default `MOSH_BIN_REPO=MoshCatty`).

There is **no** in-tree Rust source, no Cygwin packaging path, and no
FluentTerminal / `mosh-bin-*` fallback.

## Integration contract

```text
MOSH_KEY=<key> mosh-client <host> <port>
```

Sensor owns SSH bootstrap (`moshHandshake` + PTY), then swaps to the
bundled MoshCatty binary under `node-pty`.

| Concern | Owner |
|---------|--------|
| SSH auth / `MOSH CONNECT` parse | Sensor Electron |
| UDP Mosh data plane | MoshCatty binary |
| Packaging / fetch / electron-builder | Sensor scripts → MoshCatty releases |

## Why

Windows Cygwin `mosh-client` + partial runtime + ConPTY sandwich was
architecturally broken. MoshCatty is a pure Rust, wire-compatible client with
one code path on Linux / macOS / Windows (static CRT on Windows).

## Linux compatibility floors

MoshCatty Linux release binaries must target the **same glibc floors as
Sensor package jobs** (not bare `ubuntu-latest`):

| Target | Sensor package image | Max GLIBC |
|--------|------------------------|-----------|
| `linux-x64` | `almalinux:8` | 2.28 |
| `linux-arm64` | `debian:bullseye` | 2.31 |

Enforced upstream from `moshcatty-0.1.2` via MoshCatty release CI
(`scripts/assert-max-glibc.sh`). Do not pin packaging to pre-0.1.2 Linux
assets (they require GLIBC 2.34).

## MoshCatty compatibility floor

Sensor requires `moshcatty-0.1.7+`. That release reconstructs each numbered remote state from its declared
base before display, preventing duplicate characters when parallel updates share a base on high-latency links.
It builds on the 0.1.6 speculative local echo hardening, the 0.1.5 Diff path, and the 0.1.4 ConPTY fixes.
Packaging must not resolve or accept an older MoshCatty release.

## Decision log

- **2026-07-10:** Feasibility accepted; client extracted to `binaricat/MoshCatty`.
- **2026-07-10:** Sensor defaults packaging to MoshCatty releases.
- **2026-07-10:** Removed legacy Cygwin build pipeline, FluentTerminal fallback,
  `mosh-bin-*` tags, dll/terminfo runtime helpers. Pure MoshCatty only
  (`moshcatty-0.1.1`: ConPTY Ctrl+C + static MSVC CRT).
- **2026-07-10:** Require `moshcatty-0.1.2+` for Linux glibc floors matching
  Sensor (x64 ≤ 2.28, arm64 ≤ 2.31).
- **2026-07-11:** Require `moshcatty-0.1.4+` for Windows ConPTY shortcut input;
  keep Mosh sessions on Sensor's primary terminal screen so highlighting and
  scrollback remain available.
- **2026-07-11:** Speculative local echo (prediction underlines) lives in
  MoshCatty (`DisplayPipeline`, `MOSH_PREDICTION_DISPLAY`). Version 0.1.6
  introduced prediction hardening for Sensor #2121; Sensor does not
  implement prediction in the renderer.
- **2026-07-12:** Require `moshcatty-0.1.6+` for #2121 prediction; handshake
  failure messaging when `MOSH CONNECT` is missing (#2128).
- **2026-07-15:** Require `moshcatty-0.1.7+` for #2121 numbered-state
  reconstruction, which fixes duplicate display on high-latency links.
