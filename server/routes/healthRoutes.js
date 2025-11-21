const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const logger = require("../utils/logger");
const { version } = require("../../package.json");

// Server start time for uptime calculation
const serverStartTime = Date.now();

/**
 * GET /health
 * Comprehensive health check endpoint
 * Returns detailed status of all critical services
 */
router.get("/health", async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - serverStartTime) / 1000); // in seconds

    // Check database status
    const databaseStatus = {
      status: "unknown",
      type: "mongodb",
      message: "",
    };

    try {
      const dbState = mongoose.connection.readyState;
      const dbStateMap = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting",
      };

      databaseStatus.status = dbStateMap[dbState] || "unknown";
      databaseStatus.host = mongoose.connection.host || "unknown";

      // Check if using mock DB
      if (mongoose.connection.isMockDB) {
        databaseStatus.status = "mock";
        databaseStatus.type = "mock-db";
        databaseStatus.message = "Using in-memory mock database (development only)";
      }

      // Additional check: can we actually query the database?
      if (dbState === 1 && !mongoose.connection.isMockDB) {
        // Quick ping to verify database is responsive
        await mongoose.connection.db.admin().ping();
        databaseStatus.message = "Database connection healthy";
      }
    } catch (dbError) {
      databaseStatus.status = "error";
      databaseStatus.message = dbError.message;
      logger.db.error("Health check: Database error", {
        error: dbError.message,
      });
    }

    // Check Socket.IO status
    const socketIOStatus = {
      status: "unknown",
      connections: 0,
      message: "",
    };

    try {
      // Socket.IO instance is attached to the app via middleware
      // We'll get it from the request object if available
      const io = req.app.get("io");
      if (io && io.engine) {
        socketIOStatus.status = "active";
        socketIOStatus.connections = io.engine.clientsCount || 0;
        socketIOStatus.message = `${socketIOStatus.connections} active connections`;
      } else {
        socketIOStatus.status = "inactive";
        socketIOStatus.message = "Socket.IO not initialized";
      }
    } catch (socketError) {
      socketIOStatus.status = "error";
      socketIOStatus.message = socketError.message;
      logger.socket.error("Health check: Socket.IO error", {
        error: socketError.message,
      });
    }

    // Server metrics
    const serverMetrics = {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
        rss: process.memoryUsage().rss,
      },
      cpu: process.cpuUsage(),
      pid: process.pid,
    };

    // Determine overall health status
    let overallStatus = "healthy";
    let httpStatus = 200;

    // Critical: Database must be connected (not disconnected or error)
    if (
      databaseStatus.status === "disconnected" ||
      databaseStatus.status === "error"
    ) {
      overallStatus = "unhealthy";
      httpStatus = 503; // Service Unavailable
    }

    // Warning: Socket.IO issues are concerning but not critical
    if (
      socketIOStatus.status === "error" ||
      socketIOStatus.status === "inactive"
    ) {
      if (overallStatus === "healthy") {
        overallStatus = "degraded";
        httpStatus = 200; // Still return 200 for degraded state
      }
    }

    const healthData = {
      status: overallStatus,
      timestamp,
      uptime,
      version,
      environment: process.env.NODE_ENV || "development",
      database: databaseStatus,
      socketIO: socketIOStatus,
      server: serverMetrics,
    };

    // Log health check (debug level to avoid noise)
    logger.system.debug("Health check performed", {
      status: overallStatus,
      database: databaseStatus.status,
      socketIO: socketIOStatus.status,
    });

    res.status(httpStatus).json(healthData);
  } catch (error) {
    logger.system.error("Health check endpoint error", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      message: "Health check failed",
      error: error.message,
    });
  }
});

/**
 * GET /health/readiness
 * Kubernetes-style readiness probe
 * Returns 200 if service is ready to accept traffic
 */
router.get("/health/readiness", async (req, res) => {
  try {
    // Check if database is connected
    const dbState = mongoose.connection.readyState;

    if (dbState === 1) {
      // Connected
      res.status(200).json({
        status: "ready",
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: "not ready",
        timestamp: new Date().toISOString(),
        reason: "database not connected",
      });
    }
  } catch (error) {
    res.status(503).json({
      status: "not ready",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * GET /health/liveness
 * Kubernetes-style liveness probe
 * Returns 200 if service is alive (even if not fully operational)
 */
router.get("/health/liveness", (req, res) => {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
  });
});

module.exports = router;
