const crypto = require("crypto");

const SEB_HASH_HEADER_KEYS = [
    "x-safeexambrowser-requesthash",
    "x-safeexambrowser-request-hash",
    "x-safeexambrowser-configkeyhash",
    "x-safeexambrowser-browserexamkey",
    "safeexambrowser-requesthash"
];

const normalizeHeaderValue = (value) => {
    if (!value) return null;
    if (Array.isArray(value)) return value[0];
    return String(value);
};

const getSebRequestHash = (headers = {}) => {
    const lowerCaseHeaders = Object.entries(headers).reduce((acc, [key, value]) => {
        acc[key.toLowerCase()] = value;
        return acc;
    }, {});

    for (const key of SEB_HASH_HEADER_KEYS) {
        const headerValue = normalizeHeaderValue(lowerCaseHeaders[key]);
        if (headerValue) return headerValue;
    }
    return null;
};

const validateSebRequest = (req, exam) => {
    if (!exam?.sebEnabled) {
        return { ok: true, reason: "not_required" };
    }

    const userAgent = req.headers["user-agent"] || "";
    const isSebUserAgent = userAgent.toLowerCase().includes("seb");
    const devBypass =
        process.env.NODE_ENV === "development" &&
        (req.query.devSeb === "1" || req.query.devSeb === "true");

    if (!isSebUserAgent) {
        return { ok: false, code: "UA_MISSING" };
    }

    const requestHash = getSebRequestHash(req.headers);

    if (devBypass && !exam.sebBrowserKey) {
        return { ok: true, devBypass: true, requestHash };
    }

    if (exam.sebBrowserKey) {
        if (!requestHash) {
            return { ok: true, requestHash, hashMissing: true };
        }
        if (requestHash !== exam.sebBrowserKey) {
            return { ok: false, code: "HASH_MISMATCH", requestHash };
        }
        return { ok: true, requestHash };
    }

    if (!requestHash) {
        const inDev = process.env.NODE_ENV === "development";
        return inDev ? { ok: true, requestHash, devWarning: true } : { ok: false, code: "HASH_REQUIRED", requestHash };
    }

    return { ok: true, requestHash };
};

/**
 * Middleware wrapper kept for compatibility, uses validateSebRequest under the hood.
 */
function validateSEB(exam) {
    return (req, res, next) => {
        const result = validateSebRequest(req, exam);
        if (result.ok) return next();

        return res.status(403).json({
            error: "SEB_REQUIRED",
            message: "Bu sınav SEB gerektirir. .seb config dosyasını indirip SEB içinde açarak başlatın."
        });
    };
}

/**
 * Generate a SEB browser key for an exam.
 * In production, this would use proper cryptographic methods.
 */
function generateSebBrowserKey(examId) {
    return crypto.createHash("sha256").update(`seb-key-${examId}-${Date.now()}`).digest("hex").substring(0, 32);
}

module.exports = {
    validateSEB,
    validateSebRequest,
    generateSebBrowserKey,
    getSebRequestHash
};
