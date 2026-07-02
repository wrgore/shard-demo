# SHarD — Secure Harness Design (Demo)

Demonstrating that off-the-shelf security controls can be embedded in and distributed via an agent harness.

## What is SHarD?

SHarD (Secure Harness Design) is a research artifact created by [@wrgore](https://github.com/wrgore) demonstrating that existing "off-the-shelf" security controls can be scaled to engineering teams via a distributable agent harness — without requiring deep lifecycle integration or rebuilding the harness from the ground up.

This is the demo version. It ships with specific design choices around permissions and controls intended to demonstrate the concept. A full version is in development that will provide end users a clean slate to configure their own controls. See [Demo vs Full Version](#demo-vs-full-version) below.

SHarD is built on [Pi Coding Agent](https://github.com/earendil-works/pi-mono) and demonstrates three categories of off-the-shelf security control, all distributed via the same harness mechanism:

| Category | Control | Mechanism |
|---|---|---|
| Sandboxing | nono ([nono.sh](https://nono.sh)) | OS-level, kernel enforced via Landlock/Seatbelt |
| Skill verification | SandyClaw ([permiso.io](https://permiso.io)) | Third-party detonation scanning |
| Tool restriction | Pi permissions extension | Harness-level policy rules |

## Research Context

Current harness security research (e.g. SafeHarness, Lin et al. 2026) assumes full control over the execution environment and builds security in from the ground up across interdependent layers. SHarD explores a complementary approach: can existing "off-the-shelf" security controls be packaged and distributed via the harness mechanism itself, without modifying the underlying agent runtime?

SHarD answers yes, and provides a working demonstration across three distinct control categories.

## Architecture

SHarD adds the following components to Pi:

- **`.pi/extensions/shard-nono.ts`** — detects and warns if nono sandbox is not active on session start. Full enforcement (automatic relaunch into sandbox) is the final build step.
- **`.pi/extensions/shard-onboarding.ts`** — discovers or provisions a SandyClaw API key on first run. Checks macOS Keychain, environment variables, and Pi auth storage in order before falling back to an automated account request flow.
- **`.pi/skills/sandyclaw/`** — SandyClaw platform skill bundle enabling agents to submit skills for detonation analysis before loading them.
- **`.pi/permissions.json`** — rule-based bash restrictions using the Pi community permissions extension ([@pi-lab/permissions](https://github.com/pi-lab/permissions)). Ships with `rm` and `rmdir` blocked as a demonstration of harness-level tool permission configuration.

## Demo vs Full Version

| | Demo (this repo) | Full Version (planned) |
|---|---|---|
| Sandboxing | Warning on missing nono sandbox | Enforced relaunch into sandbox |
| Skill verification | Full SandyClaw onboarding and scanning | Same |
| Tool restrictions | `rm` and `rmdir` blocked via permissions extension | Clean slate — user configures |
| Default mode | yolo | Configurable |
| Purpose | Research demonstration | Production distribution |

## Security Model

- nono sandboxing is enforced at the kernel level — the agent cannot escape it
- SandyClaw key discovery checks macOS Keychain first, never hardcodes credentials
- No credentials are stored in this repository
- API keys are stored locally in `~/.pi/agent/` which is excluded from version control

> **This is a research demonstration. Do not use in production.**

## Install

One command on macOS or Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/wrgore/shard-demo/main/install.sh | sh
```

Or if you already have Pi installed:

```bash
pi install git:github.com/wrgore/shard-demo
```

On first run, SHarD will:

1. Check for nono sandbox and warn if not detected
2. Search for your SandyClaw API key in Keychain, environment, and Pi auth storage
3. If no key is found, guide you through requesting a SandyClaw account

## Requirements

- macOS or Linux
- Node.js 22.19.0 or higher
- Pi Coding Agent (installed automatically by `install.sh`)
- nono (installed automatically by `install.sh` — recommended for full enforcement)
- A SandyClaw API key (guided setup on first run)

## Based On

[Pi Coding Agent](https://github.com/earendil-works/pi-mono) by Earendil Inc. — MIT License

SHarD is also MIT licensed. See [LICENSE](LICENSE).
