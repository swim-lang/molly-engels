import { existsSync } from "node:fs";
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Remotion normally downloads its own Chrome Headless Shell. That download is
// blocked here, so fall back to the Chrome that's already installed.
const LOCAL_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (existsSync(LOCAL_CHROME)) {
  Config.setBrowserExecutable(LOCAL_CHROME);
  // A full Chrome install can't open several renderer profiles at once the way
  // the headless shell can, so render one frame at a time.
  Config.setConcurrency(1);
}
