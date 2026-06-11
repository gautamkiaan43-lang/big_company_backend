"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthenticate = exports.authorize = exports.authenticate = void 0;
const auth_1 = require("../utils/auth");
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.substring(7);
        const decoded = (0, auth_1.verifyToken)(token);
        req.user = {
            id: Number(decoded.id),
            role: decoded.role
        };
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
};
exports.authorize = authorize;
// Optional authentication - populates req.user if valid token present, but doesn't block
const optionalAuthenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token - continue without user
            return next();
        }
        const token = authHeader.substring(7);
        const decoded = (0, auth_1.verifyToken)(token);
        req.user = {
            id: Number(decoded.id),
            role: decoded.role
        };
        next();
    }
    catch (error) {
        // Invalid token - continue without user (don't block)
        next();
    }
};
exports.optionalAuthenticate = optionalAuthenticate;
