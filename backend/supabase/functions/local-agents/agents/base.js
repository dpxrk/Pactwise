"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgent = void 0;
var cache_ts_1 = require("../../../functions-utils/cache.ts");
var rate_limiting_ts_1 = require("../../_shared/rate-limiting.ts");
var index_ts_1 = require("../config/index.ts");
var tracing_ts_1 = require("../utils/tracing.ts");
var memory_ts_1 = require("../utils/memory.ts");
var BaseAgent = /** @class */ (function () {
    function BaseAgent(supabase, enterpriseId, userId) {
        this.metadata = {};
        this.supabase = supabase;
        this.enterpriseId = enterpriseId;
        this.userId = userId;
        this.startTime = Date.now();
        this.cache = cache_ts_1.globalCache;
        this.rateLimiter = new rate_limiting_ts_1.EnhancedRateLimiter(supabase);
        this.configManager = index_ts_1.config;
        this.tracingManager = new tracing_ts_1.TracingManager(supabase, enterpriseId);
        this.memoryManager = new memory_ts_1.MemoryManager(supabase, enterpriseId, userId);
    }
    // Main processing method with task queue integration
    BaseAgent.prototype.processTask = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var traceContext, span, _a, task, error, rateLimitSpan, rateLimit, rateLimitResult, processSpan, result, insightSpan, error_1, errorMessage, errorStack;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        traceContext = this.extractOrCreateTraceContext(taskId);
                        span = this.tracingManager.startSpan("".concat(this.agentType, ".processTask"), traceContext, this.agentType, tracing_ts_1.SpanKind.SERVER);
                        // Add initial tags
                        this.tracingManager.addTags(span.spanId, {
                            'task.id': taskId,
                            'agent.type': this.agentType,
                            'enterprise.id': this.enterpriseId,
                        });
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 12, , 14]);
                        return [4 /*yield*/, this.supabase
                                .from('agent_tasks')
                                .select('*')
                                .eq('id', taskId)
                                .eq('enterprise_id', this.enterpriseId)
                                .single()];
                    case 2:
                        _a = _b.sent(), task = _a.data, error = _a.error;
                        if (error || !task) {
                            throw new Error("Task not found: ".concat(taskId));
                        }
                        this.tracingManager.addTags(span.spanId, {
                            'task.type': task.type,
                            'task.priority': task.priority,
                        });
                        // Update task status to processing
                        return [4 /*yield*/, this.updateTaskStatus(taskId, 'processing')];
                    case 3:
                        // Update task status to processing
                        _b.sent();
                        if (!(0, index_ts_1.getFeatureFlag)('ENABLE_RATE_LIMITING')) return [3 /*break*/, 5];
                        rateLimitSpan = this.tracingManager.startSpan('rate_limit_check', this.tracingManager.createChildContext(traceContext), this.agentType, tracing_ts_1.SpanKind.INTERNAL);
                        rateLimit = (0, index_ts_1.getRateLimit)('DEFAULT');
                        return [4 /*yield*/, this.rateLimiter.checkLimit({
                                maxRequests: rateLimit.requests,
                                windowSeconds: rateLimit.window,
                                identifier: "agent_".concat(this.agentType, "_").concat(this.enterpriseId),
                                identifierType: 'agent',
                                endpoint: this.agentType,
                            })];
                    case 4:
                        rateLimitResult = _b.sent();
                        this.tracingManager.endSpan(rateLimitSpan.spanId, tracing_ts_1.SpanStatus.OK);
                        if (!rateLimitResult.allowed) {
                            throw new Error('Rate limit exceeded');
                        }
                        _b.label = 5;
                    case 5:
                        processSpan = this.tracingManager.startSpan("".concat(this.agentType, ".process"), this.tracingManager.createChildContext(traceContext), this.agentType, tracing_ts_1.SpanKind.INTERNAL);
                        return [4 /*yield*/, this.process(task.payload.data, __assign(__assign({}, task.payload.context), { taskId: taskId, traceContext: this.tracingManager.createChildContext(traceContext) }))];
                    case 6:
                        result = _b.sent();
                        this.tracingManager.endSpan(processSpan.spanId, tracing_ts_1.SpanStatus.OK);
                        if (!(result.insights.length > 0)) return [3 /*break*/, 8];
                        insightSpan = this.tracingManager.startSpan('store_insights', this.tracingManager.createChildContext(traceContext), this.agentType, tracing_ts_1.SpanKind.INTERNAL);
                        return [4 /*yield*/, this.storeInsights(result.insights, task.contract_id || task.vendor_id, task.contract_id ? 'contract' : 'vendor')];
                    case 7:
                        _b.sent();
                        this.tracingManager.endSpan(insightSpan.spanId, tracing_ts_1.SpanStatus.OK);
                        _b.label = 8;
                    case 8: 
                    // Update task with result
                    return [4 /*yield*/, this.updateTaskStatus(taskId, 'completed', result)];
                    case 9:
                        // Update task with result
                        _b.sent();
                        // Log success
                        return [4 /*yield*/, this.logAgentActivity(taskId, 'completed', 'Task processed successfully', {
                                processingTime: result.processingTime,
                                insightCount: result.insights.length,
                            })];
                    case 10:
                        // Log success
                        _b.sent();
                        // Broadcast completion for real-time updates
                        return [4 /*yield*/, this.broadcastTaskCompletion(taskId, result)];
                    case 11:
                        // Broadcast completion for real-time updates
                        _b.sent();
                        // Add final tags and end span
                        this.tracingManager.addTags(span.spanId, {
                            'task.status': 'completed',
                            'task.processing_time': result.processingTime,
                            'task.insight_count': result.insights.length,
                        });
                        this.tracingManager.endSpan(span.spanId, tracing_ts_1.SpanStatus.OK);
                        return [2 /*return*/, result];
                    case 12:
                        error_1 = _b.sent();
                        errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                        errorStack = error_1 instanceof Error ? error_1.stack : undefined;
                        // Log error to trace
                        this.tracingManager.addLog(span.spanId, 'error', 'Task processing failed', {
                            error: errorMessage,
                            stack: errorStack,
                        });
                        this.tracingManager.addTags(span.spanId, {
                            'task.status': 'failed',
                            'error': errorMessage,
                        });
                        this.tracingManager.endSpan(span.spanId, tracing_ts_1.SpanStatus.ERROR);
                        return [4 /*yield*/, this.handleProcessingError(taskId, error_1)];
                    case 13: 
                    // Handle errors with retry logic
                    return [2 /*return*/, _b.sent()];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    BaseAgent.prototype.createResult = function (success, data, insights, rulesApplied, confidence, metadata) {
        var result = {
            success: success,
            data: data,
            insights: insights,
            rulesApplied: rulesApplied,
            confidence: confidence,
            processingTime: Date.now() - this.startTime,
            metadata: __assign(__assign({}, this.metadata), metadata),
        };
        // Record metrics
        this.recordMetrics('process', result.processingTime, success).catch(console.error);
        return result;
    };
    BaseAgent.prototype.createInsight = function (type, severity, title, description, recommendation, data, isActionable) {
        if (isActionable === void 0) { isActionable = true; }
        return {
            type: type,
            severity: severity,
            title: title,
            description: description,
            recommendation: recommendation,
            data: data,
            isActionable: isActionable,
        };
    };
    BaseAgent.prototype.storeInsights = function (insights, relatedEntityId, entityType) {
        return __awaiter(this, void 0, void 0, function () {
            var cacheKey, _a, insightRecords;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (insights.length === 0 || !(0, index_ts_1.getFeatureFlag)('ENABLE_METRICS')) {
                            return [2 /*return*/];
                        }
                        if (!!this.agentId) return [3 /*break*/, 2];
                        cacheKey = "agent_id_".concat(this.agentType, "_").concat(this.enterpriseId);
                        _a = this;
                        return [4 /*yield*/, this.getCachedOrFetch(cacheKey, function () { return __awaiter(_this, void 0, void 0, function () {
                                var agent;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.supabase
                                                .from('agents')
                                                .select('id')
                                                .eq('type', this.agentType)
                                                .eq('enterprise_id', this.enterpriseId)
                                                .eq('is_active', true)
                                                .single()];
                                        case 1:
                                            agent = (_a.sent()).data;
                                            return [2 /*return*/, agent === null || agent === void 0 ? void 0 : agent.id];
                                    }
                                });
                            }); }, 3600)];
                    case 1:
                        _a.agentId = _b.sent(); // 1 hour cache
                        _b.label = 2;
                    case 2:
                        insightRecords = insights.map(function (insight) { return ({
                            agent_id: _this.agentId,
                            insight_type: insight.type,
                            severity: insight.severity,
                            title: insight.title,
                            description: insight.description,
                            recommendation: insight.recommendation,
                            metadata: insight.data,
                            is_actionable: insight.isActionable,
                            enterprise_id: _this.enterpriseId,
                            contract_id: entityType === 'contract' ? relatedEntityId : null,
                            vendor_id: entityType === 'vendor' ? relatedEntityId : null,
                        }); });
                        return [4 /*yield*/, this.supabase.from('agent_insights').insert(insightRecords)];
                    case 3:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    BaseAgent.prototype.logAgentActivity = function (taskId, logType, message, metadata) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(0, index_ts_1.getFeatureFlag)('ENABLE_AUDIT_LOGS')) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.supabase.from('agent_logs').insert({
                                agent_id: this.agentId,
                                task_id: taskId,
                                log_type: logType,
                                message: message,
                                metadata: metadata,
                                enterprise_id: this.enterpriseId,
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    BaseAgent.prototype.updateTaskStatus = function (taskId, status, result, error) {
        return __awaiter(this, void 0, void 0, function () {
            var updateData;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        updateData = {
                            status: status,
                            updated_at: new Date().toISOString(),
                        };
                        if (status === 'processing') {
                            updateData.started_at = new Date().toISOString();
                        }
                        else if (status === 'completed' || status === 'failed') {
                            updateData.completed_at = new Date().toISOString();
                        }
                        if (result) {
                            updateData.result = result;
                        }
                        if (error) {
                            updateData.error = error;
                        }
                        return [4 /*yield*/, this.supabase
                                .from('agent_tasks')
                                .update(updateData)
                                .eq('id', taskId)
                                .eq('enterprise_id', this.enterpriseId)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Permission checking
    BaseAgent.prototype.checkUserPermission = function (userId, requiredRole) {
        return __awaiter(this, void 0, void 0, function () {
            var cacheKey, cacheTTL, userRole, roleHierarchy, userLevel, requiredLevel;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cacheKey = "user_role_".concat(userId, "_").concat(this.enterpriseId);
                        cacheTTL = (0, index_ts_1.getCacheTTL)('USER_PERMISSIONS');
                        return [4 /*yield*/, this.getCachedOrFetch(cacheKey, function () { return __awaiter(_this, void 0, void 0, function () {
                                var user;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.supabase
                                                .from('users')
                                                .select('role')
                                                .eq('id', userId)
                                                .eq('enterprise_id', this.enterpriseId)
                                                .single()];
                                        case 1:
                                            user = (_a.sent()).data;
                                            return [2 /*return*/, user === null || user === void 0 ? void 0 : user.role];
                                    }
                                });
                            }); }, cacheTTL)];
                    case 1:
                        userRole = _a.sent();
                        roleHierarchy = ['viewer', 'user', 'manager', 'admin', 'owner'];
                        userLevel = roleHierarchy.indexOf(userRole);
                        requiredLevel = roleHierarchy.indexOf(requiredRole);
                        return [2 /*return*/, userLevel >= requiredLevel];
                }
            });
        });
    };
    // Enterprise configuration with caching
    BaseAgent.prototype.getEnterpriseConfig = function () {
        return __awaiter(this, void 0, void 0, function () {
            var cacheKey;
            var _this = this;
            return __generator(this, function (_a) {
                cacheKey = "enterprise_config_".concat(this.enterpriseId);
                return [2 /*return*/, this.getCachedOrFetch(cacheKey, function () { return __awaiter(_this, void 0, void 0, function () {
                        var data;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, this.supabase
                                        .from('enterprises')
                                        .select('settings')
                                        .eq('id', this.enterpriseId)
                                        .single()];
                                case 1:
                                    data = (_a.sent()).data;
                                    return [2 /*return*/, (data === null || data === void 0 ? void 0 : data.settings) || {}];
                            }
                        });
                    }); }, (0, index_ts_1.getCacheTTL)('DEFAULT'))];
            });
        });
    };
    // Database function integration with timeout
    BaseAgent.prototype.callDatabaseFunction = function (functionName, params) {
        return __awaiter(this, void 0, void 0, function () {
            var timeout, _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        timeout = (0, index_ts_1.getTimeout)('DATABASE_FUNCTION');
                        return [4 /*yield*/, this.supabase.rpc(functionName, __assign(__assign({}, params), { p_enterprise_id: this.enterpriseId }))];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            throw new Error("Database function error: ".concat(error.message));
                        }
                        return [2 /*return*/, data];
                }
            });
        });
    };
    // Semantic search using existing infrastructure
    BaseAgent.prototype.performSemanticSearch = function (query_1, table_1) {
        return __awaiter(this, arguments, void 0, function (query, table, limit) {
            var cacheKey;
            var _this = this;
            if (limit === void 0) { limit = 10; }
            return __generator(this, function (_a) {
                cacheKey = "search_".concat(table, "_").concat(query, "_").concat(this.enterpriseId);
                return [2 /*return*/, this.getCachedOrFetch(cacheKey, function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, this.callDatabaseFunction('search_with_rls', {
                                    search_query: query,
                                    search_type: table,
                                    limit_count: limit,
                                })];
                        });
                    }); }, (0, index_ts_1.getCacheTTL)('DEFAULT'))];
            });
        });
    };
    // Real-time broadcasting
    BaseAgent.prototype.broadcastTaskCompletion = function (taskId, result) {
        return __awaiter(this, void 0, void 0, function () {
            var channel;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(0, index_ts_1.getFeatureFlag)('ENABLE_REAL_TIME')) {
                            return [2 /*return*/];
                        }
                        channel = "agent_updates_".concat(this.enterpriseId);
                        return [4 /*yield*/, this.supabase
                                .from('realtime_broadcasts')
                                .insert({
                                channel: channel,
                                event: 'task_completed',
                                payload: {
                                    taskId: taskId,
                                    agentType: this.agentType,
                                    success: result.success,
                                    insights: result.insights.length,
                                    processingTime: result.processingTime,
                                },
                                enterprise_id: this.enterpriseId,
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Error handling with retry
    BaseAgent.prototype.handleProcessingError = function (taskId, error) {
        return __awaiter(this, void 0, void 0, function () {
            var task, retryConfig, retryCount, maxRetries, baseDelay, delayMs, finalDelay;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.error("Agent ".concat(this.agentType, " error:"), error);
                        return [4 /*yield*/, this.supabase
                                .from('agent_tasks')
                                .select('retry_count, max_retries')
                                .eq('id', taskId)
                                .single()];
                    case 1:
                        task = (_a.sent()).data;
                        retryConfig = this.configManager.getConfig().RETRY_CONFIG;
                        retryCount = ((task === null || task === void 0 ? void 0 : task.retry_count) || 0) + 1;
                        maxRetries = (task === null || task === void 0 ? void 0 : task.max_retries) || retryConfig.MAX_RETRIES;
                        if (!(retryCount < maxRetries)) return [3 /*break*/, 5];
                        // Update retry count
                        return [4 /*yield*/, this.supabase
                                .from('agent_tasks')
                                .update({
                                retry_count: retryCount,
                                status: 'pending', // Reset to pending for retry
                                error: error instanceof Error ? error.message : String(error),
                            })
                                .eq('id', taskId)];
                    case 2:
                        // Update retry count
                        _a.sent();
                        baseDelay = retryConfig.INITIAL_DELAY;
                        delayMs = Math.min(baseDelay * Math.pow(retryConfig.BACKOFF_MULTIPLIER, retryCount - 1), retryConfig.MAX_DELAY);
                        finalDelay = retryConfig.JITTER ?
                            delayMs * (0.5 + Math.random() * 0.5) :
                            delayMs;
                        return [4 /*yield*/, this.scheduleRetry(taskId, finalDelay)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.logAgentActivity(taskId, 'retry_scheduled', "Retry ".concat(retryCount, "/").concat(maxRetries, " scheduled"), {
                                error: error instanceof Error ? error.message : String(error),
                                delayMs: delayMs,
                            })];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 5: 
                    // Max retries reached
                    return [4 /*yield*/, this.updateTaskStatus(taskId, 'failed', null, error instanceof Error ? error.message : String(error))];
                    case 6:
                        // Max retries reached
                        _a.sent();
                        return [4 /*yield*/, this.logAgentActivity(taskId, 'failed', 'Max retries exceeded', {
                                error: error instanceof Error ? error.message : String(error),
                                retryCount: retryCount,
                            })];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8: return [2 /*return*/, this.createResult(false, null, [], [], 0, { error: error instanceof Error ? error.message : String(error), retryCount: retryCount })];
                }
            });
        });
    };
    // Schedule task retry
    BaseAgent.prototype.scheduleRetry = function (taskId, delayMs) {
        return __awaiter(this, void 0, void 0, function () {
            var scheduledAt;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        scheduledAt = new Date(Date.now() + delayMs).toISOString();
                        return [4 /*yield*/, this.supabase
                                .from('agent_tasks')
                                .update({ scheduled_at: scheduledAt })
                                .eq('id', taskId)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Performance metrics
    BaseAgent.prototype.recordMetrics = function (operation, duration, success) {
        return __awaiter(this, void 0, void 0, function () {
            var metrics, metricsKey, currentMetrics;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(0, index_ts_1.getFeatureFlag)('ENABLE_METRICS')) {
                            return [2 /*return*/];
                        }
                        metrics = {
                            agent_type: this.agentType,
                            operation: operation,
                            duration: duration,
                            success: success,
                            enterprise_id: this.enterpriseId,
                            timestamp: new Date().toISOString(),
                        };
                        // Store in database
                        return [4 /*yield*/, this.supabase
                                .from('agent_metrics')
                                .insert(metrics)
                                .catch(console.error)];
                    case 1:
                        // Store in database
                        _a.sent(); // Don't fail on metrics errors
                        metricsKey = "agent_metrics_".concat(this.agentType, "_").concat(this.enterpriseId);
                        currentMetrics = this.cache.get(metricsKey) || {
                            totalOperations: 0,
                            successCount: 0,
                            totalDuration: 0,
                        };
                        currentMetrics.totalOperations++;
                        if (success) {
                            currentMetrics.successCount++;
                        }
                        currentMetrics.totalDuration += duration;
                        this.cache.set(metricsKey, currentMetrics, 3600); // 1 hour
                        return [2 /*return*/];
                }
            });
        });
    };
    // Get cached data with fallback
    BaseAgent.prototype.getCachedOrFetch = function (key_1, fetcher_1) {
        return __awaiter(this, arguments, void 0, function (key, fetcher, ttl) {
            var cached, data;
            if (ttl === void 0) { ttl = 300; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(0, index_ts_1.getFeatureFlag)('ENABLE_CACHING')) {
                            return [2 /*return*/, fetcher()];
                        }
                        cached = this.cache.get(key);
                        if (cached) {
                            // Track cache hit in metadata
                            this.metadata = __assign(__assign({}, this.metadata), { cached: true });
                            return [2 /*return*/, cached];
                        }
                        return [4 /*yield*/, fetcher()];
                    case 1:
                        data = _a.sent();
                        this.cache.set(key, data, ttl);
                        return [2 /*return*/, data];
                }
            });
        });
    };
    // Audit logging
    BaseAgent.prototype.createAuditLog = function (action, entityType, entityId, changes) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(0, index_ts_1.getFeatureFlag)('ENABLE_AUDIT_LOGS')) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.supabase
                                .from('audit_logs')
                                .insert({
                                action: action,
                                entity_type: entityType,
                                entity_id: entityId,
                                changes: changes,
                                agent_type: this.agentType,
                                enterprise_id: this.enterpriseId,
                                created_at: new Date().toISOString(),
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Pattern extraction utilities
    BaseAgent.prototype.extractPatterns = function (text, patterns) {
        var matches = [];
        for (var _i = 0, patterns_1 = patterns; _i < patterns_1.length; _i++) {
            var pattern = patterns_1[_i];
            var found = text.match(pattern);
            if (found) {
                matches.push.apply(matches, found);
            }
        }
        return __spreadArray([], new Set(matches), true);
    };
    BaseAgent.prototype.calculateSimilarity = function (str1, str2) {
        var longer = str1.length > str2.length ? str1 : str2;
        var shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0) {
            return 1.0;
        }
        var editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    };
    BaseAgent.prototype.levenshteinDistance = function (str1, str2) {
        var track = Array(str2.length + 1).fill(null).map(function () { return Array(str1.length + 1).fill(null); });
        for (var i = 0; i <= str1.length; i += 1) {
            track[0][i] = i;
        }
        for (var j = 0; j <= str2.length; j += 1) {
            track[j][0] = j;
        }
        for (var j = 1; j <= str2.length; j += 1) {
            for (var i = 1; i <= str1.length; i += 1) {
                var indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(track[j][i - 1] + 1, track[j - 1][i] + 1, track[j - 1][i - 1] + indicator);
            }
        }
        return track[str2.length][str1.length];
    };
    BaseAgent.prototype.extractOrCreateTraceContext = function (taskId) {
        // Check if we have a trace context in the current execution
        if (this.traceContext) {
            return this.traceContext;
        }
        // Create a new trace context
        var traceContext = this.tracingManager.createTraceContext();
        // Add baggage with useful information
        this.tracingManager.addBaggage(traceContext, 'task.id', taskId);
        this.tracingManager.addBaggage(traceContext, 'agent.type', this.agentType);
        this.tracingManager.addBaggage(traceContext, 'enterprise.id', this.enterpriseId);
        this.traceContext = traceContext;
        return traceContext;
    };
    // Enable tracing for agent-to-agent calls
    BaseAgent.prototype.callAgent = function (agentType, data, context) {
        return __awaiter(this, void 0, void 0, function () {
            var childContext, span, result, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        childContext = this.traceContext
                            ? this.tracingManager.createChildContext(this.traceContext)
                            : this.tracingManager.createTraceContext();
                        span = this.tracingManager.startSpan("call_agent.".concat(agentType), childContext, this.agentType, tracing_ts_1.SpanKind.CLIENT);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.executeAgentCall(agentType, data, __assign(__assign({}, context), { traceContext: childContext }))];
                    case 2:
                        result = _a.sent();
                        this.tracingManager.endSpan(span.spanId, tracing_ts_1.SpanStatus.OK);
                        return [2 /*return*/, result];
                    case 3:
                        error_2 = _a.sent();
                        this.tracingManager.addLog(span.spanId, 'error', "Agent call failed: ".concat(error_2 instanceof Error ? error_2.message : String(error_2)));
                        this.tracingManager.endSpan(span.spanId, tracing_ts_1.SpanStatus.ERROR);
                        throw error_2;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    BaseAgent.prototype.executeAgentCall = function (agentType, data, context) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // This would be implemented to actually call another agent
                // For now, it's a placeholder
                throw new Error('Agent call not implemented');
            });
        });
    };
    // Memory Management Methods
    BaseAgent.prototype.loadMemoryContext = function (contextType_1) {
        return __awaiter(this, arguments, void 0, function (contextType, contextWindow) {
            var span, memories, error_3;
            if (contextWindow === void 0) { contextWindow = 10; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        span = this.traceContext
                            ? this.tracingManager.startSpan('load_memory_context', this.traceContext, this.agentType, tracing_ts_1.SpanKind.INTERNAL)
                            : null;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.callDatabaseFunction('get_agent_memory_context', {
                                p_agent_type: this.agentType,
                                p_user_id: this.userId,
                                p_context_window: contextWindow,
                            })];
                    case 2:
                        memories = _a.sent();
                        if (span) {
                            this.tracingManager.addTags(span.spanId, {
                                'memory.context_type': contextType,
                                'memory.count': memories.length,
                            });
                            this.tracingManager.endSpan(span.spanId, tracing_ts_1.SpanStatus.OK);
                        }
                        return [2 /*return*/, memories];
                    case 3:
                        error_3 = _a.sent();
                        if (span) {
                            this.tracingManager.addLog(span.spanId, 'error', 'Failed to load memory context', {
                                error: error_3 instanceof Error ? error_3.message : String(error_3),
                            });
                            this.tracingManager.endSpan(span.spanId, tracing_ts_1.SpanStatus.ERROR);
                        }
                        console.error('Error loading memory context:', error_3);
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    BaseAgent.prototype.storeMemory = function (memoryType_1, content_1) {
        return __awaiter(this, arguments, void 0, function (memoryType, content, context, importanceScore, embedding) {
            var span, error_4;
            if (context === void 0) { context = {}; }
            if (importanceScore === void 0) { importanceScore = 0.5; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.userId || !(0, index_ts_1.getFeatureFlag)('ENABLE_MEMORY_SYSTEM')) {
                            return [2 /*return*/];
                        }
                        span = this.traceContext
                            ? this.tracingManager.startSpan('store_memory', this.traceContext, this.agentType, tracing_ts_1.SpanKind.INTERNAL)
                            : null;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.memoryManager.storeShortTermMemory(memoryType, content, __assign(__assign({}, context), { agent_type: this.agentType, timestamp: new Date().toISOString() }), importanceScore, embedding)];
                    case 2:
                        _a.sent();
                        if (span) {
                            this.tracingManager.addTags(span.spanId, {
                                'memory.type': memoryType,
                                'memory.importance': importanceScore,
                            });
                            this.tracingManager.endSpan(span.spanId, tracing_ts_1.SpanStatus.OK);
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_4 = _a.sent();
                        if (span) {
                            this.tracingManager.addLog(span.spanId, 'error', 'Failed to store memory', {
                                error: error_4 instanceof Error ? error_4.message : String(error_4),
                            });
                            this.tracingManager.endSpan(span.spanId, tracing_ts_1.SpanStatus.ERROR);
                        }
                        console.error('Error storing memory:', error_4);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    BaseAgent.prototype.searchMemories = function (queryEmbedding_1) {
        return __awaiter(this, arguments, void 0, function (queryEmbedding, memoryStore, limit, threshold) {
            var span, results, _a, error_5;
            if (memoryStore === void 0) { memoryStore = 'short_term'; }
            if (limit === void 0) { limit = 5; }
            if (threshold === void 0) { threshold = 0.7; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(0, index_ts_1.getFeatureFlag)('ENABLE_MEMORY_SYSTEM')) {
                            return [2 /*return*/, []];
                        }
                        span = this.traceContext
                            ? this.tracingManager.startSpan('search_memories', this.traceContext, this.agentType, tracing_ts_1.SpanKind.INTERNAL)
                            : null;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 6, , 7]);
                        if (!(memoryStore === 'short_term')) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.memoryManager.searchShortTermMemory(queryEmbedding, limit, threshold)];
                    case 2:
                        _a = _b.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, this.memoryManager.searchLongTermMemory(queryEmbedding, limit, threshold)];
                    case 4:
                        _a = _b.sent();
                        _b.label = 5;
                    case 5:
                        results = _a;
                        if (span) {
                            this.tracingManager.addTags(span.spanId, {
                                'memory.store': memoryStore,
                                'memory.results': results.length,
                            });
                            this.tracingManager.endSpan(span.spanId, tracing_ts_1.SpanStatus.OK);
                        }
                        return [2 /*return*/, results];
                    case 6:
                        error_5 = _b.sent();
                        if (span) {
                            this.tracingManager.addLog(span.spanId, 'error', 'Failed to search memories', {
                                error: error_5 instanceof Error ? error_5.message : String(error_5),
                            });
                            this.tracingManager.endSpan(span.spanId, tracing_ts_1.SpanStatus.ERROR);
                        }
                        console.error('Error searching memories:', error_5);
                        return [2 /*return*/, []];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    BaseAgent.prototype.consolidateUserMemories = function () {
        return __awaiter(this, void 0, void 0, function () {
            var consolidatedCount, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.userId || !(0, index_ts_1.getFeatureFlag)('ENABLE_MEMORY_SYSTEM')) {
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, this.callDatabaseFunction('consolidate_user_memories', {
                                p_user_id: this.userId,
                            })];
                    case 2:
                        consolidatedCount = _a.sent();
                        if (!(consolidatedCount > 0)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.logAgentActivity('memory_consolidation', 'info', "Consolidated ".concat(consolidatedCount, " memories to long-term storage"), { count: consolidatedCount })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        error_6 = _a.sent();
                        console.error('Error consolidating memories:', error_6);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    BaseAgent.prototype.applyMemoryDecay = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(0, index_ts_1.getFeatureFlag)('ENABLE_MEMORY_SYSTEM')) {
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.memoryManager.applyMemoryDecay()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_7 = _a.sent();
                        console.error('Error applying memory decay:', error_7);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    BaseAgent.prototype.getMemoryStats = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!(0, index_ts_1.getFeatureFlag)('ENABLE_MEMORY_SYSTEM')) {
                    return [2 /*return*/, {
                            shortTermCount: 0,
                            longTermCount: 0,
                            totalMemorySize: 0,
                            categoryCounts: {},
                        }];
                }
                return [2 /*return*/, this.memoryManager.getMemoryStats()];
            });
        });
    };
    // Enhanced process method to include memory context
    BaseAgent.prototype.processWithMemory = function (data, context, processFunction) {
        return __awaiter(this, void 0, void 0, function () {
            var memories, enhancedContext, result, _a, _i, _b, insight;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.loadMemoryContext((context === null || context === void 0 ? void 0 : context.taskId) || 'general')];
                    case 1:
                        memories = _c.sent();
                        enhancedContext = __assign(__assign({}, context), { memories: memories, memoryCount: memories.length });
                        if (!processFunction) return [3 /*break*/, 3];
                        return [4 /*yield*/, processFunction(data, enhancedContext, memories)];
                    case 2:
                        _a = _c.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, this.process(data, enhancedContext)];
                    case 4:
                        _a = _c.sent();
                        _c.label = 5;
                    case 5:
                        result = _a;
                        if (!(result.insights.length > 0)) return [3 /*break*/, 9];
                        _i = 0, _b = result.insights;
                        _c.label = 6;
                    case 6:
                        if (!(_i < _b.length)) return [3 /*break*/, 9];
                        insight = _b[_i];
                        if (!(insight.severity === 'high' || insight.severity === 'critical')) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.storeMemory("".concat(this.agentType, "_insight"), "".concat(insight.title, ": ").concat(insight.description), {
                                insight_type: insight.type,
                                severity: insight.severity,
                                actionable: insight.isActionable,
                                data: insight.data,
                            }, insight.severity === 'critical' ? 0.9 : 0.7)];
                    case 7:
                        _c.sent();
                        _c.label = 8;
                    case 8:
                        _i++;
                        return [3 /*break*/, 6];
                    case 9:
                        if (!(Math.random() < 0.1)) return [3 /*break*/, 11];
                        return [4 /*yield*/, this.consolidateUserMemories()];
                    case 10:
                        _c.sent();
                        _c.label = 11;
                    case 11: return [2 /*return*/, result];
                }
            });
        });
    };
    return BaseAgent;
}());
exports.BaseAgent = BaseAgent;
