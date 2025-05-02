#!/usr/bin/env node

/**
 * Service Reference Validator for render.yaml
 *
 * This script validates that service references in render.yaml use valid properties
 * according to Render.com's requirements.
 */

const fs = require("fs");

// Valid properties for service references
const VALID_PROPERTIES = ["connectionString", "host", "hostport", "port"];

// Read render.yaml
const renderYamlPath = "./render.yaml";
let yamlContent;

try {
  yamlContent = fs.readFileSync(renderYamlPath, "utf8");
} catch (err) {
  console.error(`Error reading render.yaml: ${err.message}`);
  process.exit(1);
}

// Using a more direct regex approach to find service references
const serviceRefRegex =
  /- key: ([^\n]+)[\s\S]+?fromService:[\s\S]+?property: ([^\n]+)/g;
let serviceRefs = [];
let match;

// Find all matches
while ((match = serviceRefRegex.exec(yamlContent)) !== null) {
  // Extract the full section for further parsing
  const startIdx = match.index;

  // Determine the end of this section
  let endIdx = yamlContent.indexOf("\n      -", startIdx + 10);
  if (endIdx === -1) {
    endIdx = yamlContent.indexOf("\n    auto", startIdx);
    if (endIdx === -1) {
      endIdx = yamlContent.length;
    }
  }

  const section = yamlContent.substring(startIdx, endIdx);
  const key = match[1].trim();

  // Extract service name and property
  const nameMatch = /name:\s*([^\n]+)/.exec(section);
  const typeMatch = /type:\s*([^\n]+)/.exec(section);
  const propertyMatch = /property:\s*([^\n]+)/.exec(section);

  if (nameMatch && propertyMatch) {
    serviceRefs.push({
      key,
      name: nameMatch[1].trim(),
      type: typeMatch ? typeMatch[1].trim() : "unknown",
      property: propertyMatch[1].trim(),
      section,
    });
  }
}

console.log(`\n=== RENDER.YAML SERVICE REFERENCE VALIDATOR ===\n`);
console.log(`Found ${serviceRefs.length} service reference(s)\n`);

// Validate each service reference
let hasErrors = false;

for (let i = 0; i < serviceRefs.length; i++) {
  const { key, name, type, property } = serviceRefs[i];

  console.log(`Service reference #${i + 1} (for ${key}):`);
  console.log(`  Service: "${name}"`);
  console.log(`  Type: ${type}`);
  console.log(`  Property: ${property}`);

  if (VALID_PROPERTIES.includes(property)) {
    console.log(`  ✓ "${property}" is a valid property\n`);
  } else {
    console.log(`  ✗ "${property}" is NOT a valid property`);
    console.log(`  Valid properties are: ${VALID_PROPERTIES.join(", ")}\n`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.log(`\nValidation FAILED. Please fix the errors above.`);
  process.exit(1);
} else {
  console.log(
    `\nValidation PASSED. All service references use valid properties.`
  );
  process.exit(0);
}
