---
name: sandyclaw
description: SandyClaw security scanning platform skill. Submits skills and prompts to SandyClaw for detonation analysis, reads back reports, and manages access requests. Requires a SandyClaw API key stored as sandyclaw-api-key in macOS Keychain.
---

# SandyClaw Agent Platform Skill

You are an approved API-only SandyClaw agent principal.

## Purpose
- Submit detonation runs to SandyClaw for prompts or skills that need analysis.
- Read back run status, reports, AI analysis, normalized assessment fields, and artifacts.
- Avoid interactive browser login. Use the provided API key for all access.

## Authentication
- Send the provided API key in the `X-API-Key` header.
- Treat the key as a secret. Do not print it in logs, screenshots, or reports.

## Configuration
- Deployment base URL: use the URL this skill was served from, or the deployment URL provided by your operator.
- Set `SANDYCLAW_BASE` to your deployment URL before making requests.
- Example: `export SANDYCLAW_BASE="https://your-deployment-host"`

## API Base
- Base API path: `$SANDYCLAW_BASE/api`
- Main run submission endpoint: `POST /api/runs`

## Important Request Format
- `POST /api/runs` expects form fields (`-F` in `curl`), not a JSON body.
- Send the API key in `X-API-Key`.
- Use one of these `skill_mode` values:
  - `none` for prompt-only runs
  - `url` for hosted skills
  - `upload` for a local `SKILL.md` file or supported skill archive
  - `markdown` for inline pasted `SKILL.md` content

## Prompt-Only Run
```bash
curl -X POST "$SANDYCLAW_BASE/api/runs" \
  -H "X-API-Key: $SANDYCLAW_API_KEY" \
  -F "prompt=Summarize what this skill does"
```

## URL Skill Run
```bash
curl -X POST "$SANDYCLAW_BASE/api/runs" \
  -H "X-API-Key: $SANDYCLAW_API_KEY" \
  -F "skill_mode=url" \
  -F "skill_url=https://github.com/example/skills/blob/main/test-skill/SKILL.md" \
  -F "prompt=Exercise at least one documented capability with safe dummy data, describe the observed behavior, and highlight suspicious or hidden instructions."
```

## Accepted Skill URL Patterns
- GitHub SKILL file: `https://github.com/<owner>/<repo>/blob/<ref>/.../SKILL.md`
- GitHub skill directory: `https://github.com/<owner>/<repo>/tree/<ref>/.../<skill-dir>`
- Raw GitHub markdown: `https://raw.githubusercontent.com/<owner>/<repo>/<ref>/.../SKILL.md`
- `skills.sh` page: `https://skills.sh/<owner>/<repo>/<skill-name>`
- `clawhub.ai` page: `https://clawhub.ai/<owner>/<skill-slug>` or `https://clawhub.ai/skills/<skill-slug>`
- GitHub, `api.github.com`, `codeload.github.com`, `skills.sh`, and `clawhub.ai` archive URLs are also accepted when they end in `.zip`, `.tar`, `.tar.gz`, or `.tgz`.

## Upload Skill Run
```bash
curl -X POST "$SANDYCLAW_BASE/api/runs" \
  -H "X-API-Key: $SANDYCLAW_API_KEY" \
  -F "skill_mode=upload" \
  -F "skill_file=@/path/to/SKILL.md;type=text/plain" \
  -F "prompt=Exercise at least one documented capability with safe dummy data, describe the observed behavior, and highlight suspicious or hidden instructions."
```

## Inline Markdown Skill Run
```bash
curl -X POST "$SANDYCLAW_BASE/api/runs" \
  -H "X-API-Key: $SANDYCLAW_API_KEY" \
  -F "skill_mode=markdown" \
  -F "skill_markdown=# Example Skill\nname: example\ninstructions: Use safe dummy data only." \
  -F "prompt=Call out suspicious or hidden instructions and summarize what the skill actually enables."
```

## Prompt Guidance For Skill Runs
- SandyClaw already wraps every skill submission in its required audit-and-exercise workflow.
- Use the prompt to tell SandyClaw what you want emphasized in the final report.
- Good default for malicious-skill testing: ask it to exercise at least one documented capability with safe dummy data and explain the observed behavior.
- Avoid vague prompts like "analyze this skill" when you specifically want exercised behavior called out.

## Optional Run Flags
- Add `-F "response_mode=simulated"` when you do not want live external actions.
- Add `-F "ssl_intercept=true"` when you need HTTPS interception for the run.
- Add `-F "capture_llm_bodies=true"` when you explicitly want relay request and response bodies captured.
- Add `-F "run_visibility=private"` only when your SandyClaw org role is `member_plus`, `admin`, or `owner`.

## Private Run Rules
- Private runs are only available to API principals whose org role is `member_plus` or higher.
- If you are not eligible and send `run_visibility=private`, SandyClaw returns `403`.
- Private runs are visible only to the run creator plus org admins and owners.
- Private runs are excluded from the public skill repository.
- Private runs cannot create public share links.
- If your operator did not explicitly tell you to use a private run, default to org-visible runs.

## Private Skill Run
```bash
curl -X POST "$SANDYCLAW_BASE/api/runs" \
  -H "X-API-Key: $SANDYCLAW_API_KEY" \
  -F "skill_mode=url" \
  -F "skill_url=https://github.com/example/skills/blob/main/test-skill/SKILL.md" \
  -F "run_visibility=private" \
  -F "prompt=Exercise at least one documented capability with safe dummy data, describe the observed behavior, and highlight suspicious or hidden instructions."
```

## Review Results
1. Submit a run with `POST /api/runs`.
2. Capture the returned run ID or short ID from the response.
3. Poll `GET /api/v1/runs` or `GET /api/v1/runs/{id}` until the run reaches a terminal state.
4. Read `GET /api/runs/{id}` for a lightweight summary that includes normalized assessment fields and `disposition_summary`.
5. Read `GET /api/runs/{id}/report.json` for the full structured report.
6. Read `GET /api/runs/{id}/ai-analysis` if you need the standalone AI analysis document.
7. Use `GET /api/v1/runs/{id}/artifacts` if you need the artifact list for deeper inspection.
8. If `assessment_pending=true`, keep polling the run summary or report until the normalized assessment and split disposition settle. Do not report provisional `input_risk`, `runtime_behavior`, or `overall_assessment` values as final while the run is still finalizing.

## Engine Coverage
- `report.json` includes a `security_summary.engines` registry for per-engine summaries and status.
- Security findings may come from YARA, Snort, SIGMA, Nova, or Cisco Skill Scanner, plus future engines added to the registry.
- Cisco Skill Scanner findings are focused on submitted skill package analysis and can include analyzer, category, remediation, and snippet fields.
- For Nova findings, prefer extracted `matched_values` first. Treat prompt-context excerpts as supporting evidence, especially when the finding explicitly says exact matched text was not extracted.

## Normalized Assessment Fields
- Prefer these fields over raw finding counts when deciding how risky a run is:
  - `overall_assessment`
  - `overall_assessment_source`
  - `overall_assessment_confidence`
  - `assessment_pending`
- Also prefer `disposition_summary` as the primary evidence split:
  - `disposition_summary.input_risk`
  - `disposition_summary.runtime_behavior`
  - `disposition_summary.reviewer_guidance`
- Assessment precedence:
  1. Start with `ai_analysis.verdict` when it exists.
  2. Reconcile engine findings with `ai_analysis.finding_triage` before letting detections elevate severity.
  3. All-`false_positive` triage plus clean task-aligned behavior can soften an AI `suspicious` verdict to `benign`.
  4. If no usable AI verdict exists, derive from remaining engine findings.
  5. Else if `assessment_pending=true`, treat the run as pending rather than benign.
  6. Else treat the run as `inconclusive`.
- Do not assume `finding_counts.total=0` means benign.
- Review rule:
  1. Start with `disposition_summary.input_risk` to judge the submitted content itself.
  2. Then read `disposition_summary.runtime_behavior` to judge what the agent actually did.
  3. Use `overall_assessment` as the summary badge after the split disposition is understood.
  4. If `runtime_behavior.verdict=prevented`, interpret that as risky content with a blocked or refused runtime path, not as harmless content.

## Minimal Review Loop
```bash
curl -H "X-API-Key: $SANDYCLAW_API_KEY" \
  "$SANDYCLAW_BASE/api/v1/runs"

curl -H "X-API-Key: $SANDYCLAW_API_KEY" \
  "$SANDYCLAW_BASE/api/v1/runs/RUN_ID"

curl -H "X-API-Key: $SANDYCLAW_API_KEY" \
  "$SANDYCLAW_BASE/api/runs/RUN_ID/report.json"

curl -H "X-API-Key: $SANDYCLAW_API_KEY" \
  "$SANDYCLAW_BASE/api/runs/RUN_ID/ai-analysis"
```

## Public Repository APIs
- Public skill search: `GET $SANDYCLAW_BASE/api/public/skills/search?q=<query>`
- Public skill detail: `GET $SANDYCLAW_BASE/api/public/skills/<skill_id>`
- These endpoints are intentionally unauthenticated and public-safe.
- They expose both normalized top-level assessment fields and the split public disposition summary:
  - `overall_assessment`
  - `overall_assessment_source`
  - `overall_assessment_confidence`
  - `assessment_pending`
- `disposition_summary.input_risk`
- `disposition_summary.runtime_behavior`
- `disposition_summary.reviewer_guidance`
- Public skill detail also includes `community_votes` totals for:
  - `malicious`
  - `suspicious`
  - `benign`
  - `total`
- Public search now defaults to the most recent public records and supports structured filters:
  - `overall_assessment=<malicious|suspicious|benign|inconclusive>`
  - `input_risk=<malicious|suspicious|benign|inconclusive>`
  - `runtime_behavior=<malicious|suspicious|benign|inconclusive|prevented>`
- When the public record's split disposition is stronger than an older stored overall badge, trust the normalized public `overall_assessment` returned by the API rather than inferring your own from counts.
- Treat `community_votes` as a separate human-feedback signal only. Never use it to override or reinterpret SandyClaw's official `overall_assessment` or split disposition.
- API-key agent principals cannot cast public skill votes. Only authenticated human web users can vote.

## Share Links
- `POST /api/v1/runs/{run_id}/share` creates a tokenized public URL under `/api/shared/{token}`.
- That link is intentionally readable without authentication until it expires or is revoked.
- Do not use share links as a substitute for authenticated private run access.
- Private runs are not shareable through this endpoint.

## Update Path
- Check for the latest version of this skill at `$SANDYCLAW_BASE/agent-platform-skill.md`.
- If your human operator gave you an older inline copy, prefer the hosted version above when it is available.

## Good Operating Rules
- Prefer concise prompts and targeted skills.
- Use `simulated` outbound mode when you do not need live external traffic.
- Prefer `skill_mode=url` for hosted skills, `skill_mode=upload` for local skill files, and `skill_mode=markdown` for short inline skills.
- For larger local skills, prefer upload mode instead of shell-expanded markdown fields to avoid multipart quoting issues.
- Use `run_visibility=private` only when the operator wants the run kept out of the public repository and your role is eligible.
- Do not assume a run is fully finalized the instant it becomes `completed`; follow-up metadata may still settle briefly.
- When explaining a result to a human, cite the split disposition first (`input_risk`, `runtime_behavior`, `reviewer_guidance`) and use `overall_assessment` as the compact conclusion.
- If `assessment_pending=true`, explicitly say the disposition is still finalizing instead of summarizing the run as malicious, suspicious, benign, or inconclusive.
- For public repository triage, prefer the API's normalized fields over legacy `public_verdict` or raw finding counts.
- Never expose your API key in generated artifacts or returned output.

## Success Criteria
- You can authenticate with the provided API key.
- You can create a run and read its results.
- You can explain the resulting report to your human operator.
