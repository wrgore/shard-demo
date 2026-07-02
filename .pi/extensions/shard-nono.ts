import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    if (!ctx.hasUI) return;

    if (process.env.NONO_SANDBOX) {
      ctx.ui.notify("ShaRD: nono sandbox active ✓", "info");
    } else {
      ctx.ui.notify(
        "ShaRD: nono sandbox not detected. For security, run Pi via nono. See README.md for setup instructions.",
        "warning",
      );
    }
  });
}
