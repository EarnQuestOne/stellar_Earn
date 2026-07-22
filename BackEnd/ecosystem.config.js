/**
 * PM2 Ecosystem Config — Production
 *
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 reload ecosystem.config.js --env production   # zero-downtime reload
 *   pm2 stop stellar-earn-api
 *
 * Profiling (heap snapshot):
 *   Set PROFILING_ENABLED=true and POST /api/v1/process/heap/snapshot
 *   Then load the .heapsnapshot file in Chrome DevTools → Memory tab.
 *
 * Manual GC:
 *   node_args includes --expose-gc so POST /api/v1/process/gc works.
 */
module.exports = {
  apps: [
    {
      name: 'stellar-earn-api',

      // Entry point after `npm run build`
      script: './dist/main.js',

      // ─── Cluster mode ────────────────────────────────────────────────────
      exec_mode: 'cluster',
      // Use all available CPUs; set a fixed number for predictable memory budgets
      instances: process.env.PM2_INSTANCES || 'max',

      // ─── Node.js flags ───────────────────────────────────────────────────
      node_args: [
        // Hard cap on V8 heap — must match RESOURCE_MAX_HEAP_MB in .env
        '--max-old-space-size=512',
        // Expose gc() for manual GC via POST /api/v1/process/gc
        '--expose-gc',
        // Optimise for production workloads
        '--optimize-for-size',
      ].join(' '),

      // ─── Env: production ─────────────────────────────────────────────────
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,

        // Resource limits (must align with --max-old-space-size above)
        RESOURCE_MAX_HEAP_MB: 512,
        RESOURCE_MAX_RSS_MB: 768,
        RESOURCE_HEAP_WARN_PERCENT: 75,
        RESOURCE_HEAP_CRITICAL_PERCENT: 90,
        RESOURCE_EXIT_ON_HEAP_CRITICAL: false,
        RESOURCE_MONITOR_INTERVAL_MS: 30000,

        // Profiling — disabled by default in production; enable transiently
        PROFILING_ENABLED: false,
        PROFILING_DIR: './profiles',
        PROFILING_MAX_DURATION_MS: 30000,
      },

      // ─── Env: staging ────────────────────────────────────────────────────
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
        RESOURCE_MAX_HEAP_MB: 512,
        RESOURCE_MAX_RSS_MB: 768,
        RESOURCE_HEAP_WARN_PERCENT: 70,
        RESOURCE_HEAP_CRITICAL_PERCENT: 85,
        RESOURCE_EXIT_ON_HEAP_CRITICAL: false,
        RESOURCE_MONITOR_INTERVAL_MS: 15000,
        PROFILING_ENABLED: true,
        PROFILING_DIR: './profiles',
        PROFILING_MAX_DURATION_MS: 60000,
      },

      // ─── Auto-restart policy ─────────────────────────────────────────────
      // Restart if the process exceeds 700 MB RSS — safety net on top of
      // the soft ResourceLimitsService threshold.
      max_memory_restart: '700M',

      // Exponential backoff on crashes: 100 ms → 200 ms → ... → 10 s cap
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '10s',

      // ─── Logging ─────────────────────────────────────────────────────────
      output: './logs/pm2-out.log',
      error: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // ─── Graceful shutdown ───────────────────────────────────────────────
      // Give the app 15 s to drain in-flight requests on SIGTERM
      kill_timeout: 15000,
      listen_timeout: 10000,
      wait_ready: true,

      // ─── Source maps ─────────────────────────────────────────────────────
      source_map_support: true,

      // ─── Watch (dev only) ────────────────────────────────────────────────
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'profiles', '*.log'],
    },
  ],
};
