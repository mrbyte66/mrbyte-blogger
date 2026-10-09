#!/usr/bin/env python3
"""Install the non-AI macOS poller with existing gh/Codex login."""
import argparse
import json
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys
import os

LABEL = "com.satir.ci-monitor"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--uninstall", action="store_true")
    parser.add_argument("--model", default="gpt-6.1-sol")
    args = parser.parse_args()
    if sys.platform != "darwin":
        parser.error("launchd installation requires macOS; run ci-monitor.py --config directly elsewhere")
    home = Path.home()
    plist = home / "Library/LaunchAgents" / (LABEL + ".plist")
    domain = "gui/" + str(os.getuid())
    if plist.exists():
        subprocess.run(["launchctl", "bootout", domain, str(plist)], check=False, capture_output=True)
    if args.uninstall:
        plist.unlink(missing_ok=True)
        print("Monitor stopped; local configuration/history retained.")
        return
    gh = shutil.which("gh") or str(home / ".local/bin/gh")
    codex = shutil.which("codex")
    if not codex or not Path(gh).exists():
        parser.error("gh and codex must be installed and logged in")
    subprocess.run([gh, "auth", "status"], check=True, capture_output=True)
    subprocess.run([codex, "login", "status"], check=True, capture_output=True)
    directory = home / ".local/share/satir-ci"
    directory.mkdir(parents=True, mode=0o700, exist_ok=True)
    shutil.copyfile(Path(__file__).with_name("ci-monitor.py"), directory / "ci-monitor.py")
    config = {"repo": "mrbyte66/mrbyte-blogger", "owner": "mrbyte66", "gh": gh, "codex": codex,
              "model": args.model, "state_dir": str(directory / "state"), "project_number": 2,
              "project_title": "Satir", "project": "PVT_kwHOBJLPx84BmCyY",
              "status_field": "PVTSSF_lAHOBJLPx84BmCyYzhktTTI", "active_field": "PVTSSF_lAHOBJLPx84BmCyYzhku8a0",
              "in_test": "e24cd6fc", "in_progress": "47fc9ee4",
              "agents": {"Codex": "ae9d98d4", "Claude": "99a2df67"}}
    configfile = directory / "config.json"
    configfile.write_text(json.dumps(config, indent=2))
    os.chmod(configfile, 0o600)
    command = [sys.executable, str(directory / "ci-monitor.py"), "--config", str(configfile)]
    # Never wake agents for historical results on first installation.
    if not (directory / "state/events.json").exists():
        subprocess.run(command + ["--baseline"], check=True)
    plist.parent.mkdir(parents=True, exist_ok=True)
    definition = {"Label": LABEL, "ProgramArguments": command, "StartInterval": 120, "RunAtLoad": True,
                  "EnvironmentVariables": {"PATH": os.environ.get("PATH", "/usr/bin:/bin")},
                  "StandardOutPath": str(directory / "monitor.log"), "StandardErrorPath": str(directory / "errors.log")}
    with plist.open("wb") as output:
        plistlib.dump(definition, output)
    subprocess.run(["launchctl", "bootstrap", domain, str(plist)], check=True)
    print("Installed: every 120 seconds, no AI while CI is pending. Config:", configfile)

if __name__ == "__main__":
    main()
