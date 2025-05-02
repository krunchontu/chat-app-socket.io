#!/usr/bin/env node

/**
 * render.yaml Validation Script
 *
 * This script validates a render.yaml configuration file, checking for:
 * - File existence and format
 * - Service configuration correctness
 * - Docker contexts and paths
 * - Environment variable definitions
 * - Service-to-service references
 *
 * Usage: node validate-render-config.js [path-to-render.yaml]
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Configuration
const renderYamlPath = process.argv[2] || "./render.yaml";
const rootDir = path.dirname(path.resolve(renderYamlPath));

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

// Check if file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
}

// Main validation function
async function validateRenderYaml() {
  log.section("RENDER.YAML VALIDATION");
  log.info(`Validating: ${renderYamlPath}`);

  // Step 1: Check if render.yaml exists
  if (!fileExists(renderYamlPath)) {
    log.error(`render.yaml not found at ${renderYamlPath}`);
    process.exit(1);
  }

  // Step 2: Read render.yaml and parse it
  let renderConfig;
  try {
    const yamlContent = fs.readFileSync(renderYamlPath, "utf8");
    // Since the yaml package might not be installed, we'll just do a basic validation
    // Proper parsing would use: renderConfig = yaml.parse(yamlContent);

    // Simple validation - check for required sections
    if (!yamlContent.includes("services:")) {
      log.error('Missing "services" section in render.yaml');
    } else {
      log.success('Found "services" section');
    }

    // Count services
    const serviceMatches = yamlContent.match(/name:/g);
    const serviceCount = serviceMatches ? serviceMatches.length : 0;
    log.info(`Found ${serviceCount} service(s)`);

    // Check for Docker config
    const dockerMatches = yamlContent.match(/dockerfile/gi);
    if (dockerMatches) {
      log.success(`Found ${dockerMatches.length} Docker configuration(s)`);
    }

    // Check for environment variables
    const envVarMatches = yamlContent.match(/envVars:/g);
    if (envVarMatches) {
      log.info(`Found ${envVarMatches.length} environment variable section(s)`);
    }

    // Parse services (basic method without yaml parser)
    const services = [];
    const serviceNameRegex = /name:\s*([^\n]+)/g;
    let match;
    while ((match = serviceNameRegex.exec(yamlContent)) !== null) {
      services.push(match[1].trim());
    }

    // Step 3: Check Dockerfile paths
    log.section("CHECKING DOCKER CONFIGURATIONS");
    const dockerfileRegex = /dockerfilePath:\s*([^\n]+)/g;
    const dockerContextRegex = /dockerContext:\s*([^\n]+)/g;

    const dockerfiles = [];
    while ((match = dockerfileRegex.exec(yamlContent)) !== null) {
      dockerfiles.push(match[1].trim());
    }

    const dockerContexts = [];
    while ((match = dockerContextRegex.exec(yamlContent)) !== null) {
      dockerContexts.push(match[1].trim());
    }

    // Check each Dockerfile exists
    for (const dockerfilePath of dockerfiles) {
      const cleanPath = dockerfilePath.replace(/^['"]+|['"]+$/g, "").trim();
      const fullPath = path.resolve(rootDir, cleanPath);

      if (fileExists(fullPath)) {
        log.success(`Dockerfile exists: ${cleanPath}`);
      } else {
        log.error(`Dockerfile not found: ${cleanPath}`);
      }
    }

    // Check each Docker context exists
    for (const contextPath of dockerContexts) {
      const cleanPath = contextPath.replace(/^['"]+|['"]+$/g, "").trim();
      const fullPath = path.resolve(rootDir, cleanPath);

      if (fileExists(fullPath)) {
        log.success(`Docker context exists: ${cleanPath}`);
      } else {
        log.error(`Docker context not found: ${cleanPath}`);
      }
    }

    // Step 4: Check health check paths
    log.section("CHECKING HEALTH CHECKS");
    const healthCheckRegex = /healthCheckPath:\s*([^\n]+)/g;
    const healthChecks = [];

    while ((match = healthCheckRegex.exec(yamlContent)) !== null) {
      healthChecks.push(match[1].trim());
    }

    if (healthChecks.length > 0) {
      log.success(`Found ${healthChecks.length} health check path(s)`);
      for (let i = 0; i < healthChecks.length; i++) {
        log.info(
          `Service ${services[i] || i + 1} health check: ${healthChecks[i]}`
        );
      }
    } else {
      log.warning("No health check paths defined");
    }

    // Step 5: Check service-to-service references
    log.section("CHECKING SERVICE REFERENCES");
    const fromServiceRegex = /fromService:[^}]+name:\s*([^\n]+)/g;
    const serviceRefs = [];

    while ((match = fromServiceRegex.exec(yamlContent)) !== null) {
      serviceRefs.push(match[1].trim());
    }

    if (serviceRefs.length > 0) {
      log.success(
        `Found ${serviceRefs.length} service-to-service reference(s)`
      );

      // Validate references point to defined services
      for (const ref of serviceRefs) {
        if (services.includes(ref)) {
          log.success(`Service reference valid: ${ref}`);
        } else {
          log.error(`Service reference invalid: ${ref}`);
        }
      }
    } else {
      log.info("No service-to-service references found");
    }

    // Step 6: Check for sensitive environment variables
    log.section("CHECKING ENVIRONMENT VARIABLES");
    const sensitiveVarsRegex = /key:\s*([^\n]+)[^{]*sync:\s*false/g;
    const sensitiveVars = [];

    while ((match = sensitiveVarsRegex.exec(yamlContent)) !== null) {
      sensitiveVars.push(match[1].trim());
    }

    if (sensitiveVars.length > 0) {
      log.info(
        `Found ${sensitiveVars.length} sensitive environment variable(s):`
      );
      for (const variable of sensitiveVars) {
        log.info(`  - ${variable}`);
      }
      log.warning("Remember to set these values in the Render dashboard");
    }

    // Final summary
    log.section("VALIDATION SUMMARY");
    console.log(`
${colors.bold}Services:${colors.reset} ${services.length}
${colors.bold}Dockerfiles:${colors.reset} ${dockerfiles.length}
${colors.bold}Health Checks:${colors.reset} ${healthChecks.length}
${colors.bold}Service References:${colors.reset} ${serviceRefs.length}
${colors.bold}Sensitive Variables:${colors.reset} ${sensitiveVars.length}
    `);

    log.info("For full validation, install the Render CLI and run:");
    log.info("  npm install -g @renderinc/cli");
    log.info("  render validate");
  } catch (err) {
    log.error(`Error parsing render.yaml: ${err.message}`);
    process.exit(1);
  }
}

// Run validation
validateRenderYaml().catch((err) => {
  log.error(`Validation failed: ${err.message}`);
  process.exit(1);
});
