import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    if (process.env.NONO_SANDBOX) {
      if (ctx.hasUI) ctx.ui.notify("SHarD: nono sandbox active ✓", "info");
      return;
    }

    const result = await pi.exec("nono", ["--version"]).catch(() => null);
    if (!result || result.code !== 0) {
      if (ctx.hasUI)
        ctx.ui.notify(
          "SHarD: nono is not installed. Run install.sh to set up the full SHarD environment.",
          "warning",
        );
      return;
    }

    if (ctx.hasUI)
      ctx.ui.notify("SHarD: Relaunching Pi inside nono sandbox...", "info");
    const relaunchResult = await pi.exec("nono", ["run", "--profile", "pi", "--", "pi"]);
    if (relaunchResult.code !== 0) {
      if (ctx.hasUI)
        ctx.ui.notify(
          `SHarD: nono relaunch failed (exit ${relaunchResult.code}). Check that nono/pi.toml is installed correctly. Run install.sh to reinstall.`,
          "error",
        );
      return;
    }
    process.exit(0);
  });
}
