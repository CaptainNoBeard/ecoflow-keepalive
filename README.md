# EcoFlow Keepalive Home Assistant Add-on

Headless keep-alive for the EcoFlow user portal, packaged as a Home Assistant Add-on.

## Installation

1. Go to your Home Assistant instance.
2. Navigate to **Settings** -> **Add-ons** -> **Add-on Store**.
3. Click the three dots (top right) and select **Repositories**.
4. Add the URL of this GitHub repository once it is pushed to GitHub.
5. Search for "EcoFlow Keepalive" in the store and click **Install**.

## Configuration

In the Add-on Configuration tab, enter your EcoFlow portal credentials:
- **email**: Your EcoFlow account email
- **password**: Your EcoFlow account password

## Start
Save the configuration and start the Add-on. Check the Log tab to ensure it logged in successfully (it runs a full Playwright headless browser instance).
