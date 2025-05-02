#!/usr/bin/env node

/**
 * Render Deployment Test Script
 *
 * This script tests a deployed Render application by checking:
 * - Backend API health
 * - Frontend availability
 * - API endpoints
 * - WebSocket connections
 * - Environment variables
 *
 * Usage:
 *   node test-render-deployment.js --backend-url=https://chat-app-backend.onrender.com --frontend-url=https://chat-app-frontend.onrender.com
 */

const http = require("http");
const https = require("https");
const { URL } = require("url");
const { spawn } = require("child_process");

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith("--")) {
    const [key, value] = arg.slice(2).split("=");
    acc[key] = value;
  }
  return acc;
}, {});

// Configuration
const config = {
  backendUrl: args["backend-url"] || "http://localhost:4500",
  frontendUrl: args["frontend-url"] || "http://localhost:80",
  verbose: args["verbose"] === "true",
  timeout: parseInt(args["timeout"] || "5000", 10),
};

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

// Helper functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) =>
    console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}`),
};

// Test Results
const results = {
  passed: 0,
  failed: 0,
  total: 0,
};

// Make HTTP(S) request
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === "https:" ? https : http;
    const req = client.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.setTimeout(config.timeout, () => {
      req.abort();
      reject(new Error(`Request timeout after ${config.timeout}ms`));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Test backend health
async function testBackendHealth() {
  log.section("BACKEND HEALTH CHECK");

  try {
    log.info(`Testing backend health at ${config.backendUrl}`);
    const response = await request(config.backendUrl);

    if (response.statusCode === 200) {
      log.success(`Backend is healthy (Status: ${response.statusCode})`);
      results.passed++;
    } else {
      log.error(`Backend health check failed (Status: ${response.statusCode})`);
      results.failed++;
    }

    if (config.verbose) {
      log.info("Response headers:");
      console.log(response.headers);
      log.info("Response body:");
      console.log(response.data);
    }
  } catch (err) {
    log.error(`Backend health check error: ${err.message}`);
    results.failed++;
  }

  results.total++;
}

// Test frontend availability
async function testFrontend() {
  log.section("FRONTEND AVAILABILITY CHECK");

  try {
    log.info(`Testing frontend at ${config.frontendUrl}`);
    const response = await request(config.frontendUrl);

    if (response.statusCode === 200) {
      // Check for expected content
      if (response.data.includes("<html") && response.data.includes("<body")) {
        log.success(`Frontend is available (Status: ${response.statusCode})`);
        results.passed++;
      } else {
        log.warning(
          `Frontend response doesn't look like HTML (Status: ${response.statusCode})`
        );
        results.failed++;
      }
    } else {
      log.error(`Frontend check failed (Status: ${response.statusCode})`);
      results.failed++;
    }

    if (config.verbose) {
      log.info("Response headers:");
      console.log(response.headers);
    }
  } catch (err) {
    log.error(`Frontend check error: ${err.message}`);
    results.failed++;
  }

  results.total++;
}

// Test API endpoints
async function testApiEndpoints() {
  log.section("API ENDPOINT TESTS");

  const endpoints = [
    { path: "/api/health", method: "GET", expectedStatus: 200 },
    { path: "/api/users", method: "GET", expectedStatus: 200 },
    // Add more endpoints as needed
  ];

  for (const endpoint of endpoints) {
    try {
      const url = `${config.backendUrl}${endpoint.path}`;
      log.info(`Testing ${endpoint.method} ${url}`);

      const response = await request(url, { method: endpoint.method });

      if (response.statusCode === endpoint.expectedStatus) {
        log.success(`${endpoint.path} passed (Status: ${response.statusCode})`);
        results.passed++;
      } else {
        log.error(
          `${endpoint.path} failed (Status: ${response.statusCode}, Expected: ${endpoint.expectedStatus})`
        );
        results.failed++;
      }

      if (config.verbose) {
        log.info(`Response body for ${endpoint.path}:`);
        console.log(response.data);
      }
    } catch (err) {
      log.error(`API test error for ${endpoint.path}: ${err.message}`);
      results.failed++;
    }

    results.total++;
  }
}

// Test WebSocket connection
async function testWebSocketConnection() {
  log.section("WEBSOCKET CONNECTION TEST");
  log.info(`Testing WebSocket connection to ${config.backendUrl}`);

  // Run the socket test script as a separate process
  return new Promise((resolve) => {
    const wsUrl = config.backendUrl.replace(/^http/, "ws");
    const socketTest = spawn("node", ["test-socket-connection.js", wsUrl], {
      stdio: "inherit",
    });

    socketTest.on("close", (code) => {
      if (code === 0) {
        log.success("WebSocket connection test passed");
        results.passed++;
      } else {
        log.error(`WebSocket connection test failed with code ${code}`);
        results.failed++;
      }
      results.total++;
      resolve();
    });
  });
}

// Check environment variables through API
async function testEnvironmentVariables() {
  log.section("ENVIRONMENT VARIABLES CHECK");

  try {
    // Assuming you have an endpoint that returns environment info
    const url = `${config.backendUrl}/api/env-check`;
    log.info(`Testing environment variables via ${url}`);

    const response = await request(url);

    if (response.statusCode === 200) {
      try {
        const envData = JSON.parse(response.data);
        const requiredVars = ["NODE_ENV", "PORT"];
        const missingVars = [];

        for (const variable of requiredVars) {
          if (!envData[variable]) {
            missingVars.push(variable);
          }
        }

        if (missingVars.length === 0) {
          log.success("All required environment variables are set");
          results.passed++;
        } else {
          log.error(`Missing environment variables: ${missingVars.join(", ")}`);
          results.failed++;
        }

        if (config.verbose) {
          log.info("Environment variables:");
          console.log(envData);
        }
      } catch (err) {
        log.error(`Failed to parse environment data: ${err.message}`);
        results.failed++;
      }
    } else {
      log.error(`Environment check failed (Status: ${response.statusCode})`);
      results.failed++;
    }
  } catch (err) {
    log.error(`Environment check error: ${err.message}`);
    results.failed++;
  }

  results.total++;
}

// Run all tests
async function runTests() {
  log.section("RENDER DEPLOYMENT TEST");
  log.info(`Backend URL: ${config.backendUrl}`);
  log.info(`Frontend URL: ${config.frontendUrl}`);
  log.info(`Timeout: ${config.timeout}ms`);
  log.info(`Verbose mode: ${config.verbose ? "On" : "Off"}`);

  const startTime = Date.now();

  await testBackendHealth();
  await testFrontend();
  await testApiEndpoints();
  await testWebSocketConnection();
  await testEnvironmentVariables();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print summary
  log.section("TEST SUMMARY");
  console.log(`
${colors.bold}Total Tests:${colors.reset} ${results.total}
${colors.bold}Passed:${colors.reset} ${colors.green}${results.passed}${colors.reset}
${colors.bold}Failed:${colors.reset} ${colors.red}${results.failed}${colors.reset}
${colors.bold}Duration:${colors.reset} ${duration}s
  `);

  if (results.failed === 0) {
    log.success("All tests passed!");
    process.exit(0);
  } else {
    log.error(`${results.failed} test(s) failed.`);
    process.exit(1);
  }
}

// Handle errors
process.on("uncaughtException", (err) => {
  log.error(`Uncaught exception: ${err.message}`);
  console.error(err);
  process.exit(1);
});

// Run the tests
runTests();
