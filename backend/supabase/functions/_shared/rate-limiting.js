"use strict";
/// <reference path="../../types/global.d.ts" />
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitRules = exports.EnhancedRateLimiter = void 0;
exports.rateLimitMiddleware = rateLimitMiddleware;
var supabase_ts_1 = require("./supabase.ts");
var cors_ts_1 = require("./cors.ts");
/**
 * Enhanced Rate Limiting System
 * Supports multiple strategies and comprehensive monitoring
 */
var EnhancedRateLimiter = /** @class */ (function () {
    function EnhancedRateLimiter(supabaseClient) {
        this.cache = new Map();
        this.metrics = new Map();
        this.supabase = supabaseClient || (0, supabase_ts_1.createSupabaseClient)();
    }
    /**
     * Check if request is allowed based on configured rules
     */
    EnhancedRateLimiter.prototype.checkLimit = function (req, rules, identifier) {
        return __awaiter(this, void 0, void 0, function () {
            var fingerprint, sortedRules, _i, sortedRules_1, rule, result, defaultRule;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.generateFingerprint(req, identifier)];
                    case 1:
                        fingerprint = _a.sent();
                        sortedRules = rules
                            .filter(function (rule) { return rule.enabled; })
                            .sort(function (a, b) { return b.priority - a.priority; });
                        _i = 0, sortedRules_1 = sortedRules;
                        _a.label = 2;
                    case 2:
                        if (!(_i < sortedRules_1.length)) return [3 /*break*/, 7];
                        rule = sortedRules_1[_i];
                        return [4 /*yield*/, this.checkRule(req, rule, fingerprint)];
                    case 3:
                        result = _a.sent();
                        // Record metrics
                        return [4 /*yield*/, this.recordMetrics(rule, result, fingerprint)];
                    case 4:
                        // Record metrics
                        _a.sent();
                        if (!!result.allowed) return [3 /*break*/, 6];
                        // Log blocked request
                        return [4 /*yield*/, this.logBlockedRequest(req, rule, fingerprint, result)];
                    case 5:
                        // Log blocked request
                        _a.sent();
                        return [2 /*return*/, result];
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7:
                        defaultRule = sortedRules[0] || this.getDefaultRule();
                        return [2 /*return*/, {
                                allowed: true,
                                limit: defaultRule.maxRequests,
                                remaining: defaultRule.maxRequests - 1,
                                resetAt: new Date(Date.now() + defaultRule.windowSeconds * 1000),
                                rule: defaultRule,
                                fingerprint: fingerprint,
                            }];
                }
            });
        });
    };
    /**
     * Check individual rate limiting rule
     */
    EnhancedRateLimiter.prototype.checkRule = function (req, rule, fingerprint) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (rule.strategy) {
                    case 'fixed_window':
                        return [2 /*return*/, this.checkFixedWindow(req, rule, fingerprint)];
                    case 'sliding_window':
                        return [2 /*return*/, this.checkSlidingWindow(req, rule, fingerprint)];
                    case 'token_bucket':
                        return [2 /*return*/, this.checkTokenBucket(req, rule, fingerprint)];
                    default:
                        return [2 /*return*/, this.checkFixedWindow(req, rule, fingerprint)];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Fixed window rate limiting
     */
    EnhancedRateLimiter.prototype.checkFixedWindow = function (_req, rule, fingerprint) {
        return __awaiter(this, void 0, void 0, function () {
            var now, windowStart, windowEnd, key, count;
            return __generator(this, function (_a) {
                now = new Date();
                windowStart = new Date(Math.floor(now.getTime() / (rule.windowSeconds * 1000)) * rule.windowSeconds * 1000);
                windowEnd = new Date(windowStart.getTime() + rule.windowSeconds * 1000);
                key = "".concat(rule.id, ":").concat(fingerprint, ":").concat(windowStart.getTime());
                count = this.cache.get(key) || 0;
                if (count >= rule.maxRequests) {
                    return [2 /*return*/, {
                            allowed: false,
                            limit: rule.maxRequests,
                            remaining: 0,
                            resetAt: windowEnd,
                            retryAfter: Math.ceil((windowEnd.getTime() - now.getTime()) / 1000),
                            rule: rule,
                            fingerprint: fingerprint,
                        }];
                }
                // Increment counter
                this.cache.set(key, count + 1);
                // Persist to database (async, don't wait)
                this.persistRateLimit(rule, fingerprint, windowStart, count + 1);
                return [2 /*return*/, {
                        allowed: true,
                        limit: rule.maxRequests,
                        remaining: rule.maxRequests - (count + 1),
                        resetAt: windowEnd,
                        rule: rule,
                        fingerprint: fingerprint,
                    }];
            });
        });
    };
    /**
     * Sliding window rate limiting
     */
    EnhancedRateLimiter.prototype.checkSlidingWindow = function (req, rule, fingerprint) {
        return __awaiter(this, void 0, void 0, function () {
            var now, windowStart, requests, currentCount, oldestRequest, resetAt;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        now = new Date();
                        windowStart = new Date(now.getTime() - rule.windowSeconds * 1000);
                        return [4 /*yield*/, this.supabase
                                .from('rate_limit_requests')
                                .select('created_at')
                                .eq('rule_id', rule.id)
                                .eq('fingerprint', fingerprint)
                                .gte('created_at', windowStart.toISOString())
                                .order('created_at', { ascending: false })];
                    case 1:
                        requests = (_a.sent()).data;
                        currentCount = (requests === null || requests === void 0 ? void 0 : requests.length) || 0;
                        if (currentCount >= rule.maxRequests) {
                            oldestRequest = requests === null || requests === void 0 ? void 0 : requests[requests.length - 1];
                            resetAt = oldestRequest
                                ? new Date(new Date(oldestRequest.created_at).getTime() + rule.windowSeconds * 1000)
                                : new Date(now.getTime() + rule.windowSeconds * 1000);
                            return [2 /*return*/, {
                                    allowed: false,
                                    limit: rule.maxRequests,
                                    remaining: 0,
                                    resetAt: resetAt,
                                    retryAfter: Math.ceil((resetAt.getTime() - now.getTime()) / 1000),
                                    rule: rule,
                                    fingerprint: fingerprint,
                                }];
                        }
                        // Record this request
                        return [4 /*yield*/, this.supabase
                                .from('rate_limit_requests')
                                .insert({
                                rule_id: rule.id,
                                fingerprint: fingerprint,
                                endpoint: this.getEndpoint(req),
                                user_agent: req.headers.get('user-agent'),
                                ip_address: req.headers.get('x-forwarded-for') || 'unknown',
                            })];
                    case 2:
                        // Record this request
                        _a.sent();
                        return [2 /*return*/, {
                                allowed: true,
                                limit: rule.maxRequests,
                                remaining: rule.maxRequests - (currentCount + 1),
                                resetAt: new Date(now.getTime() + rule.windowSeconds * 1000),
                                rule: rule,
                                fingerprint: fingerprint,
                            }];
                }
            });
        });
    };
    /**
     * Token bucket rate limiting
     */
    EnhancedRateLimiter.prototype.checkTokenBucket = function (_req, rule, fingerprint) {
        return __awaiter(this, void 0, void 0, function () {
            var now, bucketKey, bucket, elapsed, refillRate, tokensToAdd, refillTime;
            return __generator(this, function (_a) {
                now = new Date();
                bucketKey = "bucket:".concat(rule.id, ":").concat(fingerprint);
                bucket = this.cache.get(bucketKey);
                if (!bucket) {
                    bucket = {
                        tokens: rule.maxRequests,
                        lastRefill: now.getTime(),
                        burstTokens: Math.floor(rule.maxRequests * (rule.burstMultiplier || 1.5)),
                    };
                }
                elapsed = (now.getTime() - bucket.lastRefill) / 1000;
                refillRate = rule.maxRequests / rule.windowSeconds;
                tokensToAdd = Math.floor(elapsed * refillRate);
                bucket.tokens = Math.min(bucket.burstTokens, bucket.tokens + tokensToAdd);
                bucket.lastRefill = now.getTime();
                if (bucket.tokens < 1) {
                    refillTime = Math.ceil((1 / refillRate) * 1000);
                    return [2 /*return*/, {
                            allowed: false,
                            limit: rule.maxRequests,
                            remaining: 0,
                            resetAt: new Date(now.getTime() + refillTime),
                            retryAfter: Math.ceil(refillTime / 1000),
                            rule: rule,
                            fingerprint: fingerprint,
                        }];
                }
                // Consume token
                bucket.tokens -= 1;
                this.cache.set(bucketKey, bucket);
                return [2 /*return*/, {
                        allowed: true,
                        limit: rule.maxRequests,
                        remaining: bucket.tokens,
                        resetAt: new Date(now.getTime() + rule.windowSeconds * 1000),
                        rule: rule,
                        fingerprint: fingerprint,
                    }];
            });
        });
    };
    /**
     * Generate unique fingerprint for request
     */
    EnhancedRateLimiter.prototype.generateFingerprint = function (req, identifier) {
        return __awaiter(this, void 0, void 0, function () {
            var authHeader, user, _a, ip, userAgent, fingerprint;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (identifier) {
                            return [2 /*return*/, "custom:".concat(identifier)];
                        }
                        authHeader = req.headers.get('authorization');
                        if (!authHeader) return [3 /*break*/, 4];
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.supabase.auth.getUser(authHeader.replace('Bearer ', ''))];
                    case 2:
                        user = (_b.sent()).data.user;
                        if (user === null || user === void 0 ? void 0 : user.id) {
                            return [2 /*return*/, "user:".concat(user.id)];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 4:
                        ip = req.headers.get('x-forwarded-for') ||
                            req.headers.get('x-real-ip') ||
                            'unknown';
                        userAgent = req.headers.get('user-agent') || 'unknown';
                        fingerprint = "".concat(ip, ":").concat(userAgent.substring(0, 50));
                        return [2 /*return*/, "anon:".concat(btoa(fingerprint).substring(0, 32))];
                }
            });
        });
    };
    /**
     * Get endpoint from request
     */
    EnhancedRateLimiter.prototype.getEndpoint = function (req) {
        var url = new URL(req.url);
        return "".concat(req.method, " ").concat(url.pathname);
    };
    /**
     * Record metrics for monitoring
     */
    EnhancedRateLimiter.prototype.recordMetrics = function (rule, result, fingerprint) {
        return __awaiter(this, void 0, void 0, function () {
            var key, current;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        key = "metrics:".concat(rule.id, ":").concat(new Date().toISOString().slice(0, 13));
                        current = this.metrics.get(key) || {
                            requests: 0,
                            blocked: 0,
                            unique_clients: new Set(),
                        };
                        current.requests += 1;
                        if (!result.allowed) {
                            current.blocked += 1;
                        }
                        current.unique_clients.add(fingerprint);
                        this.metrics.set(key, current);
                        if (!(current.requests % 100 === 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.persistMetrics(rule, current)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Log blocked request for security monitoring
     */
    EnhancedRateLimiter.prototype.logBlockedRequest = function (req, rule, fingerprint, result) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('rate_limit_violations')
                            .insert({
                            rule_id: rule.id,
                            fingerprint: fingerprint,
                            endpoint: this.getEndpoint(req),
                            ip_address: req.headers.get('x-forwarded-for') || 'unknown',
                            user_agent: req.headers.get('user-agent'),
                            violation_count: result.limit - result.remaining,
                            blocked_at: new Date().toISOString(),
                            metadata: {
                                rule_name: rule.name,
                                strategy: rule.strategy,
                                limit: result.limit,
                                reset_at: result.resetAt,
                            },
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Persist rate limit counter to database
     */
    EnhancedRateLimiter.prototype.persistRateLimit = function (rule, fingerprint, windowStart, count) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('rate_limits')
                            .upsert({
                            rule_id: rule.id,
                            fingerprint: fingerprint,
                            window_start: windowStart.toISOString(),
                            request_count: count,
                            last_request: new Date().toISOString(),
                        }, {
                            onConflict: 'rule_id,fingerprint,window_start',
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Persist metrics to database
     */
    EnhancedRateLimiter.prototype.persistMetrics = function (rule, metrics) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('rate_limit_metrics')
                            .insert({
                            rule_id: rule.id,
                            hour_bucket: new Date().toISOString().slice(0, 13),
                            total_requests: metrics.requests,
                            blocked_requests: metrics.blocked,
                            unique_clients: metrics.unique_clients.size,
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get default rate limiting rule
     */
    EnhancedRateLimiter.prototype.getDefaultRule = function () {
        return {
            id: 'default',
            name: 'Default Rate Limit',
            strategy: 'fixed_window',
            maxRequests: 60,
            windowSeconds: 60,
            scope: 'ip',
            enabled: true,
            priority: 0,
        };
    };
    /**
     * Clean up old rate limit data
     */
    EnhancedRateLimiter.prototype.cleanup = function () {
        return __awaiter(this, void 0, void 0, function () {
            var cutoff, now, _i, _a, _b, key, value;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
                        return [4 /*yield*/, Promise.all([
                                this.supabase
                                    .from('rate_limits')
                                    .delete()
                                    .lt('window_start', cutoff.toISOString()),
                                this.supabase
                                    .from('rate_limit_requests')
                                    .delete()
                                    .lt('created_at', cutoff.toISOString()),
                                this.supabase
                                    .from('rate_limit_violations')
                                    .delete()
                                    .lt('blocked_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
                            ])];
                    case 1:
                        _c.sent();
                        now = Date.now();
                        for (_i = 0, _a = this.cache.entries(); _i < _a.length; _i++) {
                            _b = _a[_i], key = _b[0], value = _b[1];
                            if (typeof value === 'object' && value.lastRefill) {
                                if (now - value.lastRefill > 24 * 60 * 60 * 1000) {
                                    this.cache.delete(key);
                                }
                            }
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get rate limiting metrics
     */
    EnhancedRateLimiter.prototype.getMetrics = function () {
        return __awaiter(this, arguments, void 0, function (timeRange) {
            var cutoff, _a, requests, violations, endpointCounts, uniqueClients, blockedClients;
            var _b, _c, _d, _e;
            if (timeRange === void 0) { timeRange = '24h'; }
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        switch (timeRange) {
                            case '1h':
                                cutoff = new Date(Date.now() - 60 * 60 * 1000);
                                break;
                            case '24h':
                                cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
                                break;
                            case '7d':
                                cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                                break;
                        }
                        return [4 /*yield*/, Promise.all([
                                this.supabase
                                    .from('rate_limit_requests')
                                    .select('endpoint, fingerprint')
                                    .gte('created_at', cutoff.toISOString()),
                                this.supabase
                                    .from('rate_limit_violations')
                                    .select('fingerprint, endpoint')
                                    .gte('blocked_at', cutoff.toISOString()),
                            ])];
                    case 1:
                        _a = _f.sent(), requests = _a[0], violations = _a[1];
                        endpointCounts = new Map();
                        uniqueClients = new Set();
                        blockedClients = new Map();
                        (_b = requests.data) === null || _b === void 0 ? void 0 : _b.forEach(function (req) {
                            endpointCounts.set(req.endpoint, (endpointCounts.get(req.endpoint) || 0) + 1);
                            uniqueClients.add(req.fingerprint);
                        });
                        (_c = violations.data) === null || _c === void 0 ? void 0 : _c.forEach(function (violation) {
                            blockedClients.set(violation.fingerprint, (blockedClients.get(violation.fingerprint) || 0) + 1);
                        });
                        return [2 /*return*/, {
                                totalRequests: ((_d = requests.data) === null || _d === void 0 ? void 0 : _d.length) || 0,
                                blockedRequests: ((_e = violations.data) === null || _e === void 0 ? void 0 : _e.length) || 0,
                                uniqueClients: uniqueClients.size,
                                topEndpoints: Array.from(endpointCounts.entries())
                                    .sort(function (_a, _b) {
                                    var a = _a[1];
                                    var b = _b[1];
                                    return b - a;
                                })
                                    .slice(0, 10)
                                    .map(function (_a) {
                                    var endpoint = _a[0], requests = _a[1];
                                    return ({ endpoint: endpoint, requests: requests });
                                }),
                                topBlocked: Array.from(blockedClients.entries())
                                    .sort(function (_a, _b) {
                                    var a = _a[1];
                                    var b = _b[1];
                                    return b - a;
                                })
                                    .slice(0, 10)
                                    .map(function (_a) {
                                    var identifier = _a[0], blocks = _a[1];
                                    return ({ identifier: identifier, blocks: blocks });
                                }),
                            }];
                }
            });
        });
    };
    return EnhancedRateLimiter;
}());
exports.EnhancedRateLimiter = EnhancedRateLimiter;
/**
 * Middleware function for easy integration
 */
function rateLimitMiddleware(req, rules, identifier) {
    return __awaiter(this, void 0, void 0, function () {
        var limiter, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    limiter = new EnhancedRateLimiter();
                    return [4 /*yield*/, limiter.checkLimit(req, rules, identifier)];
                case 1:
                    result = _a.sent();
                    if (!result.allowed) {
                        return [2 /*return*/, new Response(JSON.stringify({
                                error: 'Rate limit exceeded',
                                message: "Too many requests. Limit: ".concat(result.limit, " per ").concat(result.rule.windowSeconds, "s"),
                                retryAfter: result.retryAfter,
                                rule: result.rule.name,
                            }), {
                                status: 429,
                                headers: __assign(__assign({}, (0, cors_ts_1.getCorsHeaders)(req)), { 'Content-Type': 'application/json', 'X-RateLimit-Limit': result.limit.toString(), 'X-RateLimit-Remaining': result.remaining.toString(), 'X-RateLimit-Reset': result.resetAt.toISOString(), 'X-RateLimit-Rule': result.rule.id, 'Retry-After': (result.retryAfter || 60).toString() }),
                            })];
                    }
                    return [2 /*return*/, null];
            }
        });
    });
}
/**
 * Pre-configured rate limiting rules
 */
exports.rateLimitRules = {
    // API endpoints
    api_default: {
        id: 'api_default',
        name: 'Default API Rate Limit',
        strategy: 'fixed_window',
        maxRequests: 100,
        windowSeconds: 60,
        scope: 'user',
        enabled: true,
        priority: 1,
    },
    api_anonymous: {
        id: 'api_anonymous',
        name: 'Anonymous API Rate Limit',
        strategy: 'sliding_window',
        maxRequests: 20,
        windowSeconds: 60,
        scope: 'ip',
        enabled: true,
        priority: 2,
    },
    // AI endpoints (more expensive)
    ai_analysis: {
        id: 'ai_analysis',
        name: 'AI Analysis Rate Limit',
        strategy: 'token_bucket',
        maxRequests: 10,
        windowSeconds: 3600, // 1 hour
        scope: 'user',
        endpoint: '/ai-analysis',
        burstMultiplier: 2,
        enabled: true,
        priority: 10,
    },
    // File uploads
    file_upload: {
        id: 'file_upload',
        name: 'File Upload Rate Limit',
        strategy: 'token_bucket',
        maxRequests: 5,
        windowSeconds: 300, // 5 minutes
        scope: 'user',
        endpoint: '/storage',
        enabled: true,
        priority: 9,
    },
    // Authentication
    auth_login: {
        id: 'auth_login',
        name: 'Login Attempt Rate Limit',
        strategy: 'sliding_window',
        maxRequests: 5,
        windowSeconds: 900, // 15 minutes
        scope: 'ip',
        endpoint: '/auth',
        enabled: true,
        priority: 15,
    },
    // Enterprise tier
    enterprise_api: {
        id: 'enterprise_api',
        name: 'Enterprise API Rate Limit',
        strategy: 'token_bucket',
        maxRequests: 1000,
        windowSeconds: 60,
        scope: 'enterprise',
        userTier: 'enterprise',
        burstMultiplier: 3,
        enabled: true,
        priority: 5,
    },
};
