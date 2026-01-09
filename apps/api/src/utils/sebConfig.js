const CONFIG_VERSION = "lms-seb-v1";

const escapeXml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * Build a minimal, stable SEB plist as a Buffer.
 * platform kept for future tweaks but currently identical output.
 */
function buildSebConfig({ startUrl, platform = "mac" } = {}) {
  const safeUrl = escapeXml(startUrl || "");
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>configVersion</key>
  <string>${CONFIG_VERSION}</string>
  <key>startURL</key>
  <string>${safeUrl}</string>
  <key>allowQuit</key>
  <true/>
  <key>allowUserToQuit</key>
  <true/>
  <key>showQuitButton</key>
  <true/>
  <key>showMenuBar</key>
  <true/>
  <key>browserWindowShowURL</key>
  <false/>
</dict>
</plist>`;

  return Buffer.from(plist, "utf8");
}

module.exports = { buildSebConfig, CONFIG_VERSION };
