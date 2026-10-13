#!/usr/bin/env node

/**
 * OPAC Schedule Backup Script
 *
 * This script sets up automated daily backups using cron.
 * It can be used with system cron or as a standalone scheduler.
 */

const cron = require('cron');
const { backupDatabase } = require('./backup');
const path = require('path');
const fs = require('fs');

// Configuration
const BACKUP_SCHEDULE = process.env.BACKUP_SCHEDULE || '0 2 * * *'; // Daily at 2 AM
const LOG_DIR = path.join(__dirname, '../logs');

// Create log directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function setupCronJob() {
  console.log('Setting up automated backup schedule...');
  console.log(`Schedule: ${BACKUP_SCHEDULE}`);
  console.log(`Logs directory: ${LOG_DIR}`);
  console.log('Press Ctrl+C to stop the scheduler\n');

  const job = new cron.CronJob(
    BACKUP_SCHEDULE,
    async () => {
      console.log(`[${new Date().toISOString()}] Running scheduled backup...`);

      try {
        await backupDatabase();
        console.log(`[${new Date().toISOString()}] Scheduled backup completed successfully`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Scheduled backup failed:`, error);
      }
    },
    null, // onComplete
    true, // start
    'UTC' // timezone
  );

  // Log when job is scheduled
  console.log(`Next backup scheduled for: ${job.nextDate().toISOString()}`);

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\nStopping backup scheduler...');
    job.stop();
    process.exit(0);
  });
}

// Alternative: Use node-cron for cross-platform compatibility
function setupNodeCronJob() {
  const cron = require('node-cron');

  console.log('Setting up automated backup schedule (node-cron)...');
  console.log(`Schedule: ${BACKUP_SCHEDULE}`);

  const task = cron.schedule(
    BACKUP_SCHEDULE,
    async () => {
      console.log(`[${new Date().toISOString()}] Running scheduled backup...`);

      try {
        await backupDatabase();
        console.log(`[${new Date().toISOString()}] Scheduled backup completed successfully`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Scheduled backup failed:`, error);
      }
    },
    {
      scheduled: true,
      timezone: 'UTC'
    }
  );

  console.log(`Backup scheduler started. Next run: ${task.nextDate()}`);

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\nStopping backup scheduler...');
    task.stop();
    process.exit(0);
  });
}

// Manual backup function
async function runManualBackup() {
  console.log('Running manual backup...');
  try {
    await backupDatabase();
    console.log('Manual backup completed successfully');
  } catch (error) {
    console.error('Manual backup failed:', error);
    process.exit(1);
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'manual':
    runManualBackup();
    break;

  case 'schedule':
    // Check if node-cron is available
    try {
      require.resolve('node-cron');
      setupNodeCronJob();
    } catch (e) {
      console.log('node-cron not available, using basic cron (requires cron module)');
      setupCronJob();
    }
    break;

  case 'test':
    console.log('Testing backup...');
    // Use a test schedule (every minute) for testing
    process.env.BACKUP_SCHEDULE = '* * * * *';
    try {
      require.resolve('node-cron');
      require('node-cron').schedule(
        '* * * * *',
        () => {
          console.log('Test backup would run now...');
          console.log('Test completed successfully - scheduler is working');
          process.exit(0);
        },
        { scheduled: true, timezone: 'UTC' }
      );
    } catch (e) {
      console.log('Test mode requires node-cron module');
    }
    break;

  default:
    console.log('OPAC Backup Scheduler');
    console.log('====================');
    console.log('Usage:');
    console.log('  node schedule-backup.js manual    - Run backup now');
    console.log('  node schedule-backup.js schedule  - Start scheduler');
    console.log('  node schedule-backup.js test      - Test scheduler');
    console.log('');
    console.log('Environment variables:');
    console.log('  BACKUP_SCHEDULE - Cron schedule (default: "0 2 * * *")');
    console.log('  SUPABASE_URL - Your Supabase project URL');
    console.log('  SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key');
    break;
}