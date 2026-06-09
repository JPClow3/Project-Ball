import { expect, test } from "@playwright/test";
import { privateKeyToAccount } from "viem/accounts";

// Generate a random test account for authentication
const testAccount = privateKeyToAccount(`0x${"d".repeat(64)}`);

async function registerTestSession(request: any) {
  // 1. Get Nonce
  const nonceRes = await request.post("/api/auth/nonce", {
    data: {
      address: testAccount.address,
      intent: "register"
    }
  });
  expect(nonceRes.status()).toBe(200);
  const { nonce, message } = await nonceRes.json();

  // 2. Sign Message
  const signature = await testAccount.signMessage({ message });

  // 3. Register
  const registerRes = await request.post("/api/auth/register", {
    data: {
      intent: "register",
      address: testAccount.address,
      nonce,
      signature,
      displayName: "UI UX Auditor"
    }
  });
  expect(registerRes.status()).toBe(200);

  const headers = registerRes.headers();
  const setCookie = headers["set-cookie"];
  expect(setCookie).toBeDefined();

  const cookieMatch = setCookie.match(/project_ball_session=([^;]+)/);
  expect(cookieMatch).not.toBeNull();
  return cookieMatch![1];
}

const PAGES = [
  { url: "/", name: "Home (Guest)", auth: false },
  { url: "/about", name: "About", auth: false },
  { url: "/login", name: "Login", auth: false },
  { url: "/privacy", name: "Privacy Policy", auth: false },
  { url: "/register", name: "Register", auth: false },
  { url: "/stats", name: "Stats", auth: false },
  { url: "/support", name: "Support", auth: false },
  { url: "/terms", name: "Terms of Service", auth: false },
  { url: "/meus-palpites", name: "My Bets (Auth)", auth: true },
  { url: "/premios", name: "Rewards (Auth)", auth: true }
];

test("comprehensive ui/ux audit across all pages", async ({ page, context, request }) => {
  test.setTimeout(120_000);

  // Authenticate first
  const sessionToken = await registerTestSession(request);
  const baseUrl = test.info().project.use.baseURL || "http://127.0.0.1:61737";
  const domain = new URL(baseUrl).hostname;

  // Add the cookie to Playwright context for auth pages
  await context.addCookies([
    {
      name: "project_ball_session",
      value: sessionToken,
      domain,
      path: "/"
    }
  ]);

  const auditViolations: { page: string; url: string; check: string; details: string }[] = [];

  for (const pageInfo of PAGES) {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    // Navigate to page
    const response = await page.goto(pageInfo.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    expect(response?.ok()).toBe(true);

    // Give Astro transitions or client hydration a tiny moment
    await page.waitForTimeout(200);

    // 1. Check Console and Page Errors
    if (consoleErrors.length > 0) {
      auditViolations.push({
        page: pageInfo.name,
        url: pageInfo.url,
        check: "Console Errors",
        details: consoleErrors.join(" | ")
      });
    }
    if (pageErrors.length > 0) {
      auditViolations.push({
        page: pageInfo.name,
        url: pageInfo.url,
        check: "Page Errors",
        details: pageErrors.join(" | ")
      });
    }

    // 2. Client-side evaluation for UI/UX metrics
    const pageAudit = await page.evaluate(() => {
      function isVisible(el: Element): boolean {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      }

      function accessibleName(el: Element): string {
        const labelledBy = el.getAttribute("aria-labelledby");
        const labelledByText = labelledBy
          ?.split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
          .join(" ")
          .trim();
        const input = el as HTMLInputElement;
        return (
          el.getAttribute("aria-label") ??
          labelledByText ??
          el.getAttribute("title") ??
          input.labels?.[0]?.textContent?.trim() ??
          el.textContent?.trim() ??
          input.value ??
          ""
        ).trim();
      }

      // Check all controls
      const controls = Array.from(document.querySelectorAll("a, button, input, select, textarea")).filter(isVisible);
      const unnamedControls = controls
        .filter((el) => accessibleName(el).length === 0)
        .map((el) => {
          // Truncate outerHTML for report
          return `<${el.tagName.toLowerCase()} id="${el.id}" class="${el.className}">`;
        });

      // Check touch target size of all controls
      const smallControls = controls
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          // We look for any clickable element with width < 36px or height < 36px
          return rect.width < 36 || rect.height < 36;
        })
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const name = accessibleName(el) || el.tagName.toLowerCase();
          return `"${name}" (${Math.round(rect.width)}x${Math.round(rect.height)}px)`;
        });

      // Alt tag check on images
      const images = Array.from(document.images).filter(isVisible);
      const imagesMissingAlt = images
        .filter((img) => {
          const isDecorative =
            img.getAttribute("aria-hidden") === "true" ||
            img.getAttribute("role") === "presentation" ||
            img.getAttribute("role") === "none";
          if (isDecorative) {
            return !img.hasAttribute("alt");
          }
          return !img.hasAttribute("alt") || img.getAttribute("alt")?.trim() === "";
        })
        .map((img) => img.src);

      // SEO Checks
      const title = document.title?.trim() || "";
      const description = document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "";
      const hasViewport = document
        .querySelector('meta[name="viewport"]')
        ?.getAttribute("content")
        ?.includes("width=device-width") ?? false;
      const hasThemeColor = Boolean(document.querySelector('meta[name="theme-color"]'));
      const h1Count = document.querySelectorAll("h1").length;

      // Horizontal overflow check
      const horizontalOverflow = document.documentElement.scrollWidth > window.innerWidth;

      return {
        title,
        description,
        hasViewport,
        hasThemeColor,
        h1Count,
        unnamedControls,
        smallControls,
        imagesMissingAlt,
        horizontalOverflow
      };
    });

    // 3. Document violations
    if (pageAudit.horizontalOverflow) {
      auditViolations.push({
        page: pageInfo.name,
        url: pageInfo.url,
        check: "Responsiveness",
        details: "Horizontal overflow detected (scrollWidth > window.innerWidth)."
      });
    }

    if (pageAudit.imagesMissingAlt.length > 0) {
      auditViolations.push({
        page: pageInfo.name,
        url: pageInfo.url,
        check: "Accessibility (Alt tag)",
        details: `Missing alt on images: ${pageAudit.imagesMissingAlt.join(" | ")}`
      });
    }

    if (pageAudit.unnamedControls.length > 0) {
      auditViolations.push({
        page: pageInfo.name,
        url: pageInfo.url,
        check: "Accessibility (Interactive Name)",
        details: `Unnamed controls: ${pageAudit.unnamedControls.join(" | ")}`
      });
    }

    if (pageAudit.smallControls.length > 0) {
      auditViolations.push({
        page: pageInfo.name,
        url: pageInfo.url,
        check: "Accessibility (Touch Targets)",
        details: `Small touch targets (<36x36px): ${pageAudit.smallControls.join(" | ")}`
      });
    }

    // SEO violations
    if (pageAudit.title.length === 0) {
      auditViolations.push({
        page: pageInfo.name,
        url: pageInfo.url,
        check: "SEO (Title)",
        details: "Missing page title."
      });
    }

    if (pageAudit.description.length <= 20) {
      auditViolations.push({
        page: pageInfo.name,
        url: pageInfo.url,
        check: "SEO (Description)",
        details: `Meta description is missing or too short (${pageAudit.description.length} chars).`
      });
    }

    if (!pageAudit.hasViewport) {
      auditViolations.push({
        page: pageInfo.name,
        url: pageInfo.url,
        check: "SEO (Viewport)",
        details: "Missing mobile viewport configuration."
      });
    }

    if (!pageAudit.hasThemeColor) {
      auditViolations.push({
        page: pageInfo.name,
        url: pageInfo.url,
        check: "SEO (Theme Color)",
        details: "Missing theme-color meta tag."
      });
    }

    if (pageAudit.h1Count !== 1) {
      auditViolations.push({
        page: pageInfo.name,
        url: pageInfo.url,
        check: "SEO (H1 Count)",
        details: `Page must have exactly one <h1>, found ${pageAudit.h1Count}.`
      });
    }
  }

  // Print results
  if (auditViolations.length > 0) {
    console.error("UI/UX Audit Violations Detected:");
    auditViolations.forEach((v, index) => {
      console.error(`${index + 1}. [${v.page}] [${v.check}] on ${v.url}: ${v.details}`);
    });
  }

  expect(auditViolations).toEqual([]);
});
