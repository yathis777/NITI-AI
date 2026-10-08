const assert = require("node:assert/strict");
const { test } = require("node:test");
const { isConfiguredAdmin } = require("./admin-access");

test("allows only an exact UID from the configured administrator list", () => {
    assert.equal(isConfiguredAdmin("admin-uid", "first-uid, admin-uid"), true);
    assert.equal(isConfiguredAdmin("admin", "admin-uid"), false);
    assert.equal(isConfiguredAdmin("admin-uid", "user@example.com"), false);
});

test("denies missing UIDs and an empty administrator configuration", () => {
    assert.equal(isConfiguredAdmin("", "admin-uid"), false);
    assert.equal(isConfiguredAdmin("admin-uid", ""), false);
    assert.equal(isConfiguredAdmin("admin-uid", undefined), false);
});
