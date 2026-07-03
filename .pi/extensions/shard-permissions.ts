import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI, ToolCallEventResult } from "@earendil-works/pi-coding-agent";

interface PermRule {
  message: string;
  priority: number;
  match: {
    tool: string;
    params?: {
      command?: string;
    };
  };
  action: "deny" | "allow";
}

interface PermissionsFile {
  permissions?: {
    rules?: PermRule[];
  };
}

async function loadRules(filePath: string): Promise<PermRule[]> {
  try {
    const text = await readFile(filePath, "utf8");
    const parsed = JSON.parse(text) as PermissionsFile;
    return parsed?.permissions?.rules ?? [];
  } catch {
    return [];
  }
}

export default function (pi: ExtensionAPI) {
  let denyRules: PermRule[] = [];

  pi.on("session_start", async (_event, ctx) => {
    const projectPath = join(ctx.cwd, ".pi", "permissions.json");
    const globalPath = join(homedir(), ".pi", "agent", "permissions.json");

    const [globalRules, projectRules] = await Promise.all([
      loadRules(globalPath),
      loadRules(projectPath),
    ]);

    // Project rules take priority: deduplicate by message, preferring project
    const projectMessages = new Set(projectRules.map((r) => r.message));
    const merged = [
      ...projectRules,
      ...globalRules.filter((r) => !projectMessages.has(r.message)),
    ];

    denyRules = merged
      .filter((r) => r.action === "deny")
      .sort((a, b) => b.priority - a.priority);

    if (ctx.hasUI) {
      ctx.ui.notify(
        `SHarD Permissions: ${denyRules.length} deny rule${denyRules.length === 1 ? "" : "s"} loaded`,
        "info",
      );
    }
  });

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return undefined;

    const command = event.input.command as string;

    for (const rule of denyRules) {
      if (rule.match.tool !== "bash") continue;

      const pattern = rule.match.params?.command;
      if (!pattern) continue;

      if (new RegExp(pattern).test(command)) {
        if (ctx.hasUI) {
          ctx.ui.notify(
            `${rule.message} — blocked: ${command}`,
            "warning",
          );
        }
        return { block: true, reason: rule.message } satisfies ToolCallEventResult;
      }
    }

    return undefined;
  });
}
