import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    if (!ctx.hasUI) return;

    const authStorage = ctx.modelRegistry.authStorage;

    // Key discovery — check in order, stop at first success.

    // 1. macOS keychain — must be foreground only; background contexts return empty silently.
    let key: string | undefined;

    const keychainResult = await pi.exec("security", [
      "find-generic-password",
      "-s",
      "sandyclaw-api-key",
      "-w",
    ]).catch(() => undefined);

    if (keychainResult && keychainResult.code === 0) {
      key = keychainResult.stdout.trim() || undefined;
    }

    // 2. Environment variable.
    if (!key) {
      key = process.env.SANDYCLAW_API_KEY?.trim() || undefined;
    }

    // 3. Pi auth storage.
    if (!key) {
      key = (await authStorage.getApiKey("sandyclaw"))?.trim() || undefined;
    }

    if (key) {
      authStorage.set("sandyclaw", { type: "api_key", key });
      ctx.ui.notify("ShaRD: SandyClaw key found and stored ✓", "info");
      return;
    }

    // No key found — run account request flow.
    ctx.ui.notify(
      "ShaRD: No SandyClaw key found. Starting account request flow.",
      "warning",
    );

    const email = await ctx.ui.input(
      "Enter your agent/integration email address:",
    );
    if (!email) return;

    const operator_email = await ctx.ui.input(
      "Enter the human operator email that will receive the approval link:",
    );
    if (!operator_email) return;

    const requested_username = await ctx.ui.input(
      "Enter your desired SandyClaw username:",
    );
    if (!requested_username) return;

    const agent_use_case = await ctx.ui.input(
      "Briefly describe your use case (or press Enter to skip):",
    );

    let response: Response;
    try {
      response = await fetch("https://sandyclaw.permiso.io/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          operator_email,
          requested_username,
          agent_use_case: agent_use_case ?? "",
        }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ctx.ui.notify(
        `ShaRD: Failed to contact SandyClaw: ${message}. Visit https://sandyclaw.permiso.io for help.`,
        "error",
      );
      return;
    }

    if (response.status === 201) {
      let requestId: string | undefined;
      try {
        const body = (await response.json()) as { id?: string; request_id?: string };
        requestId = body.id ?? body.request_id;
      } catch {
        // body parse failure is non-fatal
      }
      const idPart = requestId ? ` (request ID: ${requestId})` : "";
      ctx.ui.notify(
        `ShaRD: Access request submitted${idPart}. Watch for an approval email sent to ${operator_email}, then run /sandyclaw-setup to enter your key.`,
        "info",
      );
    } else if (response.status === 409) {
      ctx.ui.notify(
        "ShaRD: That username is already taken. Run /sandyclaw-setup to enter a key for an existing account, or restart to try a different username.",
        "warning",
      );
    } else {
      let detail = "";
      try {
        const body = (await response.json()) as { error?: string; message?: string };
        detail = body.error ?? body.message ?? "";
      } catch {
        // ignore
      }
      ctx.ui.notify(
        `ShaRD: Request failed (HTTP ${response.status}${detail ? `: ${detail}` : ""}). Visit https://sandyclaw.permiso.io for help.`,
        "error",
      );
    }
  });

  pi.registerCommand("sandyclaw-setup", {
    description: "Enter or update your SandyClaw API key",
    handler: async (_args, ctx) => {
      const key = await ctx.ui.input("Enter your SandyClaw API key:");
      if (!key?.trim()) {
        ctx.ui.notify("ShaRD: No key entered. Setup cancelled.", "warning");
        return;
      }
      ctx.modelRegistry.authStorage.set("sandyclaw", {
        type: "api_key",
        key: key.trim(),
      });
      ctx.ui.notify("ShaRD: SandyClaw key stored ✓", "info");
    },
  });
}
