const test = require("node:test");
const assert = require("node:assert/strict");

const baseUrl = process.env.UI_BASE_URL;

test("ui smoke: login and signup pages respond", async (t) => {
  if (!baseUrl) {
    t.skip("UI_BASE_URL not set; skipping UI smoke test.");
    return;
  }
  const endpoints = ["/login", "/signup"];
  for (const endpoint of endpoints) {
    const response = await fetch(`${baseUrl}${endpoint}`);
    assert.equal(response.status, 200, `Expected 200 for ${endpoint}`);
  }
});
