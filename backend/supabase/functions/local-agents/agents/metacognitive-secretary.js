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
exports.MetacognitiveSecretaryAgent = void 0;
var metacognitive_base_ts_1 = require("./metacognitive-base.ts");
var MetacognitiveSecretaryAgent = /** @class */ (function (_super) {
    __extends(MetacognitiveSecretaryAgent, _super);
    function MetacognitiveSecretaryAgent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.learningHistory = [];
        _this.taskHistory = [];
        _this.currentLearningRate = 0.1;
        return _this;
    }
    Object.defineProperty(MetacognitiveSecretaryAgent.prototype, "agentType", {
        get: function () {
            return 'metacognitive_secretary';
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MetacognitiveSecretaryAgent.prototype, "capabilities", {
        get: function () {
            return [
                'document_processing',
                'data_extraction',
                'metadata_generation',
                'categorization',
                'ocr_analysis',
                'metacognitive_monitoring',
                'strategy_optimization',
            ];
        },
        enumerable: false,
        configurable: true
    });
    MetacognitiveSecretaryAgent.prototype.initializeStrategies = function () {
        this.availableStrategies = [
            {
                name: 'structured_extraction',
                type: 'analytical',
                complexity: 0.8,
                expectedAccuracy: 0.9,
                expectedSpeed: 0.3,
                contextualFit: 0.9,
            },
            {
                name: 'pattern_matching',
                type: 'heuristic',
                complexity: 0.5,
                expectedAccuracy: 0.8,
                expectedSpeed: 0.8,
                contextualFit: 0.7,
            },
            {
                name: 'quick_scan',
                type: 'intuitive',
                complexity: 0.3,
                expectedAccuracy: 0.7,
                expectedSpeed: 0.95,
                contextualFit: 0.6,
            },
            {
                name: 'adaptive_processing',
                type: 'hybrid',
                complexity: 0.6,
                expectedAccuracy: 0.85,
                expectedSpeed: 0.6,
                contextualFit: 0.8,
            },
        ];
    };
    // Override process to add document-specific metacognitive features
    MetacognitiveSecretaryAgent.prototype.process = function (data, context) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, taskId, result, documentInsights;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        startTime = Date.now();
                        taskId = this.generateTaskId();
                        this.trackTask(taskId, data, context);
                        return [4 /*yield*/, _super.prototype.process.call(this, data, context)];
                    case 1:
                        result = _b.sent();
                        if (!(result.success && result.metacognitive)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.analyzeDocumentProcessingPatterns(data, result, Date.now() - startTime)];
                    case 2:
                        documentInsights = _b.sent();
                        // Add document-specific insights
                        (_a = result.metacognitive.insights).push.apply(_a, documentInsights);
                        _b.label = 3;
                    case 3:
                        // Update task history with result
                        this.updateTaskHistory(taskId, result);
                        return [2 /*return*/, result];
                }
            });
        });
    };
    // Implement abstract methods from MetacognitiveBaseAgent
    MetacognitiveSecretaryAgent.prototype.decomposeAnalytically = function (data) {
        var components = [];
        // Decompose by document sections
        if (data.content) {
            // Header extraction
            components.push({
                type: 'header',
                content: this.extractHeader(data.content),
                priority: 1,
            });
            // Body sections
            var sections = this.extractSections(data.content);
            components.push.apply(components, sections.map(function (section, idx) { return ({
                type: 'section',
                content: section,
                priority: 0.8 - (idx * 0.1),
            }); }));
            // Footer/signature extraction
            components.push({
                type: 'footer',
                content: this.extractFooter(data.content),
                priority: 0.7,
            });
        }
        // Metadata extraction
        if (data.metadata) {
            components.push({
                type: 'metadata',
                content: data.metadata,
                priority: 0.9,
            });
        }
        return components;
    };
    MetacognitiveSecretaryAgent.prototype.processComponent = function (component, context) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (component.type) {
                    case 'header':
                        return [2 /*return*/, this.processHeader(component.content)];
                    case 'section':
                        return [2 /*return*/, this.processSection(component.content)];
                    case 'footer':
                        return [2 /*return*/, this.processFooter(component.content)];
                    case 'metadata':
                        return [2 /*return*/, this.processMetadata(component.content)];
                    default:
                        return [2 /*return*/, { processed: false, data: component }];
                }
                return [2 /*return*/];
            });
        });
    };
    MetacognitiveSecretaryAgent.prototype.synthesizeResults = function (results) {
        var insights = [];
        var extractedData = {
            headers: [],
            sections: [],
            footers: [],
            metadata: {},
        };
        var overallConfidence = 0;
        var successCount = 0;
        for (var _i = 0, results_1 = results; _i < results_1.length; _i++) {
            var result = results_1[_i];
            if (result.processed) {
                successCount++;
                switch (result.type) {
                    case 'header':
                        extractedData.headers.push(result.data);
                        break;
                    case 'section':
                        extractedData.sections.push(result.data);
                        break;
                    case 'footer':
                        extractedData.footers.push(result.data);
                        break;
                    case 'metadata':
                        extractedData.metadata = __assign(__assign({}, extractedData.metadata), result.data);
                        break;
                }
                overallConfidence += result.confidence || 0.5;
            }
        }
        // Calculate final confidence
        var confidence = results.length > 0 ?
            (overallConfidence / results.length) * (successCount / results.length) : 0;
        // Generate insights
        if (extractedData.headers.length > 0) {
            insights.push(this.createInsight('header_extraction', 'low', 'Document Headers Extracted', "Successfully extracted ".concat(extractedData.headers.length, " headers"), null, { headers: extractedData.headers }));
        }
        return {
            success: successCount > 0,
            result: extractedData,
            insights: insights,
            rulesApplied: ['analytical_decomposition', 'component_synthesis'],
            confidence: confidence,
            metadata: {
                componentsProcessed: results.length,
                successfulComponents: successCount,
            },
        };
    };
    MetacognitiveSecretaryAgent.prototype.applyHeuristics = function (data, context) {
        return __awaiter(this, void 0, void 0, function () {
            var insights, rulesApplied, documentType, result, confidence, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        insights = [];
                        rulesApplied = [];
                        documentType = this.detectDocumentType(data);
                        rulesApplied.push('document_type_heuristic');
                        confidence = 0.7;
                        _a = documentType;
                        switch (_a) {
                            case 'contract': return [3 /*break*/, 1];
                            case 'invoice': return [3 /*break*/, 3];
                            case 'report': return [3 /*break*/, 5];
                        }
                        return [3 /*break*/, 7];
                    case 1: return [4 /*yield*/, this.applyContractHeuristics(data)];
                    case 2:
                        result = _b.sent();
                        rulesApplied.push('contract_heuristics');
                        confidence = 0.85;
                        return [3 /*break*/, 9];
                    case 3: return [4 /*yield*/, this.applyInvoiceHeuristics(data)];
                    case 4:
                        result = _b.sent();
                        rulesApplied.push('invoice_heuristics');
                        confidence = 0.9;
                        return [3 /*break*/, 9];
                    case 5: return [4 /*yield*/, this.applyReportHeuristics(data)];
                    case 6:
                        result = _b.sent();
                        rulesApplied.push('report_heuristics');
                        confidence = 0.8;
                        return [3 /*break*/, 9];
                    case 7: return [4 /*yield*/, this.applyGeneralHeuristics(data)];
                    case 8:
                        result = _b.sent();
                        rulesApplied.push('general_heuristics');
                        confidence = 0.6;
                        _b.label = 9;
                    case 9:
                        insights.push(this.createInsight('heuristic_processing', 'low', 'Heuristic Processing Applied', "Document identified as ".concat(documentType, ", applied specific heuristics"), null, { documentType: documentType, heuristicsApplied: rulesApplied }));
                        return [2 /*return*/, {
                                success: true,
                                result: result,
                                insights: insights,
                                rulesApplied: rulesApplied,
                                confidence: confidence,
                            }];
                }
            });
        });
    };
    MetacognitiveSecretaryAgent.prototype.validateHeuristic = function (result) {
        var _a, _b;
        // Validate heuristic results
        var validationErrors = [];
        if (result.result) {
            // Check for required fields based on document type
            if (((_a = result.metadata) === null || _a === void 0 ? void 0 : _a.documentType) === 'contract') {
                if (!result.result.parties) {
                    validationErrors.push('Missing parties information');
                }
                if (!result.result.terms) {
                    validationErrors.push('Missing terms');
                }
            }
            if (((_b = result.metadata) === null || _b === void 0 ? void 0 : _b.documentType) === 'invoice') {
                if (!result.result.amount) {
                    validationErrors.push('Missing amount');
                }
                if (!result.result.date) {
                    validationErrors.push('Missing date');
                }
            }
        }
        // Adjust confidence based on validation
        var validationPenalty = validationErrors.length * 0.1;
        var adjustedConfidence = Math.max(0.1, result.confidence - validationPenalty);
        return __assign(__assign({}, result), { confidence: adjustedConfidence, metadata: __assign(__assign({}, result.metadata), { validationErrors: validationErrors, validated: true }) });
    };
    MetacognitiveSecretaryAgent.prototype.matchPatterns = function (data, context) {
        return __awaiter(this, void 0, void 0, function () {
            var patterns, structurePattern, contentPatterns, metadataPattern, historicalPatterns;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        patterns = [];
                        structurePattern = this.matchStructurePattern(data);
                        if (structurePattern) {
                            patterns.push(structurePattern);
                        }
                        contentPatterns = this.matchContentPatterns(data);
                        patterns.push.apply(patterns, contentPatterns);
                        // Metadata patterns
                        if (data.metadata) {
                            metadataPattern = this.matchMetadataPattern(data.metadata);
                            if (metadataPattern) {
                                patterns.push(metadataPattern);
                            }
                        }
                        if (!(context === null || context === void 0 ? void 0 : context.memory)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.matchHistoricalPatterns(data, context.memory)];
                    case 1:
                        historicalPatterns = _a.sent();
                        patterns.push.apply(patterns, historicalPatterns);
                        _a.label = 2;
                    case 2: return [2 /*return*/, patterns];
                }
            });
        });
    };
    MetacognitiveSecretaryAgent.prototype.intuitiveAssessment = function (patterns) {
        // Quick intuitive assessment based on patterns
        var insights = [];
        var confidence = 0.5;
        // Strong patterns increase confidence
        var strongPatterns = patterns.filter(function (p) { return p.strength > 0.8; });
        confidence += strongPatterns.length * 0.1;
        // Consistent patterns increase confidence
        var patternTypes = new Set(patterns.map(function (p) { return p.type; }));
        if (patternTypes.size < patterns.length / 2) {
            confidence += 0.1; // Many similar patterns
        }
        // Generate quick insights
        if (strongPatterns.length > 0) {
            insights.push(this.createInsight('pattern_recognition', 'medium', 'Strong Patterns Detected', "Found ".concat(strongPatterns.length, " strong patterns indicating high confidence"), null, { patternCount: strongPatterns.length }));
        }
        // Quick result based on dominant pattern
        var dominantPattern = patterns.sort(function (a, b) { return b.strength - a.strength; })[0];
        var result = dominantPattern ? this.generateResultFromPattern(dominantPattern) : null;
        return {
            success: result !== null,
            result: result,
            insights: insights,
            rulesApplied: ['intuitive_pattern_matching'],
            confidence: Math.min(0.9, confidence),
            metadata: {
                patternsFound: patterns.length,
                patternTypes: Array.from(patternTypes),
            },
        };
    };
    MetacognitiveSecretaryAgent.prototype.combineResults = function (result1, result2) {
        // Combine intuitive and analytical results
        var combinedInsights = __spreadArray(__spreadArray([], result1.insights, true), result2.insights, true);
        var combinedRules = __spreadArray([], new Set(__spreadArray(__spreadArray([], result1.rulesApplied, true), result2.rulesApplied, true)), true);
        // Weighted confidence combination
        var weight1 = result1.confidence;
        var weight2 = result2.confidence;
        var totalWeight = weight1 + weight2;
        var combinedConfidence = totalWeight > 0 ?
            (result1.confidence * weight1 + result2.confidence * weight2) / totalWeight : 0.5;
        // Merge results
        var mergedResult = this.mergeResults(result1.result, result2.result);
        return {
            success: result1.success || result2.success,
            result: mergedResult,
            insights: combinedInsights,
            rulesApplied: combinedRules,
            confidence: combinedConfidence,
            metadata: {
                combinedFrom: ['intuitive', 'analytical'],
                result1Confidence: result1.confidence,
                result2Confidence: result2.confidence,
            },
        };
    };
    MetacognitiveSecretaryAgent.prototype.assessDataComplexity = function (data) {
        var complexity = 0;
        // Size complexity
        if (data.content) {
            var contentLength = data.content.length;
            complexity += Math.min(0.3, contentLength / 10000);
        }
        // Structure complexity
        if (data.structure) {
            var depth = this.calculateStructureDepth(data.structure);
            complexity += Math.min(0.2, depth / 10);
        }
        // Format complexity
        if (data.formats && Array.isArray(data.formats)) {
            complexity += Math.min(0.2, data.formats.length / 5);
        }
        // Language complexity
        if (data.languages && data.languages.length > 1) {
            complexity += 0.2;
        }
        // Unknown elements
        if (data.unknownElements) {
            complexity += 0.1;
        }
        return Math.min(1, complexity);
    };
    MetacognitiveSecretaryAgent.prototype.adjustLearningRate = function (adjustment) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.currentLearningRate *= adjustment;
                        // Keep learning rate in reasonable bounds
                        this.currentLearningRate = Math.max(0.01, Math.min(0.5, this.currentLearningRate));
                        // Log adjustment
                        return [4 /*yield*/, this.supabase.from('agent_learning_adjustments').insert({
                                agent_type: this.agentType,
                                enterprise_id: this.enterpriseId,
                                adjustment_factor: adjustment,
                                new_learning_rate: this.currentLearningRate,
                                timestamp: new Date().toISOString(),
                            })];
                    case 1:
                        // Log adjustment
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MetacognitiveSecretaryAgent.prototype.analyzeError = function (error) {
        var errorType = error.name || 'UnknownError';
        var errorMessage = error.message || 'No error message';
        // Classify error
        var category = 'general';
        var recommendedStrategy = 'adaptive_processing';
        if (errorMessage.includes('timeout')) {
            category = 'performance';
            recommendedStrategy = 'quick_scan';
        }
        else if (errorMessage.includes('parse') || errorMessage.includes('format')) {
            category = 'parsing';
            recommendedStrategy = 'structured_extraction';
        }
        else if (errorMessage.includes('memory') || errorMessage.includes('size')) {
            category = 'resource';
            recommendedStrategy = 'pattern_matching';
        }
        return {
            type: errorType,
            category: category,
            context: {
                message: errorMessage,
                stack: error.stack,
            },
            recommendedStrategy: recommendedStrategy,
        };
    };
    // Document-specific helper methods
    MetacognitiveSecretaryAgent.prototype.analyzeDocumentProcessingPatterns = function (data, result, processingTime) {
        return __awaiter(this, void 0, void 0, function () {
            var insights, expectedTime, timeEfficiency, completeness;
            return __generator(this, function (_a) {
                insights = [];
                expectedTime = this.estimateProcessingTime(data);
                timeEfficiency = expectedTime / processingTime;
                if (timeEfficiency < 0.5) {
                    insights.push({
                        type: 'performance_prediction',
                        description: 'Processing took longer than expected',
                        impact: 0.6,
                        recommendation: 'Consider using quick_scan strategy for similar documents',
                    });
                }
                else if (timeEfficiency > 1.5) {
                    insights.push({
                        type: 'performance_prediction',
                        description: 'Processing was faster than expected',
                        impact: 0.3,
                        recommendation: 'Current strategy is highly efficient for this document type',
                    });
                }
                // Analyze extraction completeness
                if (result.result) {
                    completeness = this.assessExtractionCompleteness(result.result);
                    if (completeness < 0.7) {
                        insights.push({
                            type: 'learning_opportunity',
                            description: 'Incomplete data extraction detected',
                            impact: 0.8,
                            recommendation: 'Switch to structured_extraction for more thorough processing',
                        });
                    }
                }
                return [2 /*return*/, insights];
            });
        });
    };
    MetacognitiveSecretaryAgent.prototype.trackTask = function (taskId, data, context) {
        var _a, _b;
        this.taskHistory.push({
            id: taskId,
            timestamp: new Date().toISOString(),
            dataType: this.detectDocumentType(data),
            context: context,
            startState: {
                confidence: ((_a = this.currentCognitiveState) === null || _a === void 0 ? void 0 : _a.confidence) || 0.5,
                strategy: ((_b = this.currentCognitiveState) === null || _b === void 0 ? void 0 : _b.activeStrategies[0]) || 'unknown',
            },
        });
    };
    MetacognitiveSecretaryAgent.prototype.updateTaskHistory = function (taskId, result) {
        var _a;
        var task = this.taskHistory.find(function (t) { return t.id === taskId; });
        if (task) {
            task.endState = {
                success: result.success,
                confidence: result.confidence,
                strategy: (_a = result.metacognitive) === null || _a === void 0 ? void 0 : _a.strategyUsed.name,
                insights: result.insights.length,
            };
            task.performance = result.success ? result.confidence : 0;
        }
        // Update learning history
        if (result.metacognitive) {
            this.learningHistory.push({
                timestamp: new Date().toISOString(),
                strategy: result.metacognitive.strategyUsed.name,
                performance: result.success ? result.confidence : 0,
                calibration: result.metacognitive.calibration,
                cognitiveLoad: result.metacognitive.cognitiveState.cognitiveLoad,
            });
        }
    };
    // Utility methods
    MetacognitiveSecretaryAgent.prototype.generateTaskId = function () {
        return "task_".concat(Date.now(), "_").concat(Math.random().toString(36).substring(7));
    };
    MetacognitiveSecretaryAgent.prototype.extractHeader = function (content) {
        // Simple header extraction - first 20% of content
        var headerLength = Math.floor(content.length * 0.2);
        return content.substring(0, headerLength);
    };
    MetacognitiveSecretaryAgent.prototype.extractSections = function (content) {
        // Simple section extraction - split by double newlines
        return content.split(/\n\n+/).filter(function (s) { return s.trim().length > 0; });
    };
    MetacognitiveSecretaryAgent.prototype.extractFooter = function (content) {
        // Simple footer extraction - last 10% of content
        var footerStart = Math.floor(content.length * 0.9);
        return content.substring(footerStart);
    };
    MetacognitiveSecretaryAgent.prototype.processHeader = function (content) {
        return {
            processed: true,
            type: 'header',
            data: {
                title: this.extractTitle(content),
                date: this.extractDate(content),
                parties: this.extractParties(content),
            },
            confidence: 0.8,
        };
    };
    MetacognitiveSecretaryAgent.prototype.processSection = function (content) {
        return {
            processed: true,
            type: 'section',
            data: {
                content: content.trim(),
                keywords: this.extractKeywords(content),
                entities: this.extractEntities(content),
            },
            confidence: 0.7,
        };
    };
    MetacognitiveSecretaryAgent.prototype.processFooter = function (content) {
        return {
            processed: true,
            type: 'footer',
            data: {
                signatures: this.extractSignatures(content),
                dates: this.extractDates(content),
                references: this.extractReferences(content),
            },
            confidence: 0.75,
        };
    };
    MetacognitiveSecretaryAgent.prototype.processMetadata = function (metadata) {
        return {
            processed: true,
            type: 'metadata',
            data: metadata,
            confidence: 0.9,
        };
    };
    MetacognitiveSecretaryAgent.prototype.detectDocumentType = function (data) {
        if (!data.content) {
            return 'unknown';
        }
        var content = data.content.toLowerCase();
        if (content.includes('agreement') || content.includes('contract')) {
            return 'contract';
        }
        if (content.includes('invoice') || content.includes('bill')) {
            return 'invoice';
        }
        if (content.includes('report') || content.includes('analysis')) {
            return 'report';
        }
        if (content.includes('proposal') || content.includes('quotation')) {
            return 'proposal';
        }
        return 'general';
    };
    MetacognitiveSecretaryAgent.prototype.estimateProcessingTime = function (data) {
        // Estimate based on content size and complexity
        var baseTime = 100; // ms
        var sizeFactor = data.content ? data.content.length / 1000 : 1;
        var complexityFactor = this.assessDataComplexity(data);
        return baseTime * (1 + sizeFactor * 0.1) * (1 + complexityFactor);
    };
    MetacognitiveSecretaryAgent.prototype.assessExtractionCompleteness = function (result) {
        var score = 0;
        var maxScore = 0;
        // Check headers
        maxScore += 1;
        if (result.headers && result.headers.length > 0) {
            score += 1;
        }
        // Check sections
        maxScore += 1;
        if (result.sections && result.sections.length > 0) {
            score += 1;
        }
        // Check metadata
        maxScore += 1;
        if (result.metadata && Object.keys(result.metadata).length > 0) {
            score += 1;
        }
        return maxScore > 0 ? score / maxScore : 0;
    };
    // Override parent methods
    MetacognitiveSecretaryAgent.prototype.getLearningHistory = function () {
        return this.learningHistory;
    };
    MetacognitiveSecretaryAgent.prototype.getTaskHistory = function () {
        return this.taskHistory;
    };
    // Pattern matching helpers
    MetacognitiveSecretaryAgent.prototype.matchStructurePattern = function (data) {
        // Implement structure pattern matching
        return {
            type: 'structure',
            pattern: 'standard_document',
            strength: 0.7,
            features: ['header', 'body', 'footer'],
        };
    };
    MetacognitiveSecretaryAgent.prototype.matchContentPatterns = function (data) {
        // Implement content pattern matching
        return [];
    };
    MetacognitiveSecretaryAgent.prototype.matchMetadataPattern = function (metadata) {
        // Implement metadata pattern matching
        return null;
    };
    MetacognitiveSecretaryAgent.prototype.matchHistoricalPatterns = function (data, memory) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Match against historical patterns in memory
                return [2 /*return*/, []];
            });
        });
    };
    MetacognitiveSecretaryAgent.prototype.generateResultFromPattern = function (pattern) {
        // Generate result based on dominant pattern
        return {
            type: pattern.pattern,
            confidence: pattern.strength,
            extractedData: {},
        };
    };
    MetacognitiveSecretaryAgent.prototype.mergeResults = function (result1, result2) {
        // Merge two results intelligently
        if (!result1) {
            return result2;
        }
        if (!result2) {
            return result1;
        }
        return __assign(__assign(__assign({}, result1), result2), { merged: true });
    };
    MetacognitiveSecretaryAgent.prototype.calculateStructureDepth = function (structure) {
        // Calculate depth of document structure
        return 1;
    };
    // Extraction helpers (simplified implementations)
    MetacognitiveSecretaryAgent.prototype.extractTitle = function (content) {
        var lines = content.split('\n');
        return lines[0] || '';
    };
    MetacognitiveSecretaryAgent.prototype.extractDate = function (content) {
        var datePattern = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/g;
        return content.match(datePattern) || [];
    };
    MetacognitiveSecretaryAgent.prototype.extractParties = function (content) {
        // Simplified party extraction
        return [];
    };
    MetacognitiveSecretaryAgent.prototype.extractKeywords = function (content) {
        // Simple keyword extraction
        var words = content.toLowerCase().split(/\s+/);
        var stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at']);
        return words.filter(function (w) { return w.length > 3 && !stopWords.has(w); }).slice(0, 10);
    };
    MetacognitiveSecretaryAgent.prototype.extractEntities = function (content) {
        // Simplified entity extraction
        return [];
    };
    MetacognitiveSecretaryAgent.prototype.extractSignatures = function (content) {
        // Simplified signature extraction
        return [];
    };
    MetacognitiveSecretaryAgent.prototype.extractDates = function (content) {
        return this.extractDate(content);
    };
    MetacognitiveSecretaryAgent.prototype.extractReferences = function (content) {
        // Simplified reference extraction
        return [];
    };
    // Contract-specific heuristics
    MetacognitiveSecretaryAgent.prototype.applyContractHeuristics = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {
                        documentType: 'contract',
                        parties: [],
                        terms: [],
                        dates: [],
                        obligations: [],
                    }];
            });
        });
    };
    MetacognitiveSecretaryAgent.prototype.applyInvoiceHeuristics = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {
                        documentType: 'invoice',
                        amount: 0,
                        date: '',
                        vendor: '',
                        items: [],
                    }];
            });
        });
    };
    MetacognitiveSecretaryAgent.prototype.applyReportHeuristics = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {
                        documentType: 'report',
                        summary: '',
                        findings: [],
                        recommendations: [],
                    }];
            });
        });
    };
    MetacognitiveSecretaryAgent.prototype.applyGeneralHeuristics = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {
                        documentType: 'general',
                        content: data.content,
                        metadata: data.metadata,
                    }];
            });
        });
    };
    return MetacognitiveSecretaryAgent;
}(metacognitive_base_ts_1.MetacognitiveBaseAgent));
exports.MetacognitiveSecretaryAgent = MetacognitiveSecretaryAgent;
