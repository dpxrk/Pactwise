"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheKeys = exports.globalCache = exports.MemoryCache = void 0;
var MemoryCache = /** @class */ (function () {
    function MemoryCache(cleanupIntervalMs) {
        if (cleanupIntervalMs === void 0) { cleanupIntervalMs = 60000; }
        var _this = this;
        this.cache = new Map();
        // Clean up expired entries every minute
        this.cleanupInterval = setInterval(function () {
            _this.cleanup();
        }, cleanupIntervalMs);
    }
    MemoryCache.prototype.set = function (key, value, ttlSeconds) {
        var expiresAt = Date.now() + (ttlSeconds * 1000);
        this.cache.set(key, { data: value, expiresAt: expiresAt });
    };
    MemoryCache.prototype.get = function (key) {
        var entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    };
    MemoryCache.prototype.delete = function (key) {
        return this.cache.delete(key);
    };
    MemoryCache.prototype.clear = function () {
        this.cache.clear();
    };
    MemoryCache.prototype.cleanup = function () {
        var now = Date.now();
        for (var _i = 0, _a = this.cache.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], entry = _b[1];
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    };
    MemoryCache.prototype.dispose = function () {
        clearInterval(this.cleanupInterval);
        this.cache.clear();
    };
    return MemoryCache;
}());
exports.MemoryCache = MemoryCache;
// Global cache instance
exports.globalCache = new MemoryCache();
// Cache key builders
exports.cacheKeys = {
    contractAnalytics: function (enterpriseId) { return "analytics:contract:".concat(enterpriseId); },
    vendorPerformance: function (vendorId) { return "vendor:performance:".concat(vendorId); },
    userPermissions: function (userId) { return "user:permissions:".concat(userId); },
    dashboardData: function (enterpriseId) { return "dashboard:".concat(enterpriseId); },
    aiResponse: function (hash) { return "ai:response:".concat(hash); },
};
