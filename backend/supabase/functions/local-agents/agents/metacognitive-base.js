"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.MetacognitiveBaseAgent = void 0;
var base_ts_1 = require("./base.ts");
var metacognitive_ts_1 = require("./metacognitive.ts");
var MetacognitiveBaseAgent = /** @class */ (function (_super) {
    __extends(MetacognitiveBaseAgent, _super);
    function MetacognitiveBaseAgent(supabase, enterpriseId) {
        var _this = _super.call(this, supabase, enterpriseId) || this;
        _this.metacognitionEnabled = true;
        _this.recentPerformance = [];
        _this.availableStrategies = [];
        _this.metacognition = new metacognitive_ts_1.MetacognitiveLayer(supabase, enterpriseId, _this.agentType);
        _this.initializeStrategies();
        return _this;
    }
    // Enhanced process method with metacognitive monitoring
    MetacognitiveBaseAgent.prototype.process = function (data, context) {
        return __awaiter(this, void 0, void 0, function () {
            var processId, startTime, checkpoints, _a, selectedStrategy, initialConfidence, result, processingTime, finalConfidence, calibration, learningOptimization, selfReflection, monitoringResult, enhancedResult, error_1, errorInsight, _b;
            var _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!this.metacognitionEnabled) {
                            // Fall back to standard processing
                            return [2 /*return*/, _super.prototype.process.call(this, data, context)];
                        }
                        processId = this.generateProcessId();
                        startTime = Date.now();
                        checkpoints = [];
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 10, , 14]);
                        // Step 1: Introspect current cognitive state
                        _a = this;
                        return [4 /*yield*/, this.metacognition.introspectThinking(data, this.availableStrategies, this.recentPerformance)];
                    case 2:
                        // Step 1: Introspect current cognitive state
                        _a.currentCognitiveState = _e.sent();
                        // Log cognitive state
                        this.logCognitiveState(processId, this.currentCognitiveState);
                        return [4 /*yield*/, this.metacognition.selectReasoningStrategy(data, this.availableStrategies, this.currentCognitiveState, context === null || context === void 0 ? void 0 : context.timeConstraint)];
                    case 3:
                        selectedStrategy = _e.sent();
                        initialConfidence = this.assessInitialConfidence(data, this.currentCognitiveState);
                        return [4 /*yield*/, this.processWithStrategy(data, context, selectedStrategy, processId, checkpoints)];
                    case 4:
                        result = _e.sent();
                        processingTime = Date.now() - startTime;
                        finalConfidence = result.confidence;
                        return [4 /*yield*/, this.metacognition.calibrateConfidence(result.result, data.expectedResult || null, initialConfidence, finalConfidence, processingTime)];
                    case 5:
                        calibration = _e.sent();
                        return [4 /*yield*/, this.metacognition.optimizeLearningProcess(this.getLearningHistory(), result.success ? 1 : 0)];
                    case 6:
                        learningOptimization = _e.sent();
                        return [4 /*yield*/, this.metacognition.generateSelfReflection(this.getTaskHistory(), this.getPerformanceMetrics())];
                    case 7:
                        selfReflection = _e.sent();
                        // Step 9: Update performance tracking
                        this.updatePerformanceTracking(result.success ? finalConfidence : 0);
                        return [4 /*yield*/, this.metacognition.monitorCognitiveProcess(processId, checkpoints)];
                    case 8:
                        monitoringResult = _e.sent();
                        enhancedResult = __assign(__assign({}, result), { metacognitive: {
                                cognitiveState: this.currentCognitiveState,
                                strategyUsed: selectedStrategy,
                                calibration: calibration,
                                insights: learningOptimization.metacognitiveInsights,
                                selfReflection: selfReflection,
                                processingMonitor: __assign(__assign({}, monitoringResult), { processingTime: processingTime, checkpointCount: checkpoints.length }),
                            } });
                        // Apply learning optimizations
                        return [4 /*yield*/, this.applyLearningOptimizations(learningOptimization)];
                    case 9:
                        // Apply learning optimizations
                        _e.sent();
                        return [2 /*return*/, enhancedResult];
                    case 10:
                        error_1 = _e.sent();
                        return [4 /*yield*/, this.handleErrorWithMetacognition(error_1, processId)];
                    case 11:
                        errorInsight = _e.sent();
                        _c = {
                            success: false,
                            result: null,
                            insights: [errorInsight],
                            rulesApplied: [],
                            confidence: 0,
                            metadata: { error: error_1 instanceof Error ? error_1.message : String(error_1) }
                        };
                        _d = {};
                        _b = this.currentCognitiveState;
                        if (_b) return [3 /*break*/, 13];
                        return [4 /*yield*/, this.getDefaultCognitiveState()];
                    case 12:
                        _b = (_e.sent());
                        _e.label = 13;
                    case 13: return [2 /*return*/, (_c.metacognitive = (_d.cognitiveState = _b,
                            _d.strategyUsed = this.getDefaultStrategy(),
                            _d.calibration = {
                                initialConfidence: 0.5,
                                finalConfidence: 0,
                                actualAccuracy: 0,
                                calibrationError: 0.5,
                                isWellCalibrated: false,
                                adjustmentNeeded: -0.5,
                            },
                            _d.insights = [{
                                    type: 'learning_opportunity',
                                    description: 'Error encountered during processing',
                                    impact: 0.9,
                                    recommendation: 'Analyze error patterns to improve robustness',
                                }],
                            _d),
                            _c)];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    // Process with specific strategy and monitoring
    MetacognitiveBaseAgent.prototype.processWithStrategy = function (data, context, strategy, processId, checkpoints) {
        return __awaiter(this, void 0, void 0, function () {
            var createCheckpoint, result, _a;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        createCheckpoint = function (stage, score) {
                            var _a;
                            checkpoints.push({
                                stage: stage,
                                score: score,
                                confidence: ((_a = _this.currentCognitiveState) === null || _a === void 0 ? void 0 : _a.confidence) || 0.5,
                                timestamp: Date.now(),
                                strategy: strategy.name,
                            });
                        };
                        createCheckpoint('start', 0);
                        _a = strategy.type;
                        switch (_a) {
                            case 'analytical': return [3 /*break*/, 1];
                            case 'heuristic': return [3 /*break*/, 3];
                            case 'intuitive': return [3 /*break*/, 5];
                            case 'hybrid': return [3 /*break*/, 7];
                        }
                        return [3 /*break*/, 9];
                    case 1: return [4 /*yield*/, this.processAnalytically(data, context, createCheckpoint)];
                    case 2:
                        result = _b.sent();
                        return [3 /*break*/, 11];
                    case 3: return [4 /*yield*/, this.processHeuristically(data, context, createCheckpoint)];
                    case 4:
                        result = _b.sent();
                        return [3 /*break*/, 11];
                    case 5: return [4 /*yield*/, this.processIntuitively(data, context, createCheckpoint)];
                    case 6:
                        result = _b.sent();
                        return [3 /*break*/, 11];
                    case 7: return [4 /*yield*/, this.processHybrid(data, context, createCheckpoint)];
                    case 8:
                        result = _b.sent();
                        return [3 /*break*/, 11];
                    case 9: return [4 /*yield*/, _super.prototype.process.call(this, data, context)];
                    case 10:
                        // Fall back to standard processing
                        result = _b.sent();
                        _b.label = 11;
                    case 11:
                        createCheckpoint('complete', result.success ? 1 : 0);
                        return [2 /*return*/, result];
                }
            });
        });
    };
    // Strategy-specific processing methods (to be overridden by subclasses)
    MetacognitiveBaseAgent.prototype.processAnalytically = function (data, context, checkpoint) {
        return __awaiter(this, void 0, void 0, function () {
            var components, componentResults, synthesized;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Default analytical processing
                        checkpoint('analysis_start', 0.2);
                        components = this.decomposeAnalytically(data);
                        checkpoint('decomposition_complete', 0.4);
                        return [4 /*yield*/, Promise.all(components.map(function (c) { return _this.processComponent(c, context); }))];
                    case 1:
                        componentResults = _a.sent();
                        checkpoint('components_processed', 0.7);
                        synthesized = this.synthesizeResults(componentResults);
                        checkpoint('synthesis_complete', 0.9);
                        return [2 /*return*/, synthesized];
                }
            });
        });
    };
    MetacognitiveBaseAgent.prototype.processHeuristically = function (data, context, checkpoint) {
        return __awaiter(this, void 0, void 0, function () {
            var heuristicResult, validated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Default heuristic processing
                        checkpoint('heuristic_start', 0.2);
                        return [4 /*yield*/, this.applyHeuristics(data, context)];
                    case 1:
                        heuristicResult = _a.sent();
                        checkpoint('heuristics_applied', 0.6);
                        validated = this.validateHeuristic(heuristicResult);
                        checkpoint('validation_complete', 0.9);
                        return [2 /*return*/, validated];
                }
            });
        });
    };
    MetacognitiveBaseAgent.prototype.processIntuitively = function (data, context, checkpoint) {
        return __awaiter(this, void 0, void 0, function () {
            var patterns, assessment;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Default intuitive processing
                        checkpoint('intuition_start', 0.2);
                        return [4 /*yield*/, this.matchPatterns(data, context)];
                    case 1:
                        patterns = _a.sent();
                        checkpoint('pattern_matching_complete', 0.5);
                        assessment = this.intuitiveAssessment(patterns);
                        checkpoint('assessment_complete', 0.9);
                        return [2 /*return*/, assessment];
                }
            });
        });
    };
    MetacognitiveBaseAgent.prototype.processHybrid = function (data, context, checkpoint) {
        return __awaiter(this, void 0, void 0, function () {
            var intuitive, analytical, combined;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Combine multiple strategies
                        checkpoint('hybrid_start', 0.1);
                        return [4 /*yield*/, this.processIntuitively(data, context, function () { })];
                    case 1:
                        intuitive = _a.sent();
                        checkpoint('intuitive_complete', 0.3);
                        // If high confidence, return early
                        if (intuitive.confidence > 0.9) {
                            return [2 /*return*/, intuitive];
                        }
                        return [4 /*yield*/, this.processAnalytically(data, context, function () { })];
                    case 2:
                        analytical = _a.sent();
                        checkpoint('analytical_complete', 0.7);
                        combined = this.combineResults(intuitive, analytical);
                        checkpoint('combination_complete', 0.9);
                        return [2 /*return*/, combined];
                }
            });
        });
    };
    // Helper methods for metacognitive processing
    MetacognitiveBaseAgent.prototype.assessInitialConfidence = function (data, cognitiveState) {
        // Base confidence on cognitive state and data complexity
        var complexityFactor = this.assessDataComplexity(data);
        var stateFactor = cognitiveState.confidence;
        var uncertaintyPenalty = cognitiveState.uncertainty * 0.3;
        var initialConfidence = (stateFactor * 0.7 + (1 - complexityFactor) * 0.3) - uncertaintyPenalty;
        return Math.max(0.1, Math.min(0.9, initialConfidence));
    };
    MetacognitiveBaseAgent.prototype.updatePerformanceTracking = function (performance) {
        this.recentPerformance.push(performance);
        // Keep only recent performance (last 20)
        if (this.recentPerformance.length > 20) {
            this.recentPerformance.shift();
        }
    };
    MetacognitiveBaseAgent.prototype.applyLearningOptimizations = function (optimization) {
        return __awaiter(this, void 0, void 0, function () {
            var _loop_1, this_1, _i, _a, _b, strategyName, adjustment;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _loop_1 = function (strategyName, adjustment) {
                            var strategy = this_1.availableStrategies.find(function (s) { return s.name === strategyName; });
                            if (strategy) {
                                strategy.expectedAccuracy = Math.max(0, Math.min(1, strategy.expectedAccuracy + adjustment));
                            }
                        };
                        this_1 = this;
                        // Update strategy preferences
                        for (_i = 0, _a = optimization.strategyUpdates; _i < _a.length; _i++) {
                            _b = _a[_i], strategyName = _b[0], adjustment = _b[1];
                            _loop_1(strategyName, adjustment);
                        }
                        if (!(Math.abs(optimization.learningRateAdjustment - 1) > 0.1)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.adjustLearningRate(optimization.learningRateAdjustment)];
                    case 1:
                        _c.sent();
                        _c.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    MetacognitiveBaseAgent.prototype.handleErrorWithMetacognition = function (error, processId) {
        return __awaiter(this, void 0, void 0, function () {
            var errorAnalysis;
            return __generator(this, function (_a) {
                errorAnalysis = this.analyzeError(error);
                // Create learning insight from error
                return [2 /*return*/, this.createInsight('error_learning', 'high', 'Processing Error Encountered', "Error during ".concat(this.agentType, " processing: ").concat(error.message), null, {
                        errorType: errorAnalysis.type,
                        errorContext: errorAnalysis.context,
                        recommendedStrategy: errorAnalysis.recommendedStrategy,
                        processId: processId,
                    }, false)];
            });
        });
    };
    // Utility methods
    MetacognitiveBaseAgent.prototype.generateProcessId = function () {
        return "".concat(this.agentType, "_").concat(Date.now(), "_").concat(Math.random().toString(36).substring(7));
    };
    MetacognitiveBaseAgent.prototype.logCognitiveState = function (processId, state) {
        if (this.config.debugMode) {
            console.log("[".concat(processId, "] Cognitive State:"), {
                confidence: state.confidence.toFixed(2),
                uncertainty: state.uncertainty.toFixed(2),
                cognitiveLoad: state.cognitiveLoad.toFixed(2),
                activeStrategies: state.activeStrategies,
            });
        }
    };
    MetacognitiveBaseAgent.prototype.getLearningHistory = function () {
        // Override in subclasses to provide specific learning history
        return [];
    };
    MetacognitiveBaseAgent.prototype.getTaskHistory = function () {
        // Override in subclasses to provide specific task history
        return [];
    };
    MetacognitiveBaseAgent.prototype.getPerformanceMetrics = function () {
        return {
            recentPerformance: this.recentPerformance,
            averageConfidence: this.recentPerformance.reduce(function (a, b) { return a + b; }, 0) /
                (this.recentPerformance.length || 1),
            successRate: this.recentPerformance.filter(function (p) { return p > 0.5; }).length /
                (this.recentPerformance.length || 1),
        };
    };
    MetacognitiveBaseAgent.prototype.getDefaultCognitiveState = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {
                        confidence: 0.5,
                        uncertainty: 0.5,
                        cognitiveLoad: 0.5,
                        strategyEffectiveness: 0.5,
                        activeStrategies: [],
                        performanceMetrics: {
                            accuracy: 0.5,
                            speed: 0.5,
                            efficiency: 0.5,
                        },
                    }];
            });
        });
    };
    MetacognitiveBaseAgent.prototype.getDefaultStrategy = function () {
        return this.availableStrategies[0] || {
            name: 'default',
            type: 'analytical',
            complexity: 0.5,
            expectedAccuracy: 0.7,
            expectedSpeed: 0.5,
            contextualFit: 0.5,
        };
    };
    return MetacognitiveBaseAgent;
}(base_ts_1.BaseAgent));
exports.MetacognitiveBaseAgent = MetacognitiveBaseAgent;
