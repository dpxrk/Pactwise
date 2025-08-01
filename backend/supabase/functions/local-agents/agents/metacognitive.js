"use strict";
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
exports.MetacognitiveLayer = void 0;
var MetacognitiveLayer = /** @class */ (function () {
    function MetacognitiveLayer(supabase, enterpriseId, agentType) {
        this.performanceHistory = new Map();
        this.strategyPerformance = new Map();
        this.confidenceCalibrationHistory = [];
        this.supabase = supabase;
        this.enterpriseId = enterpriseId;
        this.agentType = agentType;
    }
    // Assess the current cognitive state
    MetacognitiveLayer.prototype.introspectThinking = function (currentTask, availableStrategies, recentPerformance) {
        return __awaiter(this, void 0, void 0, function () {
            var confidence, uncertainty, cognitiveLoad, strategyEffectiveness, activeStrategies, performanceMetrics;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        confidence = this.calculateConfidence(recentPerformance);
                        return [4 /*yield*/, this.assessUncertainty(currentTask)];
                    case 1:
                        uncertainty = _a.sent();
                        cognitiveLoad = this.calculateCognitiveLoad(currentTask, availableStrategies);
                        strategyEffectiveness = this.evaluateStrategyEffectiveness(availableStrategies);
                        activeStrategies = this.selectActiveStrategies(availableStrategies, currentTask, cognitiveLoad);
                        performanceMetrics = this.calculatePerformanceMetrics(recentPerformance);
                        return [2 /*return*/, {
                                confidence: confidence,
                                uncertainty: uncertainty,
                                cognitiveLoad: cognitiveLoad,
                                strategyEffectiveness: strategyEffectiveness,
                                activeStrategies: activeStrategies.map(function (s) { return s.name; }),
                                performanceMetrics: performanceMetrics,
                            }];
                }
            });
        });
    };
    // Select the best reasoning strategy based on metacognitive analysis
    MetacognitiveLayer.prototype.selectReasoningStrategy = function (problem, availableStrategies, cognitiveState, timeConstraint) {
        return __awaiter(this, void 0, void 0, function () {
            var problemCharacteristics, scoredStrategies, shouldExplore;
            var _this = this;
            return __generator(this, function (_a) {
                problemCharacteristics = this.analyzeProblem(problem);
                scoredStrategies = availableStrategies.map(function (strategy) {
                    var score = _this.scoreStrategy(strategy, problemCharacteristics, cognitiveState, timeConstraint);
                    return { strategy: strategy, score: score };
                });
                // Sort by score and select best
                scoredStrategies.sort(function (a, b) { return b.score - a.score; });
                shouldExplore = Math.random() < this.calculateExplorationRate(cognitiveState);
                if (shouldExplore && scoredStrategies.length > 1) {
                    // Occasionally try second-best strategy for learning
                    return [2 /*return*/, scoredStrategies[1].strategy];
                }
                return [2 /*return*/, scoredStrategies[0].strategy];
            });
        });
    };
    // Calibrate confidence based on actual vs expected performance
    MetacognitiveLayer.prototype.calibrateConfidence = function (prediction, actual, initialConfidence, finalConfidence, processingTime) {
        return __awaiter(this, void 0, void 0, function () {
            var actualAccuracy, calibrationError, calibrationThreshold, isWellCalibrated, adjustmentNeeded, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        actualAccuracy = this.calculateAccuracy(prediction, actual);
                        calibrationError = Math.abs(finalConfidence - actualAccuracy);
                        calibrationThreshold = 0.1;
                        isWellCalibrated = calibrationError < calibrationThreshold;
                        adjustmentNeeded = actualAccuracy - finalConfidence;
                        result = {
                            initialConfidence: initialConfidence,
                            finalConfidence: finalConfidence,
                            actualAccuracy: actualAccuracy,
                            calibrationError: calibrationError,
                            isWellCalibrated: isWellCalibrated,
                            adjustmentNeeded: adjustmentNeeded,
                        };
                        // Store calibration history
                        this.confidenceCalibrationHistory.push(result);
                        if (!!isWellCalibrated) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.updateCalibrationModel(result)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/, result];
                }
            });
        });
    };
    // Learn how to learn better - meta-learning optimization
    MetacognitiveLayer.prototype.optimizeLearningProcess = function (learningHistory, currentPerformance) {
        return __awaiter(this, void 0, void 0, function () {
            var learningTrajectory, learningPatterns, learningRateAdjustment, strategyUpdates, metacognitiveInsights;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        learningTrajectory = this.analyzeLearningTrajectory(learningHistory);
                        learningPatterns = this.identifyLearningPatterns(learningHistory);
                        learningRateAdjustment = this.calculateLearningRateAdjustment(learningTrajectory, currentPerformance);
                        strategyUpdates = this.updateStrategyPreferences(learningHistory);
                        metacognitiveInsights = this.generateMetacognitiveInsights(learningPatterns, learningTrajectory, currentPerformance);
                        // Persist learning optimizations
                        return [4 /*yield*/, this.persistLearningOptimizations({
                                learningRateAdjustment: learningRateAdjustment,
                                strategyUpdates: strategyUpdates,
                                insights: metacognitiveInsights,
                            })];
                    case 1:
                        // Persist learning optimizations
                        _a.sent();
                        return [2 /*return*/, {
                                learningRateAdjustment: learningRateAdjustment,
                                strategyUpdates: strategyUpdates,
                                metacognitiveInsights: metacognitiveInsights,
                            }];
                }
            });
        });
    };
    // Monitor and evaluate ongoing cognitive processes
    MetacognitiveLayer.prototype.monitorCognitiveProcess = function (processId, checkpoints) {
        return __awaiter(this, void 0, void 0, function () {
            var progression, isStuck, isDiverging, confidenceTrajectory, shouldContinue, shouldAdjustStrategy, recommendedAdjustment;
            var _this = this;
            return __generator(this, function (_a) {
                progression = this.analyzeProgression(checkpoints);
                isStuck = this.detectIfStuck(progression);
                isDiverging = this.detectIfDiverging(progression);
                confidenceTrajectory = checkpoints.map(function (cp) {
                    return _this.calculateCheckpointConfidence(cp);
                });
                shouldContinue = !isStuck && !isDiverging && progression.momentum > 0;
                shouldAdjustStrategy = isStuck || isDiverging || progression.efficiency < 0.5;
                if (shouldAdjustStrategy) {
                    recommendedAdjustment = this.recommendStrategyAdjustment(progression, isStuck, isDiverging);
                }
                return [2 /*return*/, {
                        shouldContinue: shouldContinue,
                        shouldAdjustStrategy: shouldAdjustStrategy,
                        recommendedAdjustment: recommendedAdjustment,
                        confidenceTrajectory: confidenceTrajectory,
                    }];
            });
        });
    };
    // Generate self-reflection report
    MetacognitiveLayer.prototype.generateSelfReflection = function (taskHistory, performanceMetrics) {
        return __awaiter(this, void 0, void 0, function () {
            var performancePatterns, strengths, weaknesses, improvementAreas, learningInsights, confidenceAssessment;
            return __generator(this, function (_a) {
                performancePatterns = this.analyzePerformancePatterns(taskHistory);
                strengths = this.identifyStrengths(performancePatterns);
                weaknesses = this.identifyWeaknesses(performancePatterns);
                improvementAreas = this.determineImprovementAreas(strengths, weaknesses, performanceMetrics);
                learningInsights = this.extractLearningInsights(taskHistory);
                confidenceAssessment = this.assessConfidenceCalibration();
                return [2 /*return*/, {
                        strengths: strengths,
                        weaknesses: weaknesses,
                        improvementAreas: improvementAreas,
                        learningInsights: learningInsights,
                        confidenceAssessment: confidenceAssessment,
                    }];
            });
        });
    };
    // Private helper methods
    MetacognitiveLayer.prototype.calculateConfidence = function (recentPerformance) {
        if (recentPerformance.length === 0) {
            return 0.5;
        }
        var avg = recentPerformance.reduce(function (a, b) { return a + b; }, 0) / recentPerformance.length;
        var variance = recentPerformance.reduce(function (sum, val) {
            return sum + Math.pow(val - avg, 2);
        }, 0) / recentPerformance.length;
        // Higher average and lower variance = higher confidence
        var confidence = avg * (1 - Math.min(variance, 0.5));
        return Math.max(0, Math.min(1, confidence));
    };
    MetacognitiveLayer.prototype.assessUncertainty = function (task) {
        return __awaiter(this, void 0, void 0, function () {
            var similarity, complexity, novelty, uncertainty;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findTaskSimilarity(task)];
                    case 1:
                        similarity = _a.sent();
                        complexity = this.calculateTaskComplexity(task);
                        novelty = 1 - similarity;
                        uncertainty = (novelty * 0.6 + complexity * 0.4);
                        return [2 /*return*/, Math.max(0, Math.min(1, uncertainty))];
                }
            });
        });
    };
    MetacognitiveLayer.prototype.calculateCognitiveLoad = function (task, strategies) {
        var taskComplexity = this.calculateTaskComplexity(task);
        var strategyComplexity = Math.max.apply(Math, strategies.map(function (s) { return s.complexity; }));
        return (taskComplexity + strategyComplexity) / 2;
    };
    MetacognitiveLayer.prototype.evaluateStrategyEffectiveness = function (strategies) {
        var totalScore = 0;
        for (var _i = 0, strategies_1 = strategies; _i < strategies_1.length; _i++) {
            var strategy = strategies_1[_i];
            var performance_1 = this.strategyPerformance.get(strategy.name);
            if (performance_1) {
                var successRate = performance_1.successes /
                    (performance_1.successes + performance_1.failures + 1);
                totalScore += successRate * strategy.expectedAccuracy;
            }
            else {
                totalScore += strategy.expectedAccuracy * 0.5; // Default for new strategies
            }
        }
        return strategies.length > 0 ? totalScore / strategies.length : 0;
    };
    MetacognitiveLayer.prototype.selectActiveStrategies = function (available, task, cognitiveLoad) {
        // Filter strategies based on cognitive load
        var maxComplexity = 1 - cognitiveLoad * 0.5;
        var suitable = available.filter(function (s) { return s.complexity <= maxComplexity; });
        // Sort by contextual fit and expected accuracy
        suitable.sort(function (a, b) {
            return (b.contextualFit * b.expectedAccuracy) - (a.contextualFit * a.expectedAccuracy);
        });
        // Select top strategies (max 3 for parallel processing)
        return suitable.slice(0, 3);
    };
    MetacognitiveLayer.prototype.calculatePerformanceMetrics = function (recentPerformance) {
        if (recentPerformance.length === 0) {
            return { accuracy: 0.5, speed: 0.5, efficiency: 0.5 };
        }
        var accuracy = recentPerformance.reduce(function (a, b) { return a + b; }, 0) / recentPerformance.length;
        // Speed based on performance trend (improving = faster)
        var trend = this.calculateTrend(recentPerformance);
        var speed = Math.max(0, Math.min(1, 0.5 + trend));
        // Efficiency combines accuracy and speed
        var efficiency = (accuracy * 0.7 + speed * 0.3);
        return { accuracy: accuracy, speed: speed, efficiency: efficiency };
    };
    MetacognitiveLayer.prototype.analyzeProblem = function (problem) {
        return {
            complexity: this.calculateTaskComplexity(problem),
            type: this.classifyProblemType(problem),
            constraints: this.extractConstraints(problem),
            requiredPrecision: this.assessRequiredPrecision(problem),
        };
    };
    MetacognitiveLayer.prototype.scoreStrategy = function (strategy, problemCharacteristics, cognitiveState, timeConstraint) {
        var score = 0;
        // Match strategy to problem type
        score += strategy.contextualFit * 0.3;
        // Consider expected accuracy
        score += strategy.expectedAccuracy * 0.3;
        // Factor in cognitive load
        var loadPenalty = Math.max(0, cognitiveState.cognitiveLoad - 0.7) * 0.5;
        score -= loadPenalty;
        // Time constraint consideration
        if (timeConstraint) {
            var speedScore = strategy.expectedSpeed / (timeConstraint / 1000);
            score += Math.min(speedScore, 1) * 0.2;
        }
        // Historical performance
        var historical = this.strategyPerformance.get(strategy.name);
        if (historical) {
            var successRate = historical.successes / (historical.successes + historical.failures + 1);
            score += successRate * 0.2;
        }
        return score;
    };
    MetacognitiveLayer.prototype.calculateExplorationRate = function (cognitiveState) {
        // Higher uncertainty = more exploration
        var uncertaintyFactor = cognitiveState.uncertainty * 0.3;
        // Lower confidence = more exploration
        var confidenceFactor = (1 - cognitiveState.confidence) * 0.2;
        // Base exploration rate
        var baseRate = 0.1;
        return Math.min(0.3, baseRate + uncertaintyFactor + confidenceFactor);
    };
    MetacognitiveLayer.prototype.calculateAccuracy = function (prediction, actual) {
        // Simplified accuracy calculation - implement based on your needs
        if (typeof prediction === 'boolean' && typeof actual === 'boolean') {
            return prediction === actual ? 1 : 0;
        }
        if (typeof prediction === 'number' && typeof actual === 'number') {
            var error = Math.abs(prediction - actual);
            var maxError = Math.max(Math.abs(prediction), Math.abs(actual));
            return maxError > 0 ? 1 - (error / maxError) : 1;
        }
        // Default for complex objects
        return 0.5;
    };
    MetacognitiveLayer.prototype.updateCalibrationModel = function (result) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.supabase.from('metacognitive_calibration').insert({
                            agent_type: this.agentType,
                            enterprise_id: this.enterpriseId,
                            calibration_result: result,
                            timestamp: new Date().toISOString(),
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MetacognitiveLayer.prototype.analyzeLearningTrajectory = function (history) {
        var performances = history.map(function (h) { return h.performance || 0; });
        return {
            trend: this.calculateTrend(performances),
            volatility: this.calculateVolatility(performances),
            plateauDetected: this.detectPlateau(performances),
            improvementRate: this.calculateImprovementRate(performances),
        };
    };
    MetacognitiveLayer.prototype.identifyLearningPatterns = function (history) {
        var patterns = [];
        // Fast initial learning followed by plateau
        if (this.detectFastStart(history)) {
            patterns.push({
                type: 'fast_start_plateau',
                description: 'Quick initial learning followed by performance plateau',
            });
        }
        // Slow steady improvement
        if (this.detectSteadyImprovement(history)) {
            patterns.push({
                type: 'steady_improvement',
                description: 'Consistent gradual performance improvement',
            });
        }
        // Breakthrough moments
        var breakthroughs = this.detectBreakthroughs(history);
        if (breakthroughs.length > 0) {
            patterns.push({
                type: 'breakthrough_learning',
                description: 'Sudden performance jumps at specific points',
                breakthroughs: breakthroughs,
            });
        }
        return patterns;
    };
    MetacognitiveLayer.prototype.calculateLearningRateAdjustment = function (trajectory, currentPerformance) {
        if (trajectory.plateauDetected && currentPerformance > 0.8) {
            // Reduce learning rate if plateaued at high performance
            return 0.5;
        }
        if (trajectory.volatility > 0.3) {
            // Reduce learning rate if too volatile
            return 0.7;
        }
        if (trajectory.improvementRate < 0.01) {
            // Increase learning rate if improvement too slow
            return 1.5;
        }
        return 1.0; // No adjustment
    };
    MetacognitiveLayer.prototype.updateStrategyPreferences = function (history) {
        var updates = new Map();
        for (var _i = 0, history_1 = history; _i < history_1.length; _i++) {
            var entry = history_1[_i];
            if (entry.strategy && entry.performance !== undefined) {
                var current = updates.get(entry.strategy) || 0;
                var adjustment = entry.performance > 0.7 ? 0.1 : -0.05;
                updates.set(entry.strategy, current + adjustment);
            }
        }
        return updates;
    };
    MetacognitiveLayer.prototype.generateMetacognitiveInsights = function (patterns, trajectory, currentPerformance) {
        var insights = [];
        // Confidence calibration insight
        if (this.confidenceCalibrationHistory.length > 10) {
            var avgCalibrationError = this.confidenceCalibrationHistory
                .slice(-10)
                .reduce(function (sum, r) { return sum + r.calibrationError; }, 0) / 10;
            if (avgCalibrationError > 0.15) {
                insights.push({
                    type: 'confidence_adjustment',
                    description: 'Confidence levels consistently misaligned with actual performance',
                    impact: 0.8,
                    recommendation: "Adjust confidence by ".concat(-avgCalibrationError.toFixed(2), " to improve calibration"),
                });
            }
        }
        // Strategy recommendation insight
        if (trajectory.plateauDetected && currentPerformance < 0.8) {
            insights.push({
                type: 'strategy_recommendation',
                description: 'Performance plateau detected below optimal level',
                impact: 0.9,
                recommendation: 'Try alternative reasoning strategies or increase exploration rate',
            });
        }
        // Learning opportunity insight
        for (var _i = 0, patterns_1 = patterns; _i < patterns_1.length; _i++) {
            var pattern = patterns_1[_i];
            if (pattern.type === 'breakthrough_learning') {
                insights.push({
                    type: 'learning_opportunity',
                    description: 'Breakthrough pattern detected in learning history',
                    impact: 0.7,
                    recommendation: 'Analyze conditions that led to breakthroughs and replicate',
                });
            }
        }
        return insights;
    };
    MetacognitiveLayer.prototype.persistLearningOptimizations = function (optimizations) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.supabase.from('metacognitive_optimizations').insert({
                            agent_type: this.agentType,
                            enterprise_id: this.enterpriseId,
                            optimizations: optimizations,
                            timestamp: new Date().toISOString(),
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Utility methods
    MetacognitiveLayer.prototype.calculateTrend = function (values) {
        if (values.length < 2) {
            return 0;
        }
        var n = values.length;
        var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (var i = 0; i < n; i++) {
            sumX += i;
            sumY += values[i];
            sumXY += i * values[i];
            sumX2 += i * i;
        }
        var slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return slope;
    };
    MetacognitiveLayer.prototype.calculateVolatility = function (values) {
        if (values.length < 2) {
            return 0;
        }
        var mean = values.reduce(function (a, b) { return a + b; }, 0) / values.length;
        var variance = values.reduce(function (sum, val) {
            return sum + Math.pow(val - mean, 2);
        }, 0) / values.length;
        return Math.sqrt(variance);
    };
    MetacognitiveLayer.prototype.detectPlateau = function (values, windowSize) {
        if (windowSize === void 0) { windowSize = 5; }
        if (values.length < windowSize * 2) {
            return false;
        }
        var recentValues = values.slice(-windowSize);
        var recentTrend = this.calculateTrend(recentValues);
        var recentVolatility = this.calculateVolatility(recentValues);
        return Math.abs(recentTrend) < 0.01 && recentVolatility < 0.05;
    };
    MetacognitiveLayer.prototype.calculateImprovementRate = function (values) {
        if (values.length < 2) {
            return 0;
        }
        var first = values[0];
        var last = values[values.length - 1];
        var improvement = last - first;
        return improvement / values.length;
    };
    MetacognitiveLayer.prototype.findTaskSimilarity = function (task) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Implement task similarity search using embeddings or other methods
                // For now, return a default value
                return [2 /*return*/, 0.5];
            });
        });
    };
    MetacognitiveLayer.prototype.calculateTaskComplexity = function (task) {
        // Implement based on your task structure
        // Consider factors like: number of steps, data volume, constraints, etc.
        var complexity = 0.5;
        if (task.steps && task.steps.length > 5) {
            complexity += 0.2;
        }
        if (task.constraints && task.constraints.length > 3) {
            complexity += 0.1;
        }
        if (task.dataVolume && task.dataVolume > 1000) {
            complexity += 0.2;
        }
        return Math.min(1, complexity);
    };
    MetacognitiveLayer.prototype.classifyProblemType = function (problem) {
        // Implement problem classification logic
        if (problem.type) {
            return problem.type;
        }
        // Default classification based on problem structure
        if (problem.targetValue !== undefined) {
            return 'optimization';
        }
        if (problem.categories !== undefined) {
            return 'classification';
        }
        if (problem.sequence !== undefined) {
            return 'sequential';
        }
        return 'general';
    };
    MetacognitiveLayer.prototype.extractConstraints = function (problem) {
        return problem.constraints || [];
    };
    MetacognitiveLayer.prototype.assessRequiredPrecision = function (problem) {
        return problem.requiredPrecision || 0.8;
    };
    MetacognitiveLayer.prototype.analyzeProgression = function (checkpoints) {
        var scores = checkpoints.map(function (cp) { return cp.score || 0; });
        return {
            momentum: this.calculateTrend(scores),
            efficiency: this.calculateEfficiency(checkpoints),
            consistency: 1 - this.calculateVolatility(scores),
        };
    };
    MetacognitiveLayer.prototype.detectIfStuck = function (progression) {
        return progression.momentum < 0.01 && progression.efficiency < 0.3;
    };
    MetacognitiveLayer.prototype.detectIfDiverging = function (progression) {
        return progression.momentum < -0.05 || progression.consistency < 0.3;
    };
    MetacognitiveLayer.prototype.calculateCheckpointConfidence = function (checkpoint) {
        return checkpoint.confidence || 0.5;
    };
    MetacognitiveLayer.prototype.recommendStrategyAdjustment = function (progression, isStuck, isDiverging) {
        if (isStuck) {
            return 'Switch to more exploratory strategy or increase search breadth';
        }
        if (isDiverging) {
            return 'Return to more conservative strategy or add constraints';
        }
        if (progression.efficiency < 0.5) {
            return 'Optimize current strategy parameters or try hybrid approach';
        }
        return 'Continue with current strategy';
    };
    MetacognitiveLayer.prototype.calculateEfficiency = function (checkpoints) {
        if (checkpoints.length < 2) {
            return 0.5;
        }
        var improvements = [];
        for (var i = 1; i < checkpoints.length; i++) {
            var improvement = (checkpoints[i].score || 0) - (checkpoints[i - 1].score || 0);
            var timeSpent = (checkpoints[i].timestamp - checkpoints[i - 1].timestamp) || 1;
            improvements.push(improvement / timeSpent);
        }
        var avgImprovement = improvements.reduce(function (a, b) { return a + b; }, 0) / improvements.length;
        return Math.max(0, Math.min(1, avgImprovement + 0.5));
    };
    MetacognitiveLayer.prototype.analyzePerformancePatterns = function (taskHistory) {
        var byType = new Map();
        for (var _i = 0, taskHistory_1 = taskHistory; _i < taskHistory_1.length; _i++) {
            var task = taskHistory_1[_i];
            var type = task.type || 'general';
            var performance_2 = task.performance || 0;
            if (!byType.has(type)) {
                byType.set(type, []);
            }
            byType.get(type).push(performance_2);
        }
        var patterns = {};
        for (var _a = 0, byType_1 = byType; _a < byType_1.length; _a++) {
            var _b = byType_1[_a], type = _b[0], performances = _b[1];
            patterns[type] = {
                average: performances.reduce(function (a, b) { return a + b; }, 0) / performances.length,
                trend: this.calculateTrend(performances),
                consistency: 1 - this.calculateVolatility(performances),
            };
        }
        return patterns;
    };
    MetacognitiveLayer.prototype.identifyStrengths = function (patterns) {
        var strengths = [];
        for (var _i = 0, _a = Object.entries(patterns); _i < _a.length; _i++) {
            var _b = _a[_i], type = _b[0], stats = _b[1];
            var s = stats;
            if (s.average > 0.8) {
                strengths.push("Excellent performance in ".concat(type, " tasks (").concat((s.average * 100).toFixed(0), "% accuracy)"));
            }
            if (s.consistency > 0.9) {
                strengths.push("Highly consistent in ".concat(type, " tasks"));
            }
            if (s.trend > 0.05) {
                strengths.push("Rapidly improving in ".concat(type, " tasks"));
            }
        }
        return strengths;
    };
    MetacognitiveLayer.prototype.identifyWeaknesses = function (patterns) {
        var weaknesses = [];
        for (var _i = 0, _a = Object.entries(patterns); _i < _a.length; _i++) {
            var _b = _a[_i], type = _b[0], stats = _b[1];
            var s = stats;
            if (s.average < 0.5) {
                weaknesses.push("Struggling with ".concat(type, " tasks (").concat((s.average * 100).toFixed(0), "% accuracy)"));
            }
            if (s.consistency < 0.5) {
                weaknesses.push("Inconsistent performance in ".concat(type, " tasks"));
            }
            if (s.trend < -0.02) {
                weaknesses.push("Declining performance in ".concat(type, " tasks"));
            }
        }
        return weaknesses;
    };
    MetacognitiveLayer.prototype.determineImprovementAreas = function (strengths, weaknesses, metrics) {
        var improvements = [];
        // Address weaknesses
        if (weaknesses.some(function (w) { return w.includes('Struggling'); })) {
            improvements.push('Focus on improving accuracy in challenging task types');
        }
        if (weaknesses.some(function (w) { return w.includes('Inconsistent'); })) {
            improvements.push('Develop more robust strategies for consistent performance');
        }
        // Build on strengths
        if (strengths.some(function (s) { return s.includes('Rapidly improving'); })) {
            improvements.push('Maintain learning momentum in improving areas');
        }
        // General improvements
        if (metrics.efficiency < 0.7) {
            improvements.push('Optimize processing efficiency to reduce time per task');
        }
        return improvements;
    };
    MetacognitiveLayer.prototype.extractLearningInsights = function (taskHistory) {
        var insights = [];
        // Analyze learning velocity
        var learningVelocity = this.calculateLearningVelocity(taskHistory);
        if (learningVelocity > 0.1) {
            insights.push('Learning velocity is high - current strategies are effective');
        }
        else if (learningVelocity < 0.01) {
            insights.push('Learning has plateaued - consider new approaches');
        }
        // Identify breakthrough moments
        var breakthroughs = this.detectBreakthroughs(taskHistory);
        if (breakthroughs.length > 0) {
            insights.push("".concat(breakthroughs.length, " breakthrough moments identified - analyze for patterns"));
        }
        // Strategy effectiveness
        var strategyInsights = this.analyzeStrategyEffectiveness();
        insights.push.apply(insights, strategyInsights);
        return insights;
    };
    MetacognitiveLayer.prototype.assessConfidenceCalibration = function () {
        if (this.confidenceCalibrationHistory.length < 5) {
            return 'Insufficient data for confidence calibration assessment';
        }
        var recent = this.confidenceCalibrationHistory.slice(-20);
        var avgError = recent.reduce(function (sum, r) { return sum + r.calibrationError; }, 0) / recent.length;
        var wellCalibrated = recent.filter(function (r) { return r.isWellCalibrated; }).length / recent.length;
        if (wellCalibrated > 0.8) {
            return "Excellent confidence calibration (".concat((wellCalibrated * 100).toFixed(0), "% well-calibrated)");
        }
        else if (wellCalibrated > 0.6) {
            return "Good confidence calibration with room for improvement (avg error: ".concat(avgError.toFixed(2), ")");
        }
        return "Poor confidence calibration - tends to be ".concat(avgError > 0 ? 'overconfident' : 'underconfident');
    };
    MetacognitiveLayer.prototype.detectFastStart = function (history) {
        if (history.length < 5) {
            return false;
        }
        var early = history.slice(0, 5).map(function (h) { return h.performance || 0; });
        var earlyImprovement = early[early.length - 1] - early[0];
        return earlyImprovement > 0.3;
    };
    MetacognitiveLayer.prototype.detectSteadyImprovement = function (history) {
        if (history.length < 10) {
            return false;
        }
        var performances = history.map(function (h) { return h.performance || 0; });
        var trend = this.calculateTrend(performances);
        var volatility = this.calculateVolatility(performances);
        return trend > 0.01 && volatility < 0.1;
    };
    MetacognitiveLayer.prototype.detectBreakthroughs = function (history) {
        var breakthroughs = [];
        for (var i = 1; i < history.length; i++) {
            var improvement = (history[i].performance || 0) - (history[i - 1].performance || 0);
            if (improvement > 0.15) {
                breakthroughs.push(i);
            }
        }
        return breakthroughs;
    };
    MetacognitiveLayer.prototype.calculateLearningVelocity = function (history) {
        if (history.length < 2) {
            return 0;
        }
        var performances = history.map(function (h) { return h.performance || 0; });
        return this.calculateTrend(performances);
    };
    MetacognitiveLayer.prototype.analyzeStrategyEffectiveness = function () {
        var insights = [];
        for (var _i = 0, _a = this.strategyPerformance; _i < _a.length; _i++) {
            var _b = _a[_i], strategy = _b[0], performance_3 = _b[1];
            var total = performance_3.successes + performance_3.failures;
            if (total > 10) {
                var successRate = performance_3.successes / total;
                if (successRate > 0.8) {
                    insights.push("".concat(strategy, " strategy is highly effective (").concat((successRate * 100).toFixed(0), "% success)"));
                }
                else if (successRate < 0.4) {
                    insights.push("".concat(strategy, " strategy needs improvement (").concat((successRate * 100).toFixed(0), "% success)"));
                }
            }
        }
        return insights;
    };
    return MetacognitiveLayer;
}());
exports.MetacognitiveLayer = MetacognitiveLayer;
