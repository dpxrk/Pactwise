# Deployment Scripts

This directory contains deployment and maintenance scripts for the Pactwise Supabase backend.

## Scripts Overview

### 🚀 deploy.sh
Main deployment script for deploying to different environments.

```bash
./deploy.sh <environment> [options]

# Examples:
./deploy.sh staging
./deploy.sh production --dry-run
./deploy.sh development --no-migrations
```

**Options:**
- `--no-migrations`: Skip database migrations
- `--no-functions`: Skip edge function deployment
- `--no-secrets`: Skip secret updates
- `--no-verify-jwt`: Disable JWT verification for functions
- `--dry-run`: Perform a dry run without actual deployment

### 🏥 health-check.sh
Comprehensive health check script for verifying deployment status.

```bash
./health-check.sh [environment]

# Examples:
./health-check.sh staging
./health-check.sh production
```

**Checks performed:**
- Database connectivity
- API endpoints (REST, Auth, Storage, Realtime)
- Edge function availability
- Performance metrics
- Overall system health

### 🔄 rollback.sh
Emergency rollback script for reverting deployments.

```bash
./rollback.sh <environment> <target> [options]

# Examples:
./rollback.sh production backup-20240101-120000.sql.gz
./rollback.sh staging s3://bucket/backups/backup.sql.gz
./rollback.sh production abc123def --no-database
```

**Target types:**
- Local backup file (`.sql` or `.sql.gz`)
- S3 backup URL
- Git commit hash (for function rollback)

**Options:**
- `--no-database`: Skip database rollback
- `--no-functions`: Skip function rollback
- `--force`: Force rollback without confirmation

### 🧪 smoke-tests.sh
Smoke test suite for basic functionality verification.

```bash
./smoke-tests.sh [environment]

# Examples:
./smoke-tests.sh staging
./smoke-tests.sh production
```

**Tests included:**
- Authentication
- Database connectivity
- Edge functions availability
- Storage access
- CRUD operations
- RPC functions
- Realtime connectivity
- Performance benchmarks
- Rate limiting
- Security headers

## Environment Setup

Before using these scripts, ensure you have the following:

1. **Environment files** in the project root:
   - `.env.development`
   - `.env.staging`
   - `.env.production`

2. **Required environment variables**:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   SUPABASE_ACCESS_TOKEN=your-access-token
   SUPABASE_PROJECT_ID=your-project-id
   SUPABASE_DB_PASSWORD=your-db-password
   
   # Optional for backups
   AWS_ACCESS_KEY_ID=your-aws-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret
   AWS_REGION=us-east-1
   AWS_BACKUP_BUCKET=your-backup-bucket
   
   # Optional for notifications
   SLACK_WEBHOOK=https://hooks.slack.com/services/...
   ```

3. **Required tools**:
   - Supabase CLI (v1.131.0+)
   - PostgreSQL client tools (psql, pg_dump, pg_restore)
   - AWS CLI (for S3 backups)
   - jq (for JSON processing)
   - curl

## Deployment Workflow

### Standard Deployment

1. **Run deployment**:
   ```bash
   ./deploy.sh staging
   ```

2. **Verify health**:
   ```bash
   ./health-check.sh staging
   ```

3. **Run smoke tests**:
   ```bash
   ./smoke-tests.sh staging
   ```

### Production Deployment

1. **Dry run first**:
   ```bash
   ./deploy.sh production --dry-run
   ```

2. **Create backup** (automatic for production):
   ```bash
   ./deploy.sh production
   ```

3. **Monitor deployment**:
   ```bash
   watch -n 5 ./health-check.sh production
   ```

4. **If issues occur, rollback**:
   ```bash
   ./rollback.sh production backup-production-20240101-120000.sql.gz
   ```

## Best Practices

1. **Always test in staging first**
   - Deploy to staging
   - Run full test suite
   - Verify for at least 24 hours

2. **Production deployments**
   - Schedule during low-traffic periods
   - Have rollback plan ready
   - Monitor for at least 1 hour post-deployment

3. **Backup strategy**
   - Automatic backups before production deployments
   - Keep backups for at least 30 days
   - Test restore procedures regularly

4. **Monitoring**
   - Watch error rates
   - Monitor performance metrics
   - Check user reports

## Troubleshooting

### Common Issues

1. **Authentication errors**:
   ```bash
   # Verify tokens
   echo $SUPABASE_ACCESS_TOKEN
   echo $SUPABASE_PROJECT_ID
   
   # Re-link project
   supabase link --project-ref $SUPABASE_PROJECT_ID
   ```

2. **Migration failures**:
   ```bash
   # Check migration status
   supabase db remote list
   
   # Rollback last migration
   supabase db reset --linked
   ```

3. **Function deployment issues**:
   ```bash
   # Check function logs
   supabase functions list
   
   # Deploy specific function
   supabase functions deploy function-name
   ```

### Emergency Procedures

1. **Complete system failure**:
   ```bash
   # 1. Immediate rollback
   ./rollback.sh production latest-backup.sql.gz --force
   
   # 2. Verify core services
   ./health-check.sh production
   
   # 3. Notify team
   # 4. Investigate root cause
   ```

2. **Partial failure**:
   ```bash
   # 1. Identify failing component
   ./health-check.sh production
   
   # 2. Rollback specific component
   ./rollback.sh production commit-hash --no-database
   
   # 3. Re-run health checks
   ./smoke-tests.sh production
   ```

## Script Maintenance

- Update Supabase CLI version in scripts when upgrading
- Test scripts in development environment after changes
- Keep backup retention policies up to date
- Review and update health check thresholds quarterly