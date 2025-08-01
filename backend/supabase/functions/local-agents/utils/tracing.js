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
exports.TraceContextPropagator = exports.TracingManager = exports.SpanKind = exports.SpanStatus = void 0;
exports.traced = traced;
var uuid_9_0_1_1 = require("https://esm.sh/uuid@9.0.1");
var SpanStatus;
(function (SpanStatus) {
    SpanStatus[SpanStatus["OK"] = 0] = "OK";
    SpanStatus[SpanStatus["ERROR"] = 1] = "ERROR";
    SpanStatus[SpanStatus["CANCELLED"] = 2] = "CANCELLED";
})(SpanStatus || (exports.SpanStatus = SpanStatus = {}));
var SpanKind;
(function (SpanKind) {
    SpanKind[SpanKind["INTERNAL"] = 0] = "INTERNAL";
    SpanKind[SpanKind["SERVER"] = 1] = "SERVER";
    SpanKind[SpanKind["CLIENT"] = 2] = "CLIENT";
    SpanKind[SpanKind["PRODUCER"] = 3] = "PRODUCER";
    SpanKind[SpanKind["CONSUMER"] = 4] = "CONSUMER";
})(SpanKind || (exports.SpanKind = SpanKind = {}));
var TracingManager = /** @class */ (function () {
    function TracingManager(supabase, enterpriseId) {
        this.spans = new Map();
        this.activeSpans = new Map();
        this.batchSize = 100;
        this.batchInterval = 5000; // 5 seconds
        this.pendingSpans = [];
        this.supabase = supabase;
        this.enterpriseId = enterpriseId;
        this.startBatchProcessor();
    }
    /**
     * Create a new trace context
     */
    TracingManager.prototype.createTraceContext = function (parentContext) {
        if (parentContext) {
            return {
                traceId: parentContext.traceId,
                spanId: this.generateSpanId(),
                parentSpanId: parentContext.spanId,
                baggage: __assign({}, parentContext.baggage),
                flags: parentContext.flags,
            };
        }
        return {
            traceId: this.generateTraceId(),
            spanId: this.generateSpanId(),
            baggage: {},
            flags: 1, // Sampled
        };
    };
    /**
     * Start a new span
     */
    TracingManager.prototype.startSpan = function (operationName, context, serviceName, kind) {
        if (kind === void 0) { kind = SpanKind.INTERNAL; }
        var span = {
            traceId: context.traceId,
            spanId: context.spanId,
            parentSpanId: context.parentSpanId,
            operationName: operationName,
            serviceName: serviceName,
            startTime: Date.now(),
            tags: {
                'enterprise.id': this.enterpriseId,
                'span.kind': SpanKind[kind],
            },
            logs: [],
            status: SpanStatus.OK,
            kind: kind,
        };
        this.activeSpans.set(span.spanId, span);
        return span;
    };
    /**
     * End a span
     */
    TracingManager.prototype.endSpan = function (spanId, status) {
        if (status === void 0) { status = SpanStatus.OK; }
        var span = this.activeSpans.get(spanId);
        if (!span) {
            return;
        }
        span.endTime = Date.now();
        span.duration = span.endTime - span.startTime;
        span.status = status;
        this.activeSpans.delete(spanId);
        this.spans.set(spanId, span);
        this.pendingSpans.push(span);
        // Trigger batch processing if we hit the batch size
        if (this.pendingSpans.length >= this.batchSize) {
            this.flushSpans();
        }
    };
    /**
     * Add tags to a span
     */
    TracingManager.prototype.addTags = function (spanId, tags) {
        var span = this.activeSpans.get(spanId) || this.spans.get(spanId);
        if (span) {
            span.tags = __assign(__assign({}, span.tags), tags);
        }
    };
    /**
     * Add a log entry to a span
     */
    TracingManager.prototype.addLog = function (spanId, level, message, fields) {
        var span = this.activeSpans.get(spanId) || this.spans.get(spanId);
        if (span) {
            span.logs.push({
                timestamp: Date.now(),
                level: level,
                message: message,
                fields: fields,
            });
        }
    };
    /**
     * Extract trace context from headers
     */
    TracingManager.prototype.extractTraceContext = function (headers) {
        var traceHeader = headers.get('X-Trace-ID');
        var spanHeader = headers.get('X-Span-ID');
        var parentSpanHeader = headers.get('X-Parent-Span-ID');
        var baggageHeader = headers.get('X-Trace-Baggage');
        if (!traceHeader || !spanHeader) {
            return null;
        }
        return {
            traceId: traceHeader,
            spanId: spanHeader,
            parentSpanId: parentSpanHeader || undefined,
            baggage: baggageHeader ? JSON.parse(baggageHeader) : {},
            flags: 1,
        };
    };
    /**
     * Inject trace context into headers
     */
    TracingManager.prototype.injectTraceContext = function (context, headers) {
        headers.set('X-Trace-ID', context.traceId);
        headers.set('X-Span-ID', context.spanId);
        if (context.parentSpanId) {
            headers.set('X-Parent-Span-ID', context.parentSpanId);
        }
        if (context.baggage && Object.keys(context.baggage).length > 0) {
            headers.set('X-Trace-Baggage', JSON.stringify(context.baggage));
        }
    };
    /**
     * Get current trace for a trace ID
     */
    TracingManager.prototype.getTrace = function (traceId) {
        return __awaiter(this, void 0, void 0, function () {
            var memorySpans, dbSpans, allSpans;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        memorySpans = Array.from(this.spans.values())
                            .filter(function (span) { return span.traceId === traceId; });
                        return [4 /*yield*/, this.supabase
                                .from('trace_spans')
                                .select('*')
                                .eq('trace_id', traceId)
                                .eq('enterprise_id', this.enterpriseId)];
                    case 1:
                        dbSpans = (_a.sent()).data;
                        allSpans = __spreadArray([], memorySpans, true);
                        if (dbSpans) {
                            dbSpans.forEach(function (dbSpan) {
                                if (!allSpans.find(function (s) { return s.spanId === dbSpan.span_id; })) {
                                    allSpans.push(_this.deserializeSpan(dbSpan));
                                }
                            });
                        }
                        return [2 /*return*/, allSpans.sort(function (a, b) { return a.startTime - b.startTime; })];
                }
            });
        });
    };
    /**
     * Create a child span context
     */
    TracingManager.prototype.createChildContext = function (parentContext) {
        return {
            traceId: parentContext.traceId,
            spanId: this.generateSpanId(),
            parentSpanId: parentContext.spanId,
            baggage: __assign({}, parentContext.baggage),
            flags: parentContext.flags,
        };
    };
    /**
     * Add baggage to trace context
     */
    TracingManager.prototype.addBaggage = function (context, key, value) {
        var _a;
        return __assign(__assign({}, context), { baggage: __assign(__assign({}, context.baggage), (_a = {}, _a[key] = value, _a)) });
    };
    /**
     * Flush pending spans to database
     */
    TracingManager.prototype.flushSpans = function () {
        return __awaiter(this, void 0, void 0, function () {
            var spansToFlush, serializedSpans, cutoffTime, _i, _a, _b, spanId, span, error_1;
            var _c;
            var _this = this;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (this.pendingSpans.length === 0) {
                            return [2 /*return*/];
                        }
                        spansToFlush = __spreadArray([], this.pendingSpans, true);
                        this.pendingSpans = [];
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        serializedSpans = spansToFlush.map(function (span) { return ({
                            span_id: span.spanId,
                            trace_id: span.traceId,
                            parent_span_id: span.parentSpanId,
                            operation_name: span.operationName,
                            service_name: span.serviceName,
                            start_time: new Date(span.startTime).toISOString(),
                            end_time: span.endTime ? new Date(span.endTime).toISOString() : null,
                            duration_ms: span.duration,
                            status: span.status,
                            kind: span.kind,
                            tags: span.tags,
                            logs: span.logs,
                            enterprise_id: _this.enterpriseId,
                        }); });
                        return [4 /*yield*/, this.supabase
                                .from('trace_spans')
                                .insert(serializedSpans)];
                    case 2:
                        _d.sent();
                        cutoffTime = Date.now() - 3600000;
                        for (_i = 0, _a = this.spans; _i < _a.length; _i++) {
                            _b = _a[_i], spanId = _b[0], span = _b[1];
                            if (span.endTime && span.endTime < cutoffTime) {
                                this.spans.delete(spanId);
                            }
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _d.sent();
                        console.error('Failed to flush spans:', error_1);
                        // Re-add spans to pending list for retry
                        (_c = this.pendingSpans).unshift.apply(_c, spansToFlush);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Start batch processor
     */
    TracingManager.prototype.startBatchProcessor = function () {
        var _this = this;
        this.batchTimer = setInterval(function () {
            _this.flushSpans();
        }, this.batchInterval);
    };
    /**
     * Stop batch processor
     */
    TracingManager.prototype.stopBatchProcessor = function () {
        if (this.batchTimer) {
            clearInterval(this.batchTimer);
            this.flushSpans(); // Final flush
        }
    };
    /**
     * Generate a new trace ID
     */
    TracingManager.prototype.generateTraceId = function () {
        return (0, uuid_9_0_1_1.v4)().replace(/-/g, '');
    };
    /**
     * Generate a new span ID
     */
    TracingManager.prototype.generateSpanId = function () {
        return (0, uuid_9_0_1_1.v4)().replace(/-/g, '').substring(0, 16);
    };
    /**
     * Deserialize span from database
     */
    TracingManager.prototype.deserializeSpan = function (dbSpan) {
        return {
            traceId: dbSpan.trace_id,
            spanId: dbSpan.span_id,
            parentSpanId: dbSpan.parent_span_id,
            operationName: dbSpan.operation_name,
            serviceName: dbSpan.service_name,
            startTime: new Date(dbSpan.start_time).getTime(),
            endTime: dbSpan.end_time ? new Date(dbSpan.end_time).getTime() : undefined,
            duration: dbSpan.duration_ms,
            tags: dbSpan.tags,
            logs: dbSpan.logs,
            status: dbSpan.status,
            kind: dbSpan.kind,
        };
    };
    return TracingManager;
}());
exports.TracingManager = TracingManager;
/**
 * Trace context propagation helper
 */
var TraceContextPropagator = /** @class */ (function () {
    function TraceContextPropagator() {
    }
    TraceContextPropagator.inject = function (context) {
        return {
            'x-trace-id': context.traceId,
            'x-span-id': context.spanId,
            'x-parent-span-id': context.parentSpanId || '',
            'x-trace-flags': context.flags.toString(),
            'x-trace-baggage': JSON.stringify(context.baggage || {}),
        };
    };
    TraceContextPropagator.extract = function (headers) {
        var traceId = headers['x-trace-id'];
        var spanId = headers['x-span-id'];
        if (!traceId || !spanId) {
            return null;
        }
        return {
            traceId: traceId,
            spanId: spanId,
            parentSpanId: headers['x-parent-span-id'] || undefined,
            flags: parseInt(headers['x-trace-flags'] || '1'),
            baggage: headers['x-trace-baggage'] ? JSON.parse(headers['x-trace-baggage']) : {},
        };
    };
    return TraceContextPropagator;
}());
exports.TraceContextPropagator = TraceContextPropagator;
/**
 * Decorator for automatic span creation
 */
function traced(operationName) {
    return function (target, propertyKey, descriptor) {
        var originalMethod = descriptor.value;
        descriptor.value = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return __awaiter(this, void 0, void 0, function () {
                var context, tracingManager, spanContext, span, result, error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            context = this.traceContext;
                            tracingManager = this.tracingManager;
                            if (!context || !tracingManager) {
                                return [2 /*return*/, originalMethod.apply(this, args)];
                            }
                            spanContext = tracingManager.createChildContext(context);
                            span = tracingManager.startSpan(operationName || "".concat(target.constructor.name, ".").concat(propertyKey), spanContext, target.constructor.name, SpanKind.INTERNAL);
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, originalMethod.apply(this, args)];
                        case 2:
                            result = _a.sent();
                            tracingManager.endSpan(span.spanId, SpanStatus.OK);
                            return [2 /*return*/, result];
                        case 3:
                            error_2 = _a.sent();
                            tracingManager.addLog(span.spanId, 'error', error_2 instanceof Error ? error_2.message : String(error_2), {
                                stack: error_2 instanceof Error ? error_2.stack : undefined
                            });
                            tracingManager.endSpan(span.spanId, SpanStatus.ERROR);
                            throw error_2;
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        return descriptor;
    };
}
