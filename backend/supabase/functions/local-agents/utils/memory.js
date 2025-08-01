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
exports.MemoryManager = void 0;
var cache_ts_1 = require("../../../functions-utils/cache.ts");
var index_ts_1 = require("../config/index.ts");
var MemoryManager = /** @class */ (function () {
    function MemoryManager(supabase, enterpriseId, userId) {
        this.consolidationThreshold = 5; // Consolidate after 5 accesses
        this.importanceThreshold = 0.7; // Move to long-term if importance > 0.7
        this.supabase = supabase;
        this.enterpriseId = enterpriseId;
        this.userId = userId;
        this.cache = cache_ts_1.globalCache;
    }
    // Store memory in short-term memory
    MemoryManager.prototype.storeShortTermMemory = function (memoryType_1, content_1) {
        return __awaiter(this, arguments, void 0, function (memoryType, content, context, importanceScore, embedding) {
            var similar, _a, data, error;
            if (context === void 0) { context = {}; }
            if (importanceScore === void 0) { importanceScore = 0.5; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.userId) {
                            throw new Error('User ID required for short-term memory');
                        }
                        if (!embedding) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.searchShortTermMemory(embedding, 1, 0.95)];
                    case 1:
                        similar = _b.sent();
                        if (!(similar.length > 0)) return [3 /*break*/, 3];
                        // Update existing memory instead of creating new
                        return [4 /*yield*/, this.updateMemoryAccess(similar[0].id, 'short_term')];
                    case 2:
                        // Update existing memory instead of creating new
                        _b.sent();
                        return [2 /*return*/, similar[0].id];
                    case 3: return [4 /*yield*/, this.supabase
                            .from('short_term_memory')
                            .insert({
                            user_id: this.userId,
                            memory_type: memoryType,
                            content: content,
                            context: context,
                            importance_score: importanceScore,
                            embedding: embedding,
                            enterprise_id: this.enterpriseId,
                            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
                        })
                            .select()
                            .single()];
                    case 4:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            throw error;
                        }
                        // Cache the memory for quick access
                        this.cacheMemory(data.id, data, 'short_term');
                        return [2 /*return*/, data.id];
                }
            });
        });
    };
    // Store memory in long-term memory
    MemoryManager.prototype.storeLongTermMemory = function (memoryType_1, category_1, content_1, summary_1) {
        return __awaiter(this, arguments, void 0, function (memoryType, category, content, summary, context, importanceScore, embedding) {
            var similar, _a, data, error;
            if (context === void 0) { context = {}; }
            if (importanceScore === void 0) { importanceScore = 0.5; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!embedding) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.searchLongTermMemory(embedding, 1, 0.9)];
                    case 1:
                        similar = _b.sent();
                        if (!(similar.length > 0)) return [3 /*break*/, 3];
                        // Consolidate with existing memory
                        return [4 /*yield*/, this.consolidateMemories(similar[0].id, content, context)];
                    case 2:
                        // Consolidate with existing memory
                        _b.sent();
                        return [2 /*return*/, similar[0].id];
                    case 3: return [4 /*yield*/, this.supabase
                            .from('long_term_memory')
                            .insert({
                            memory_type: memoryType,
                            category: category,
                            content: content,
                            summary: summary,
                            context: context,
                            importance_score: importanceScore,
                            embedding: embedding,
                            user_id: this.userId,
                            enterprise_id: this.enterpriseId,
                        })
                            .select()
                            .single()];
                    case 4:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            throw error;
                        }
                        // Cache the memory
                        this.cacheMemory(data.id, data, 'long_term');
                        return [2 /*return*/, data.id];
                }
            });
        });
    };
    // Search short-term memory using embeddings
    MemoryManager.prototype.searchShortTermMemory = function (queryEmbedding_1) {
        return __awaiter(this, arguments, void 0, function (queryEmbedding, limit, threshold) {
            var _a, data, error;
            if (limit === void 0) { limit = 5; }
            if (threshold === void 0) { threshold = 0.7; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.userId) {
                            throw new Error('User ID required for short-term memory search');
                        }
                        return [4 /*yield*/, this.supabase.rpc('search_short_term_memory', {
                                query_embedding: queryEmbedding,
                                match_threshold: threshold,
                                match_count: limit,
                                p_user_id: this.userId,
                                p_enterprise_id: this.enterpriseId,
                            })];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            throw error;
                        }
                        return [2 /*return*/, data];
                }
            });
        });
    };
    // Search long-term memory using embeddings
    MemoryManager.prototype.searchLongTermMemory = function (queryEmbedding_1) {
        return __awaiter(this, arguments, void 0, function (queryEmbedding, limit, threshold, category) {
            var _a, data, error;
            if (limit === void 0) { limit = 10; }
            if (threshold === void 0) { threshold = 0.7; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.supabase.rpc('search_long_term_memory', {
                            query_embedding: queryEmbedding,
                            match_threshold: threshold,
                            match_count: limit,
                            p_category: category,
                            p_user_id: this.userId,
                            p_enterprise_id: this.enterpriseId,
                        })];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            throw error;
                        }
                        return [2 /*return*/, data];
                }
            });
        });
    };
    // Retrieve recent memories by type
    MemoryManager.prototype.getRecentMemories = function (memoryType_1) {
        return __awaiter(this, arguments, void 0, function (memoryType, limit, memoryStore) {
            var table, query, _a, data, error;
            if (limit === void 0) { limit = 10; }
            if (memoryStore === void 0) { memoryStore = 'short_term'; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        table = memoryStore === 'short_term' ? 'short_term_memory' : 'long_term_memory';
                        query = this.supabase
                            .from(table)
                            .select('*')
                            .eq('memory_type', memoryType)
                            .eq('enterprise_id', this.enterpriseId)
                            .order('created_at', { ascending: false })
                            .limit(limit);
                        if (memoryStore === 'short_term' && this.userId) {
                            query = query.eq('user_id', this.userId);
                        }
                        return [4 /*yield*/, query];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            throw error;
                        }
                        return [2 /*return*/, data];
                }
            });
        });
    };
    // Update memory access count and last accessed time
    MemoryManager.prototype.updateMemoryAccess = function (memoryId, memoryStore) {
        return __awaiter(this, void 0, void 0, function () {
            var table, _a, data, error;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        table = memoryStore === 'short_term' ? 'short_term_memory' : 'long_term_memory';
                        return [4 /*yield*/, this.supabase
                                .from(table)
                                .update((_b = {
                                    access_count: this.supabase.rpc('increment', { value: 1 })
                                },
                                _b[memoryStore === 'short_term' ? 'accessed_at' : 'last_accessed_at'] = new Date().toISOString(),
                                _b))
                                .eq('id', memoryId)
                                .select()
                                .single()];
                    case 1:
                        _a = _c.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            throw error;
                        }
                        if (!(memoryStore === 'short_term' && data)) return [3 /*break*/, 3];
                        if (!(data.access_count >= this.consolidationThreshold ||
                            data.importance_score >= this.importanceThreshold)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.promoteToLongTerm(data)];
                    case 2:
                        _c.sent();
                        _c.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Promote short-term memory to long-term
    MemoryManager.prototype.promoteToLongTerm = function (shortTermMemory) {
        return __awaiter(this, void 0, void 0, function () {
            var summary, category;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.generateSummary(shortTermMemory.content)];
                    case 1:
                        summary = _a.sent();
                        category = this.categorizeMemory(shortTermMemory);
                        // Store in long-term memory
                        return [4 /*yield*/, this.storeLongTermMemory(shortTermMemory.memory_type, category, shortTermMemory.content, summary, shortTermMemory.context, shortTermMemory.importance_score, shortTermMemory.embedding)];
                    case 2:
                        // Store in long-term memory
                        _a.sent();
                        // Remove from short-term memory
                        return [4 /*yield*/, this.supabase
                                .from('short_term_memory')
                                .delete()
                                .eq('id', shortTermMemory.id)];
                    case 3:
                        // Remove from short-term memory
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Consolidate memories
    MemoryManager.prototype.consolidateMemories = function (existingMemoryId, newContent, newContext) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, existing, error, consolidatedContent, consolidatedContext;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('long_term_memory')
                            .select('*')
                            .eq('id', existingMemoryId)
                            .single()];
                    case 1:
                        _a = _b.sent(), existing = _a.data, error = _a.error;
                        if (error) {
                            throw error;
                        }
                        consolidatedContent = "".concat(existing.content, "\n\n---\n\n").concat(newContent);
                        consolidatedContext = __assign(__assign(__assign({}, existing.context), newContext), { consolidation_history: __spreadArray(__spreadArray([], (existing.context.consolidation_history || []), true), [
                                {
                                    timestamp: new Date().toISOString(),
                                    added_content: newContent,
                                },
                            ], false) });
                        // Update memory
                        return [4 /*yield*/, this.supabase
                                .from('long_term_memory')
                                .update({
                                content: consolidatedContent,
                                context: consolidatedContext,
                                consolidation_count: existing.consolidation_count + 1,
                                consolidated_at: new Date().toISOString(),
                            })
                                .eq('id', existingMemoryId)];
                    case 2:
                        // Update memory
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Clean up expired short-term memories
    MemoryManager.prototype.cleanupExpiredMemories = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('short_term_memory')
                            .delete()
                            .lt('expires_at', new Date().toISOString())
                            .eq('enterprise_id', this.enterpriseId)];
                    case 1:
                        error = (_a.sent()).error;
                        if (error) {
                            throw error;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    // Memory decay - reduce importance of unused memories
    MemoryManager.prototype.applyMemoryDecay = function () {
        return __awaiter(this, arguments, void 0, function (decayRate) {
            var thirtyDaysAgo;
            if (decayRate === void 0) { decayRate = 0.95; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
                        return [4 /*yield*/, this.supabase.rpc('apply_memory_decay', {
                                decay_rate: decayRate,
                                cutoff_date: thirtyDaysAgo,
                                p_enterprise_id: this.enterpriseId,
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Generate summary for memory content
    MemoryManager.prototype.generateSummary = function (content) {
        return __awaiter(this, void 0, void 0, function () {
            var maxLength;
            return __generator(this, function (_a) {
                maxLength = 200;
                if (content.length <= maxLength) {
                    return [2 /*return*/, content];
                }
                return [2 /*return*/, "".concat(content.substring(0, maxLength), "...")];
            });
        });
    };
    // Categorize memory based on type and context
    MemoryManager.prototype.categorizeMemory = function (memory) {
        var memory_type = memory.memory_type, context = memory.context;
        // Define category mapping
        var categoryMap = {
            contract_analysis: 'contracts',
            vendor_evaluation: 'vendors',
            budget_tracking: 'finance',
            compliance_check: 'compliance',
            user_preference: 'preferences',
            workflow_state: 'workflows',
            decision_history: 'decisions',
            insight_generated: 'insights',
        };
        return categoryMap[memory_type] || 'general';
    };
    // Cache memory for quick access
    MemoryManager.prototype.cacheMemory = function (id, memory, store) {
        if (!(0, index_ts_1.getFeatureFlag)('ENABLE_CACHING')) {
            return;
        }
        var cacheKey = "memory_".concat(store, "_").concat(id, "_").concat(this.enterpriseId);
        var ttl = store === 'short_term' ?
            (0, index_ts_1.getCacheTTL)('SHORT_TERM_MEMORY') :
            (0, index_ts_1.getCacheTTL)('LONG_TERM_MEMORY');
        this.cache.set(cacheKey, memory, ttl);
    };
    // Get memory from cache or database
    MemoryManager.prototype.getMemory = function (id, store) {
        return __awaiter(this, void 0, void 0, function () {
            var cacheKey, cached, table, _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        cacheKey = "memory_".concat(store, "_").concat(id, "_").concat(this.enterpriseId);
                        // Check cache first
                        if ((0, index_ts_1.getFeatureFlag)('ENABLE_CACHING')) {
                            cached = this.cache.get(cacheKey);
                            if (cached) {
                                return [2 /*return*/, cached];
                            }
                        }
                        table = store === 'short_term' ? 'short_term_memory' : 'long_term_memory';
                        return [4 /*yield*/, this.supabase
                                .from(table)
                                .select('*')
                                .eq('id', id)
                                .eq('enterprise_id', this.enterpriseId)
                                .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error || !data) {
                            return [2 /*return*/, null];
                        }
                        // Update cache
                        this.cacheMemory(id, data, store);
                        return [2 /*return*/, data];
                }
            });
        });
    };
    // Get memory statistics
    MemoryManager.prototype.getMemoryStats = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, shortTermStats, longTermStats, categoryCounts, _i, _b, item;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            this.supabase
                                .from('short_term_memory')
                                .select('id', { count: 'exact' })
                                .eq('enterprise_id', this.enterpriseId)
                                .eq('user_id', this.userId || ''),
                            this.supabase
                                .from('long_term_memory')
                                .select('category', { count: 'exact' })
                                .eq('enterprise_id', this.enterpriseId),
                        ])];
                    case 1:
                        _a = _c.sent(), shortTermStats = _a[0], longTermStats = _a[1];
                        categoryCounts = {};
                        if (longTermStats.data) {
                            for (_i = 0, _b = longTermStats.data; _i < _b.length; _i++) {
                                item = _b[_i];
                                categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
                            }
                        }
                        return [2 /*return*/, {
                                shortTermCount: shortTermStats.count || 0,
                                longTermCount: longTermStats.count || 0,
                                totalMemorySize: (shortTermStats.count || 0) + (longTermStats.count || 0),
                                categoryCounts: categoryCounts,
                            }];
                }
            });
        });
    };
    return MemoryManager;
}());
exports.MemoryManager = MemoryManager;
