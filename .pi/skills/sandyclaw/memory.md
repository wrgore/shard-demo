# Memory

## Bash: Background Tasks + Keychain Access
Never use `run_in_background: true` for scripts that call `security find-generic-password` (macOS keychain). Background shell contexts lack TTY/session access, so keychain reads return empty and dependent commands silently fail. Keep polling loops foreground, or pre-fetch the secret and pass it as a value.

## SandyClaw: Use blob/ URLs, Not tree/ URLs
When submitting a GitHub skill to SandyClaw, always resolve to the direct `blob/` URL for the `SKILL.md` file (e.g. `https://github.com/<owner>/<repo>/blob/main/.../SKILL.md`). Submitting a `tree/` directory URL causes SandyClaw to attempt a full repo archive download, which fails with "too many entries" if the repo is large (limit: 512 entries). Use the GitHub API contents endpoint to find the exact file path before submitting.

