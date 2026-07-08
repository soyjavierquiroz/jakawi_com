import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldShowPrivacyFloatingButton } from "@/lib/tracking/privacy-button-scope";

test("shows the privacy floating button on a platform storefront home", () => {
  assert.equal(shouldShowPrivacyFloatingButton("/qa-onboarding-store"), true);
  assert.equal(shouldShowPrivacyFloatingButton("/qa-onboarding-store/"), true);
});

test("hides the privacy floating button on product routes", () => {
  assert.equal(shouldShowPrivacyFloatingButton("/qa-onboarding-store/p/qa-producto-demo"), false);
  assert.equal(shouldShowPrivacyFloatingButton("/p/qa-producto-demo"), false);
});

test("hides the privacy floating button on dashboard and auth routes", () => {
  assert.equal(shouldShowPrivacyFloatingButton("/app"), false);
  assert.equal(shouldShowPrivacyFloatingButton("/app/integraciones"), false);
  assert.equal(shouldShowPrivacyFloatingButton("/login"), false);
  assert.equal(shouldShowPrivacyFloatingButton("/registro"), false);
});

test("hides the privacy floating button on platform and legal pages", () => {
  assert.equal(shouldShowPrivacyFloatingButton("/"), false);
  assert.equal(shouldShowPrivacyFloatingButton("/api/health"), false);
  assert.equal(shouldShowPrivacyFloatingButton("/admin"), false);
  assert.equal(shouldShowPrivacyFloatingButton("/privacidad"), false);
  assert.equal(shouldShowPrivacyFloatingButton("/cookies"), false);
  assert.equal(shouldShowPrivacyFloatingButton("/precios"), false);
});
