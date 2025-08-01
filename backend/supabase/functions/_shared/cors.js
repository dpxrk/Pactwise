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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCors = exports.getCorsHeaders = exports.corsHeaders = void 0;
// FIXED: Secure CORS configuration to prevent CSRF attacks
var getAllowedOrigins = function () {
    var _a;
    var allowedOrigins = ((_a = Deno.env.get('ALLOWED_ORIGINS')) === null || _a === void 0 ? void 0 : _a.split(',')) || [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://app.pactwise.com',
        'https://staging.pactwise.com',
    ];
    return allowedOrigins.map(function (origin) { return origin.trim(); });
};
var getOriginHeader = function (request) {
    var origin = request.headers.get('origin');
    var allowedOrigins = getAllowedOrigins();
    if (origin && allowedOrigins.includes(origin)) {
        return origin;
    }
    // Default to first allowed origin if no match (safer than '*')
    return allowedOrigins[0];
};
exports.corsHeaders = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
};
var getCorsHeaders = function (request) { return (__assign(__assign({}, exports.corsHeaders), { 'Access-Control-Allow-Origin': getOriginHeader(request) })); };
exports.getCorsHeaders = getCorsHeaders;
var handleCors = function (req) {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: (0, exports.getCorsHeaders)(req) });
    }
    return null;
};
exports.handleCors = handleCors;
