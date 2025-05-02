#!/usr/bin/env node

/**
 * Comprehensive Render.yaml Validator
 *
 * This script thoroughly validates the render.yaml file,
 * specifically focusing on service references and using
 * a line-by-line approach to ensure all references are caught.
 */

const fs = require("fs");
const path = require("path");

// Constants
const VALID_PROPERTIES = ["connectionString", "host", "hostport", "port"];
const renderYamlPath = "./render.yaml";

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

// Main validation function
function validate() {
  console.log(
    `\n${colors.bold}${colors.cyan}RENDER.YAML VALIDATOR${colors.reset}\n`
  );

  // Read render.yaml
  let content;
  try {
    content = fs.readFileSync(renderYamlPath, "utf8");
    console.log(
      `${colors.green}✓${colors.reset} Successfully read ${renderYamlPath}\n`
    );
  } catch (err) {
    console.error(
      `${colors.red}✗${colors.reset} Failed to read ${renderYamlPath}: ${err.message}`
    );
    process.exit(1);
  }

  // Split into lines for analysis
  const lines = content.split("\n");

  // Step 1: Find all service references
  console.log(`${colors.bold}CHECKING SERVICE REFERENCES${colors.reset}\n`);

  const serviceRefs = [];
  let currentEnvVar = null;
  let currentService = null;
  let inFromService = false;
  let tempRef = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Track current service
    if (line.startsWith("- type: web") || line.startsWith("- type: worker")) {
      for (let j = i + 1; j < i + 5; j++) {
        if (lines[j].includes("name:")) {
          currentService = lines[j].split("name:")[1].trim();
          break;
        }
      }
    }

    // Track environment variable
    if (line.startsWith("- key:")) {
      currentEnvVar = line.split("- key:")[1].trim();
    }

    // Detect fromService section start
    if (line === "fromService:") {
      inFromService = true;
      tempRef = {
        service: currentService,
        envVar: currentEnvVar,
        referencedService: null,
        type: null,
        property: null,
        lineNumber: i + 1,
      };
    }

    // Collect details from fromService section
    if (inFromService) {
      if (line.includes("name:")) {
        tempRef.referencedService = line.split("name:")[1].trim();
      } else if (line.includes("type:")) {
        tempRef.type = line.split("type:")[1].trim();
      } else if (line.includes("property:")) {
        tempRef.property = line.split("property:")[1].trim();

        // We've collected all the data we need
        serviceRefs.push({ ...tempRef });
        inFromService = false;
      }
    }
  }

  console.log(`Found ${serviceRefs.length} service reference(s):\n`);

  // Step 2: Validate each reference
  let hasErrors = false;

  for (let i = 0; i < serviceRefs.length; i++) {
    const ref = serviceRefs[i];

    console.log(`${colors.bold}Reference #${i + 1}:${colors.reset}`);
    console.log(`  Service: ${ref.service}`);
    console.log(`  Environment Variable: ${ref.envVar}`);
    console.log(`  References: ${ref.referencedService}`);
    console.log(`  Type: ${ref.type}`);
    console.log(`  Property: ${ref.property}`);
    console.log(`  Line: ${ref.lineNumber}`);

    // Validate property
    if (VALID_PROPERTIES.includes(ref.property)) {
      console.log(
        `  ${colors.green}✓${colors.reset} "${ref.property}" is a valid property\n`
      );
    } else {
      console.log(
        `  ${colors.red}✗${colors.reset} "${ref.property}" is NOT a valid property`
      );
      console.log(`    Valid properties are: ${VALID_PROPERTIES.join(", ")}\n`);
      hasErrors = true;
    }
  }

  // Summary
  if (hasErrors) {
    console.log(
      `${colors.red}${colors.bold}Validation FAILED.${colors.reset} Please fix the issues above.`
    );
    process.exit(1);
  } else {
    console.log(
      `${colors.green}${colors.bold}Validation PASSED.${colors.reset} All service references use valid properties.`
    );
    process.exit(0);
  }
}

// Run validation
validate();
