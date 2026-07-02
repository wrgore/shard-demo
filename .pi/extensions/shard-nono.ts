import { spawnSync } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (event, ctx) => {
    if (event.reason !== "startup") return;

    if (process.env.NONO_CAP_FILE) {
      if (ctx.hasUI) ctx.ui.notify("SHarD: nono sandbox active ✓", "info");
      return;
    }

    const nonoCheck = await pi.exec("nono", ["--version"]).catch(() => null);
    if (!nonoCheck || nonoCheck.code !== 0) {
      if (ctx.hasUI)
        ctx.ui.notify(
          "SHarD: nono is not installed. Run install.sh to set up the full SHarD environment.",
          "warning",
        );
      return;
    }

    // spawnSync blocks the event loop entirely so the parent cannot read from
    // stdin while the child is running — no TTY split-read race. Without
    // detached:true the child inherits the foreground process group and gets
    // exclusive terminal ownership from the moment it starts.
    const result = spawnSync(
      "nono",
      ["run", "--profile", "pi", "--allow-cwd", "--", "pi"],
      { stdio: "inherit" },
    );

    if (result.error) {
      if (ctx.hasUI)
        ctx.ui.notify(
          `SHarD: nono relaunch failed: ${result.error.message}. Check that nono/pi.json is installed correctly. Run install.sh to reinstall.`,
          "error",
        );
      return;
    }

    process.exit(result.status ?? 1);
  });
}
