# Agent Tasks Performance Optimization Guide

## Overview

This document describes the performance optimizations implemented for the `agent_tasks` table, which is critical for the agent system's scalability and responsiveness.

## Index Strategy

### 1. Queue Processing Index
```sql
idx_agent_tasks_queue_processing
ON agent_tasks(enterprise_id, status, scheduled_at DESC, priority DESC, created_at ASC) 
WHERE status = 'pending'
```
- **Purpose**: Optimizes the main task queue processing query
- **Use Case**: Finding pending tasks ready for processing, ordered by priority
- **Expected Improvement**: 70-90% reduction in query time

### 2. Agent-Specific Status Index
```sql
idx_agent_tasks_agent_status
ON agent_tasks(agent_id, status) 
WHERE status IN ('pending', 'processing')
```
- **Purpose**: Quick retrieval of active tasks for specific agents
- **Use Case**: Agent health monitoring, workload distribution
- **Expected Improvement**: 80-95% reduction in query time

### 3. High-Priority Task Index
```sql
idx_agent_tasks_high_priority
ON agent_tasks(priority DESC, status, scheduled_at) 
WHERE priority >= 8 AND status = 'pending'
```
- **Purpose**: Fast access to urgent tasks
- **Use Case**: Priority queue processing, SLA compliance
- **Expected Improvement**: 85-95% reduction in query time for high-priority queries

### 4. Error Tracking Index
```sql
idx_agent_tasks_errors
ON agent_tasks(enterprise_id, created_at DESC) 
WHERE error IS NOT NULL
```
- **Purpose**: Efficient error analysis and debugging
- **Use Case**: Error dashboards, failure pattern analysis
- **Expected Improvement**: 90-95% reduction in query time for error queries

### 5. Reporting Index
```sql
idx_agent_tasks_reporting
ON agent_tasks(enterprise_id, completed_at DESC) 
WHERE completed_at IS NOT NULL
```
- **Purpose**: Historical reporting and analytics
- **Use Case**: Performance metrics, throughput analysis
- **Expected Improvement**: 75-90% reduction in query time for date-range queries

## Monitoring Views

### 1. Queue Status View
```sql
agent_task_queue_status
```
Provides real-time queue metrics:
- Task count by status
- Average task age
- Priority distribution
- Next scheduled task

### 2. Performance Metrics (Materialized View)
```sql
agent_task_performance_metrics
```
Pre-aggregated performance data:
- Hourly task completion rates
- Processing time percentiles (p50, p95)
- Failure rates by agent type
- Retry statistics

## Utility Functions

### 1. Queue Health Analysis
```sql
analyze_task_queue_health(enterprise_id)
```
Returns comprehensive health metrics:
- Pending/processing task counts
- Average wait times
- Oldest task age
- Health status (healthy/warning/critical)

### 2. Throughput Statistics
```sql
get_task_throughput_stats(enterprise_id, time_range)
```
Provides throughput metrics:
- Tasks per hour
- Success rates
- Average completion times
- Agent utilization

## Best Practices

### 1. Query Optimization
- Always include `enterprise_id` in WHERE clauses
- Use the appropriate status filters
- Leverage partial indexes for specific scenarios

### 2. Maintenance
- Refresh materialized view hourly:
  ```sql
  SELECT refresh_agent_task_metrics();
  ```
- Monitor index usage:
  ```sql
  SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
  FROM pg_stat_user_indexes
  WHERE tablename = 'agent_tasks'
  ORDER BY idx_scan DESC;
  ```

### 3. Scaling Considerations
- Partition by enterprise_id for >10M tasks
- Archive completed tasks older than 90 days
- Use read replicas for reporting queries

## Performance Benchmarks

Expected improvements with indexes:
- Queue processing: 70-90% faster
- Agent task retrieval: 80-95% faster
- High-priority queries: 85-95% faster
- Error tracking: 90-95% faster
- Reporting queries: 75-90% faster

## Monitoring Queries

### Check Index Usage
```sql
SELECT 
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public' 
AND tablename = 'agent_tasks'
ORDER BY idx_scan DESC;
```

### Identify Slow Queries
```sql
SELECT 
    query,
    calls,
    total_time,
    mean,
    stddev_time,
    rows
FROM pg_stat_statements
WHERE query LIKE '%agent_tasks%'
ORDER BY mean DESC
LIMIT 20;
```

### Table Bloat Check
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    n_live_tup,
    n_dead_tup,
    round(100 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_ratio
FROM pg_stat_user_tables
WHERE tablename = 'agent_tasks';
```

## Troubleshooting

### High Query Times
1. Check if indexes are being used: `EXPLAIN ANALYZE <query>`
2. Verify statistics are up to date: `ANALYZE agent_tasks;`
3. Check for lock contention: `SELECT * FROM pg_locks WHERE relation = 'agent_tasks'::regclass;`

### Index Bloat
1. Check index size: `SELECT pg_size_pretty(pg_relation_size('index_name'));`
2. Rebuild if needed: `REINDEX INDEX CONCURRENTLY index_name;`

### Poor Cardinality Estimates
1. Update statistics: `ANALYZE agent_tasks;`
2. Increase statistics target if needed:
   ```sql
   ALTER TABLE agent_tasks ALTER COLUMN status SET STATISTICS 1000;
   ANALYZE agent_tasks;
   ```