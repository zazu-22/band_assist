# Migration Rollback Scripts

This directory contains rollback scripts for Supabase migrations. Each rollback script reverses the changes made by its corresponding forward migration.

## Usage

**⚠️ WARNING: Rollbacks may result in data loss. Always backup your database before running rollback scripts.**

To rollback a migration:

```bash
# Connect to your Supabase database
psql <your-connection-string>

# Run the rollback script
\i supabase/migrations/rollback/XXX_rollback_<migration_name>.sql
```

## Available Rollbacks

- **001_rollback_initial_schema.sql** - Reverts the initial database schema
- **003_rollback_multi_user_bands.sql** - Reverts multi-user band support (⚠️ loses band association data)
- **004_rollback_update_rls_policies.sql** - Reverts RLS policy updates

## Notes

- Rollback scripts should be run in **reverse order** of the forward migrations
- Always test rollbacks in a non-production environment first
- Some rollbacks may not be reversible without data loss (especially 003)
- Migration 002 (enable_realtime) doesn't require a rollback as it only enables features
- Migration 005 (migrate_existing_data) doesn't require a rollback as it's a data migration

## Best Practices

1. **Backup First**: Always backup your database before running migrations or rollbacks
2. **Test in Staging**: Test rollbacks in a staging environment before production
3. **Document State**: Document your database state before and after rollbacks
4. **Data Migration**: For migrations involving data (like 005), consider manual data recovery instead of automated rollbacks
