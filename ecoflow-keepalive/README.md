# EcoFlow Keepalive

A lightweight, headless Playwright automation script designed specifically to run 24/7 on docker.

**Purpose:** 
The EcoFlow cloud API only streams realtime data (solar generation, house consumption) to HomeAssistant/HACS when an active session is detected on the EcoFlow User Portal. Running a full desktop browser locally consumes too much CPU. This script solves the problem by running a completely stripped-down, headless Chromium instance that keeps the portal open and the API streaming.

### Key Features & Optimizations
- **Near-Zero CPU Footprint:** Aggressively blocks images, fonts, and media (stylesheets are kept for stability). Furthermore, it injects a JavaScript throttle (`requestAnimationFrame`) to freeze the portal's heavy UI animations completely, bringing CPU usage down to almost 0%.
- **Anti-Logout Loop:** EcoFlow tokens expire roughly every 24 hours. The script preempts this by intentionally tearing down the browser and re-authenticating every 23 hours.
- **Auto-Recovery & Debugging:** If the session drops, it auto-recovers. If a login fails, it saves a screenshot (`error.png`) inside the container for easy debugging.

## Local Testing & Debugging
If the script fails to log in inside the container, run it locally with the browser visible:
```bash
# Windows PowerShell Example
$env:ECOFLOW_EMAIL="your_email"; $env:ECOFLOW_PASSWORD="your_password"; $env:DEBUG="true"; node keepalive.js
```
The `DEBUG="true"` flag disables the headless mode and turns off resource blocking so you can visually watch the login process and fix selectors if EcoFlow updates their website structure.


