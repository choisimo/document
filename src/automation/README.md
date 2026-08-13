# Scripts Directory

Organized automation scripts for backup, deployment, maintenance, and utilities.

> Inventory note: this list may lag the current revision. Read the target script, inspect defaults and dependencies, and record the exact revision and arguments before execution.
> Safety contract: use least privilege, canary or dry-run where implemented, exclusive locking for schedules, bounded retries, and a tested rollback. A directory category or filename does not establish safety.

## 📁 Directory Structure

### `backup/` - Backup & Synchronization
Scripts for data backup and synchronization:
- **`rsync_nas_fetch.sh`** - NAS data synchronization script

### `deployment/` - Deployment Automation
Scripts for application and service deployment:
- **`deploy.sh`** - Node.js application deployment
- **`loadbalancing-server-sync.sh`** - Load balancer synchronization

### `maintenance/` - System Maintenance
Scripts for system cleanup and maintenance:
- **`clean-docker.sh`** - Docker container and image cleanup

### `utilities/` - General Utilities
General-purpose utility scripts:
- **`password-encryptor.sh`** - Password encryption utility
- **`project-summary.sh`** - Generate project summaries
- **`rename.sh`** - Batch file renaming
- **`node-serve.sh`** - Quick Node.js server startup
- **`schedule.py`** - Task scheduling utility
- **`schedule_db.py`** - Database-backed scheduling
- **`remove_citation.sh`** - Remove citations from documents
- **`shell_scripts.txt`** - Shell script reference

## Usage Guidelines

### Running Scripts

Most scripts can be executed directly:
```bash
./src/automation/backup/rsync_nas_fetch.sh
```

Ensure scripts have execute permissions:
```bash
chmod +x scripts/path/to/script.sh
```

### Safety Notes

- **Backup scripts**: Review paths before running
- **Deployment scripts**: Test in staging first
- **Maintenance scripts**: Understand what will be deleted
- **Utilities**: Check parameters and options

### Script Categories

**Automation candidates (schedule only after review):**
- Backup scripts
- Monitoring scripts

A scheduled backup is complete only when source/target manifests, exit status, retention, alert delivery, and a representative restore are checked.

**Manual (Require review):**
- Deployment scripts
- Maintenance/cleanup scripts

**Interactive (Require input):**
- Password encryption
- File renaming utilities

## Adding New Scripts

When adding new scripts:
1. Place in appropriate category directory
2. Use descriptive filenames
3. Add shebang line (`#!/bin/bash` or `#!/usr/bin/env python3`)
4. Include usage comments at top of file
5. Make executable: `chmod +x script.sh`
6. Update this README if adding new categories

## Common Patterns

### Backup Scripts
- Use rsync for efficiency
- Log operations
- Handle errors gracefully
- Support dry-run mode

### Deployment Scripts
- Check prerequisites
- Backup before deploy
- Rollback capability
- Status verification

### Maintenance Scripts
- Confirm before destructive operations
- Provide verbose output
- Log actions taken
- Support dry-run mode
