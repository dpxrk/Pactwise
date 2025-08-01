"use strict";
/// <reference path="../../types/global.d.ts" />
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
exports.logAuthEvent = exports.hasRole = exports.createSupabaseClient = exports.getUserFromAuth = exports.verifyAndGetUser = exports.extractJWT = exports.createUserClient = exports.createAdminClient = void 0;
var supabase_js_1 = require("@supabase/supabase-js");
// Create Supabase admin client with service role key
var createAdminClient = function () {
    var supabaseUrl = Deno.env.get('SUPABASE_URL');
    var supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase environment variables');
    }
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
};
exports.createAdminClient = createAdminClient;
// Create Supabase client with user JWT for RLS
var createUserClient = function (jwt) {
    var supabaseUrl = Deno.env.get('SUPABASE_URL');
    var supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables');
    }
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
        global: {
            headers: {
                Authorization: "Bearer ".concat(jwt),
            },
        },
    });
};
exports.createUserClient = createUserClient;
// Extract JWT from Authorization header
var extractJWT = function (authHeader) {
    if (!authHeader) {
        throw new Error('Missing authorization header');
    }
    var parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new Error('Invalid authorization header format');
    }
    return parts[1];
};
exports.extractJWT = extractJWT;
// Verify JWT and get authenticated user
var verifyAndGetUser = function (jwt) { return __awaiter(void 0, void 0, void 0, function () {
    var adminClient, _a, authUser, authError, _b, profile, profileError, userProfile;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                adminClient = (0, exports.createAdminClient)();
                return [4 /*yield*/, adminClient.auth.getUser(jwt)];
            case 1:
                _a = _c.sent(), authUser = _a.data, authError = _a.error;
                if (authError || !(authUser === null || authUser === void 0 ? void 0 : authUser.user)) {
                    console.error('Auth error:', authError);
                    throw new Error('Invalid or expired token');
                }
                return [4 /*yield*/, adminClient
                        .from('users')
                        .select('*')
                        .eq('auth_id', authUser.user.id)
                        .eq('is_active', true)
                        .single()];
            case 2:
                _b = _c.sent(), profile = _b.data, profileError = _b.error;
                if (profileError || !profile) {
                    console.error('Profile error:', profileError);
                    // Check if this is a new user that needs provisioning
                    if ((profileError === null || profileError === void 0 ? void 0 : profileError.code) === 'PGRST116') {
                        throw new Error('User not provisioned. Please complete registration.');
                    }
                    throw new Error('User profile not found');
                }
                userProfile = profile;
                return [2 /*return*/, {
                        auth: authUser.user,
                        profile: userProfile,
                        // Convenience accessors
                        id: userProfile.id,
                        email: userProfile.email,
                        role: userProfile.role,
                        enterprise_id: userProfile.enterprise_id,
                        is_active: userProfile.is_active,
                    }];
        }
    });
}); };
exports.verifyAndGetUser = verifyAndGetUser;
// Get authenticated user from authorization header
var getUserFromAuth = function (authHeader) { return __awaiter(void 0, void 0, void 0, function () {
    var jwt;
    return __generator(this, function (_a) {
        jwt = (0, exports.extractJWT)(authHeader);
        return [2 /*return*/, (0, exports.verifyAndGetUser)(jwt)];
    });
}); };
exports.getUserFromAuth = getUserFromAuth;
// Create client with proper auth context
var createSupabaseClient = function (authHeader) {
    if (authHeader) {
        var jwt = (0, exports.extractJWT)(authHeader);
        return (0, exports.createUserClient)(jwt);
    }
    return (0, exports.createAdminClient)();
};
exports.createSupabaseClient = createSupabaseClient;
// Check if user has required role
var hasRole = function (user, requiredRoles) {
    var roleHierarchy = {
        owner: 5,
        admin: 4,
        manager: 3,
        user: 2,
        viewer: 1,
    };
    var userLevel = roleHierarchy[user.role] || 0;
    var requiredLevel = Math.min.apply(Math, requiredRoles.map(function (role) { return roleHierarchy[role] || 0; }));
    return userLevel >= requiredLevel;
};
exports.hasRole = hasRole;
// Log authentication event
var logAuthEvent = function (client, userId, event, success, metadata) { return __awaiter(void 0, void 0, void 0, function () {
    var error;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, client
                    .from('login_attempts')
                    .insert({
                    user_id: userId,
                    event_type: event,
                    email: (metadata === null || metadata === void 0 ? void 0 : metadata.email) || '',
                    ip_address: metadata === null || metadata === void 0 ? void 0 : metadata.ip_address,
                    user_agent: metadata === null || metadata === void 0 ? void 0 : metadata.user_agent,
                    success: success,
                    failure_reason: metadata === null || metadata === void 0 ? void 0 : metadata.failure_reason,
                })];
            case 1:
                error = (_a.sent()).error;
                if (error) {
                    console.error('Failed to log auth event:', error);
                }
                return [2 /*return*/];
        }
    });
}); };
exports.logAuthEvent = logAuthEvent;
