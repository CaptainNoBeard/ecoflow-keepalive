const { chromium } = require('playwright');

function log(...args) {
  const now = new Date().toLocaleString('sv-SE', { hour12: false });
  console.log(`[${now}]`, ...args);
}

function logError(...args) {
  const now = new Date().toLocaleString('sv-SE', { hour12: false });
  console.error(`[${now}]`, ...args);
}

const PORTAL_URL = 'https://user-portal.ecoflow.com/';
const LOGIN_URL = 'https://user-portal.ecoflow.com/user/eu/en/login';
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;  // 5 minutes

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isLoggedIn(page) {
  const url = page.url();
  return !url.includes('/login') && url.includes('ecoflow');
}

const FORM_TIMEOUT = 45000;  // SPA hydration on slow NAS can take 30s+

// EcoFlow portal: email is type="text", ids are normal_login_* (Ant Design)
const EMAIL_SELECTOR =
  '#normal_login_email, input[placeholder*="mail" i], input[type="email"], input[name="email"], #email, input[autocomplete="email"]';
const PASSWORD_SELECTOR =
  '#normal_login_password, input[type="password"], input[name="password"], #password, input[placeholder*="password" i], input[autocomplete="current-password"]';
const LOGIN_BUTTON_SELECTOR =
  'button[type="submit"], button:has-text("Log in"), button:has-text("Login"), .login-btn, [type="submit"]';

async function login(page, email, password) {
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // SPA: wait for React to render the login form (JS bundle loads, then hydrates)
  const emailInput = page.locator(EMAIL_SELECTOR).first();
  await emailInput.waitFor({ state: 'visible', timeout: FORM_TIMEOUT });

  await emailInput.fill(email);
  await page.locator(PASSWORD_SELECTOR).first().fill(password);

  // Agree to Terms & Conditions (checkbox must be checked before Log in)
  const termsCheckbox = page.locator('#normal_login_agreement, input[type="checkbox"]').first();
  if (await termsCheckbox.isVisible()) {
    await termsCheckbox.check();
  }

  const loginButton =
    page.getByRole('button', { name: /log\s*in/i }).or(
      page.locator(LOGIN_BUTTON_SELECTOR).first()
    );
  await loginButton.click();

  await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 30000 });
}

async function main() {
  const email = process.env.ECOFLOW_EMAIL;
  const password = process.env.ECOFLOW_PASSWORD;

  if (!email || !password) {
    logError('Set ECOFLOW_EMAIL and ECOFLOW_PASSWORD environment variables');
    process.exit(1);
  }

  let browser;
  let page;

  while (true) {
    const sessionStart = Date.now();
    const isDebug = process.env.DEBUG === 'true';

    try {
      browser = await chromium.launch({
        headless: !isDebug,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-animations',
          '--disable-canvas-aa',
          '--disable-gpu'
        ],
      });

      const context = await browser.newContext({
        viewport: { width: 1280, height: 1000 },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      page = await context.newPage();

      if (!isDebug) {
        await page.route('**/*', (route) => {
          const type = route.request().resourceType();
          // Block expensive resources to save CPU, but allow XHR/Fetch/WebSockets/Stylesheets
          // We allow stylesheets because some SPAs need them for visibility checks
          if (['image', 'media', 'font'].includes(type)) {
            route.abort();
          } else {
            route.continue();
          }
        });
      }

      // Brutally throttle all JavaScript animations to run only once per second instead of 60 times a second
      await page.addInitScript(() => {
        window.requestAnimationFrame = (callback) => setTimeout(callback, 1000);
      });

      // Always login: each iteration uses a fresh browser with no session
      await login(page, email, password);
      log('Logged in');

      // Go to dashboard and keep session active
      await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded' });

      if (!(await isLoggedIn(page))) {
        await login(page, email, password);
      }

      await page.goto(PORTAL_URL + '#/dashboard', { waitUntil: 'domcontentloaded' });
      log('Dashboard loaded, session active');

      // Keep page open, refresh periodically, restart after 23 hours to preempt 24h logout
      const SESSION_MAX_MS = 23 * 60 * 60 * 1000; // 23 hours

      while (true) {
        await sleep(REFRESH_INTERVAL_MS);
        if (!(await isLoggedIn(page))) {
          log('Session lost, breaking loop to relogin');
          break;
        }

        if (Date.now() - sessionStart >= SESSION_MAX_MS) {
          log('Session reached 23h limit, restarting browser context');
          break;
        }

        await page.reload({ waitUntil: 'domcontentloaded' });
        log('Page refreshed');
      }
    } catch (err) {
      logError('Error:', err.message);
      if (page && !page.isClosed()) {
        try {
          await page.screenshot({ path: 'error.png', fullPage: true });
          log('Saved inner error screenshot to error.png');
        } catch (e) {
          logError('Could not save screenshot:', e.message);
        }
      }
    } finally {
      if (browser) await browser.close();
      page = null;
    }

    log('Restarting in 60s...');
    await sleep(60000);
  }
}

main().catch(logError);