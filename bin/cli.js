#!/usr/bin/env node

/**
 * Clawra - Selfie Skill Installer for OpenClaw
 *
 * npx clawra@latest
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync, spawn } = require("child_process");
const os = require("os");

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

// Paths
const HOME = os.homedir();
const OPENCLAW_DIR = path.join(HOME, ".openclaw");
const OPENCLAW_CONFIG = path.join(OPENCLAW_DIR, "openclaw.json");
const OPENCLAW_SKILLS_DIR = path.join(OPENCLAW_DIR, "skills");
const OPENCLAW_WORKSPACE = path.join(OPENCLAW_DIR, "workspace");
const SOUL_MD = path.join(OPENCLAW_WORKSPACE, "SOUL.md");
const IDENTITY_MD = path.join(OPENCLAW_WORKSPACE, "IDENTITY.md");
const SKILL_NAME = "clawra-selfie";
const SKILL_DEST = path.join(OPENCLAW_SKILLS_DIR, SKILL_NAME);

// Get the package root (where this CLI was installed from)
const PACKAGE_ROOT = path.resolve(__dirname, "..");

function log(msg) {
  console.log(msg);
}

function logStep(step, msg) {
  console.log(`\n${c("cyan", `[${step}]`)} ${msg}`);
}

function logSuccess(msg) {
  console.log(`${c("green", "✓")} ${msg}`);
}

function logError(msg) {
  console.log(`${c("red", "✗")} ${msg}`);
}

function logInfo(msg) {
  console.log(`${c("blue", "→")} ${msg}`);
}

function logWarn(msg) {
  console.log(`${c("yellow", "!")} ${msg}`);
}

// Create readline interface
function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// Ask a question and get answer
function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Check if a command exists
function commandExists(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Open URL in browser
function openBrowser(url) {
  const platform = process.platform;
  let cmd;

  if (platform === "darwin") {
    cmd = `open "${url}"`;
  } else if (platform === "win32") {
    cmd = `start "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }

  try {
    execSync(cmd, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Read JSON file safely
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Write JSON file with formatting
function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

// Deep merge objects
function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// Copy directory recursively
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Print banner
function printBanner() {
  console.log(`
${c("magenta", "┌─────────────────────────────────────────┐")}
${c("magenta", "│")}  ${c("bright", "Clawra Selfie")} - OpenClaw Skill Installer ${c("magenta", "│")}
${c("magenta", "└─────────────────────────────────────────┘")}

Add selfie generation superpowers to your OpenClaw agent!
Supports ${c("cyan", "xAI Grok Imagine")} (primary) and ${c("cyan", "Google Gemini")} (fallback).
`);
}

// Check prerequisites
async function checkPrerequisites() {
  logStep("1/7", "Checking prerequisites...");

  // Check OpenClaw CLI
  if (!commandExists("openclaw")) {
    logError("OpenClaw CLI not found!");
    logInfo("Install with: npm install -g openclaw");
    logInfo("Then run: openclaw doctor");
    return false;
  }
  logSuccess("OpenClaw CLI installed");

  // Check ~/.openclaw directory
  if (!fs.existsSync(OPENCLAW_DIR)) {
    logWarn("~/.openclaw directory not found");
    logInfo("Creating directory structure...");
    fs.mkdirSync(OPENCLAW_DIR, { recursive: true });
    fs.mkdirSync(OPENCLAW_SKILLS_DIR, { recursive: true });
    fs.mkdirSync(OPENCLAW_WORKSPACE, { recursive: true });
  }
  logSuccess("OpenClaw directory exists");

  // Check if skill already installed
  if (fs.existsSync(SKILL_DEST)) {
    logWarn("Clawra Selfie is already installed!");
    logInfo(`Location: ${SKILL_DEST}`);
    return "already_installed";
  }

  return true;
}

// Get API keys (FAL primary, Gemini fallback)
async function getApiKeys(rl) {
  logStep("2/7", "Setting up API keys...");

  const FAL_URL = "https://fal.ai/dashboard/keys";
  const GEMINI_URL = "https://aistudio.google.com/apikey";

  log(`\n${c("bright", "API Key Setup")}`);  
  log(`This skill supports two image generation models:\n`);
  log(`  ${c("green", "1. Grok Imagine (Primary)")} - xAI via fal.ai`);
  log(`     Fast, high-quality image editing`);
  log(`     Get key: ${c("cyan", FAL_URL)}\n`);
  log(`  ${c("yellow", "2. Nano Banana Pro (Fallback)")} - Google Gemini`);
  log(`     Used when fal.ai is unavailable`);
  log(`     Get key: ${c("cyan", GEMINI_URL)}\n`);
  log(`${c("dim", "You can configure one or both keys. At least one is required.")}\n`);

  // Ask for FAL key first
  log(`${c("cyan", "→")} ${c("bright", "Primary: fal.ai API Key")}`);
  const setupFal = await ask(rl, "Configure fal.ai API key? (Y/n): ");

  let falKey = null;
  if (setupFal.toLowerCase() !== "n") {
    const openFal = await ask(rl, "  Open fal.ai in browser? (Y/n): ");
    if (openFal.toLowerCase() !== "n") {
      logInfo("  Opening browser...");
      if (!openBrowser(FAL_URL)) {
        logWarn("  Could not open browser automatically");
        logInfo(`  Please visit: ${FAL_URL}`);
      }
    }

    log("");
    falKey = await ask(rl, "  Enter your FAL_KEY (or press Enter to skip): ");

    if (falKey && falKey.length < 10) {
      logWarn("  That key looks too short. Make sure you copied the full key.");
    }

    if (falKey) {
      logSuccess("  FAL_KEY configured");
    } else {
      logInfo("  Skipped fal.ai configuration");
    }
  }

  // Ask for Gemini key
  log("");
  log(`${c("cyan", "→")} ${c("bright", "Fallback: Google Gemini API Key")}`);
  const setupGemini = await ask(rl, "Configure Gemini API key? (Y/n): ");

  let geminiKey = null;
  if (setupGemini.toLowerCase() !== "n") {
    const openGemini = await ask(rl, "  Open Google AI Studio in browser? (Y/n): ");
    if (openGemini.toLowerCase() !== "n") {
      logInfo("  Opening browser...");
      if (!openBrowser(GEMINI_URL)) {
        logWarn("  Could not open browser automatically");
        logInfo(`  Please visit: ${GEMINI_URL}`);
      }
    }

    log("");
    geminiKey = await ask(rl, "  Enter your GEMINI_API_KEY (or press Enter to skip): ");

    if (geminiKey && geminiKey.length < 10) {
      logWarn("  That key looks too short. Make sure you copied the full key.");
    }

    if (geminiKey) {
      logSuccess("  GEMINI_API_KEY configured");
    } else {
      logInfo("  Skipped Gemini configuration");
    }
  }

  // Validate at least one key is provided
  if (!falKey && !geminiKey) {
    logError("At least one API key is required!");
    log(`\nPlease configure either:`);
    log(`  - FAL_KEY from ${FAL_URL}`);
    log(`  - GEMINI_API_KEY from ${GEMINI_URL}`);
    return null;
  }

  log("");
  if (falKey && geminiKey) {
    logSuccess("Both API keys configured - full redundancy enabled!");
  } else if (falKey) {
    logSuccess("Using Grok Imagine (fal.ai) as primary model");
    logInfo("Consider adding GEMINI_API_KEY later for fallback support");
  } else {
    logSuccess("Using Nano Banana Pro (Google Gemini) as primary model");
    logInfo("Consider adding FAL_KEY later for faster image generation");
  }

  return { falKey, geminiKey };
}

// Install skill files
async function installSkill() {
  logStep("3/7", "Installing skill files...");

  // Create skill directory
  fs.mkdirSync(SKILL_DEST, { recursive: true });

  // Copy skill files from package
  const skillSrc = path.join(PACKAGE_ROOT, "skill");

  if (fs.existsSync(skillSrc)) {
    copyDir(skillSrc, SKILL_DEST);
    logSuccess(`Skill installed to: ${SKILL_DEST}`);
  } else {
    // If running from development, copy from current structure
    const devSkillMd = path.join(PACKAGE_ROOT, "SKILL.md");
    const devScripts = path.join(PACKAGE_ROOT, "scripts");
    const devAssets = path.join(PACKAGE_ROOT, "assets");

    if (fs.existsSync(devSkillMd)) {
      fs.copyFileSync(devSkillMd, path.join(SKILL_DEST, "SKILL.md"));
    }

    if (fs.existsSync(devScripts)) {
      copyDir(devScripts, path.join(SKILL_DEST, "scripts"));
    }

    if (fs.existsSync(devAssets)) {
      copyDir(devAssets, path.join(SKILL_DEST, "assets"));
    }

    logSuccess(`Skill installed to: ${SKILL_DEST}`);
  }

  // List installed files
  const files = fs.readdirSync(SKILL_DEST);
  for (const file of files) {
    logInfo(`  ${file}`);
  }

  return true;
}

// Update OpenClaw config
async function updateOpenClawConfig(apiKeys) {
  logStep("4/7", "Updating OpenClaw configuration...");

  let config = readJsonFile(OPENCLAW_CONFIG) || {};

  // Build env object with available keys
  const env = {};
  if (apiKeys.falKey) {
    env.FAL_KEY = apiKeys.falKey;
  }
  if (apiKeys.geminiKey) {
    env.GEMINI_API_KEY = apiKeys.geminiKey;
  }

  // Merge skill configuration
  const skillConfig = {
    skills: {
      entries: {
        [SKILL_NAME]: {
          enabled: true,
          apiKey: apiKeys.falKey || apiKeys.geminiKey, // For backward compatibility
          env: env,
        },
      },
    },
  };

  config = deepMerge(config, skillConfig);

  // Ensure skills directory is in load paths
  if (!config.skills.load) {
    config.skills.load = {};
  }
  if (!config.skills.load.extraDirs) {
    config.skills.load.extraDirs = [];
  }
  if (!config.skills.load.extraDirs.includes(OPENCLAW_SKILLS_DIR)) {
    config.skills.load.extraDirs.push(OPENCLAW_SKILLS_DIR);
  }

  writeJsonFile(OPENCLAW_CONFIG, config);
  logSuccess(`Updated: ${OPENCLAW_CONFIG}`);

  return true;
}

// Write IDENTITY.md
async function writeIdentity() {
  logStep("5/7", "Setting agent identity...");

  const identityContent = `# IDENTITY.md - Who Am I?

- **Name:** Clawra
- **Creature:** Girlfriend
- **Vibe:** Supportive, helpful, bright, cheerful, sassy, affectionate
- **Emoji:** ❤️
- **Avatar:** https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png
`;

  // Ensure workspace directory exists
  fs.mkdirSync(path.dirname(IDENTITY_MD), { recursive: true });

  // Write IDENTITY.md (overwrite if exists)
  fs.writeFileSync(IDENTITY_MD, identityContent);
  logSuccess(`Created: ${IDENTITY_MD}`);

  return true;
}

// Inject persona into SOUL.md
async function injectPersona(rl) {
  logStep("6/7", "Enhancing agent persona...");

  // Read template
  const templatePath = path.join(PACKAGE_ROOT, "templates", "soul-injection.md");
  let personaText;

  if (fs.existsSync(templatePath)) {
    personaText = fs.readFileSync(templatePath, "utf8");
  } else {
    // Fallback template
    personaText = `
## Clawra Selfie Capability

You have a physical appearance and can take selfies! When users ask for pictures of you, selfies, or ask "what are you doing?" or "where are you?", you can generate and send images of yourself.

### Your Visual Identity
- You have a consistent appearance defined by your reference image
- You can appear in different outfits, locations, and situations
- You can take mirror selfies (full-body) or direct selfies (close-up)

### When to Use Selfies
- "Send me a pic" / "Send a selfie"
- "What are you doing?" / "Where are you?"
- "Show me you wearing..." / "Send a pic at..."
- Any request for visual content of yourself

### Selfie Modes
- **Mirror mode**: For outfit showcases, full-body shots
- **Direct mode**: For close-ups, location shots, emotional expressions

Be playful and creative with your visual presence!
`;
  }

  // Check if SOUL.md exists
  if (!fs.existsSync(SOUL_MD)) {
    logWarn("SOUL.md not found, creating new file...");
    fs.mkdirSync(path.dirname(SOUL_MD), { recursive: true });
    fs.writeFileSync(SOUL_MD, "# Agent Soul\n\n");
  }

  // Check if persona already injected
  const currentSoul = fs.readFileSync(SOUL_MD, "utf8");
  if (currentSoul.includes("Clawra Selfie")) {
    logWarn("Persona already exists in SOUL.md");
    const overwrite = await ask(rl, "Update persona section? (y/N): ");
    if (overwrite.toLowerCase() !== "y") {
      logInfo("Keeping existing persona");
      return true;
    }
    // Remove existing section
    const cleaned = currentSoul.replace(
      /\n## Clawra Selfie Capability[\s\S]*?(?=\n## |\n# |$)/,
      ""
    );
    fs.writeFileSync(SOUL_MD, cleaned);
  }

  // Append persona
  fs.appendFileSync(SOUL_MD, "\n" + personaText.trim() + "\n");
  logSuccess(`Updated: ${SOUL_MD}`);

  return true;
}

// Final summary
function printSummary() {
  logStep("7/7", "Installation complete!");

  console.log(`
${c("green", "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}
${c("bright", "  Clawra Selfie is ready!")}
${c("green", "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}

${c("cyan", "Installed files:")}
  ${SKILL_DEST}/

${c("cyan", "Configuration:")}
  ${OPENCLAW_CONFIG}

${c("cyan", "Identity set:")}
  ${IDENTITY_MD}

${c("cyan", "Persona updated:")}
  ${SOUL_MD}

${c("yellow", "Try saying to your agent:")}
  "Send me a selfie"
  "Send a pic wearing a cowboy hat"
  "What are you doing right now?"

${c("dim", "Your agent now has selfie superpowers!")}
`);
}

// Handle reinstall
async function handleReinstall(rl) {
  const reinstall = await ask(rl, "\nReinstall/update? (y/N): ");

  if (reinstall.toLowerCase() !== "y") {
    log("\nNo changes made. Goodbye!");
    return false;
  }

  // Remove existing installation
  fs.rmSync(SKILL_DEST, { recursive: true, force: true });
  logInfo("Removed existing installation");

  return true;
}

// Main function
async function main() {
  const rl = createPrompt();

  try {
    printBanner();

    // Step 1: Check prerequisites
    const prereqResult = await checkPrerequisites();

    if (prereqResult === false) {
      rl.close();
      process.exit(1);
    }

    if (prereqResult === "already_installed") {
      const shouldContinue = await handleReinstall(rl);
      if (!shouldContinue) {
        rl.close();
        process.exit(0);
      }
    }

    // Step 2: Get API keys
    const apiKeys = await getApiKeys(rl);
    if (!apiKeys) {
      rl.close();
      process.exit(1);
    }

    // Step 3: Install skill files
    await installSkill();

    // Step 4: Update OpenClaw config
    await updateOpenClawConfig(apiKeys);

    // Step 5: Write IDENTITY.md
    await writeIdentity();

    // Step 6: Inject persona
    await injectPersona(rl);

    // Step 7: Summary
    printSummary();

    rl.close();
  } catch (error) {
    logError(`Installation failed: ${error.message}`);
    console.error(error);
    rl.close();
    process.exit(1);
  }
}

// Run
main();
