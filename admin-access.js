function isConfiguredAdmin(uid, configuredUids = "") {
    if (typeof uid !== "string" || !uid) return false;
    const allowedUids = new Set(
        String(configuredUids)
            .split(",")
            .map(value => value.trim())
            .filter(Boolean)
    );
    return allowedUids.has(uid);
}

module.exports = { isConfiguredAdmin };
