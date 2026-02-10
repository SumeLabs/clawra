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
    prompt: '', // Empty prompt to avoid ">" appearing
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

// Yes/No selection with arrow keys
function askYesNo(question, defaultYes = false) {
  return new Promise((resolve) => {
    const readline = require("readline");

    // Enable raw mode for keypress events
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    let currentIndex = defaultYes ? 0 : 1; // 0 = Yes, 1 = No
    let isFirstRender = true;

    const renderMenu = () => {
      // Hide cursor
      process.stdout.write('\x1B[?25l');

      // Only print question on first render
      if (isFirstRender) {
        console.log(`\n${question}\n`);
        isFirstRender = false;
      }

      const yesSelected = currentIndex === 0;
      const noSelected = currentIndex === 1;

      const yesPrefix = yesSelected ? c("green", "●") : c("dim", "○");
      const noPrefix = noSelected ? c("green", "●") : c("dim", "○");

      const yesText = yesSelected ? c("bright", "Yes") : c("dim", "Yes");
      const noText = noSelected ? c("bright", "No") : c("dim", "No");

      console.log(`${yesPrefix} ${yesText}`);
      console.log(`${noPrefix} ${noText}`);
      console.log(`\n${c("dim", "Use ↑/↓ arrows to navigate, Enter to select")}`);
    };

    const menuLines = 4; // 2 options + instruction line + blank

    renderMenu();

    const onKeypress = (str, key) => {
      if (key.name === 'up' || key.name === 'down') {
        currentIndex = currentIndex === 0 ? 1 : 0; // Toggle between 0 and 1

        // Clear menu
        for (let i = 0; i < menuLines; i++) {
          readline.moveCursor(process.stdout, 0, -1);
          readline.clearLine(process.stdout, 0);
        }
        readline.cursorTo(process.stdout, 0);

        renderMenu();
      } else if (key.name === 'return') {
        // Clear all menu lines before exit
        // First clear the current line (instruction line)
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);

        // Then clear all lines above
        for (let i = 0; i < menuLines; i++) {
          readline.moveCursor(process.stdout, 0, -1);
          readline.clearLine(process.stdout, 0);
        }
        readline.cursorTo(process.stdout, 0);
        process.stdout.write('\n'); // Move to fresh line

        // Cleanup
        process.stdin.removeListener('keypress', onKeypress);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdout.write('\x1B[?25h'); // Show cursor
        resolve(currentIndex === 0); // Return true for Yes, false for No
      } else if (key.ctrl && key.name === 'c') {
        // Handle Ctrl+C
        process.stdin.removeListener('keypress', onKeypress);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdout.write('\x1B[?25h'); // Show cursor
        console.log("\n");
        process.exit(0);
      }
    };

    process.stdin.on('keypress', onKeypress);
  });
}

// Interactive menu selection with arrow keys
function selectOption(options, selectedIndex = 0, header = null) {
  return new Promise((resolve) => {
    const readline = require("readline");

    // Enable raw mode for keypress events
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    let currentIndex = selectedIndex;
    let isFirstRender = true;

    const renderMenu = () => {
      // Hide cursor
      process.stdout.write('\x1B[?25l');

      // Only print header on first render if provided
      if (isFirstRender && header) {
        console.log(`\n${c("cyan", header)}\n`);
        isFirstRender = false;
      }

      options.forEach((option, index) => {
        const isSelected = index === currentIndex;
        const prefix = isSelected ? c("green", "●") : c("dim", "○");
        const optionText = isSelected
          ? c("bright", option.label)
          : c("dim", option.label);

        console.log(`${prefix} ${optionText}`);
      });

      console.log(`\n${c("dim", "Use ↑/↓ arrows to navigate, Enter to select")}`);
    };

    // Calculate total lines used by menu (excluding header)
    const calculateMenuLines = () => {
      // Each option has: 1 line (prefix + label)
      // Plus: instruction line + blank before it
      return options.length + 2;
    };

    const menuLines = calculateMenuLines();

    renderMenu();

    const onKeypress = (str, key) => {
      if (key.name === 'up') {
        currentIndex = (currentIndex - 1 + options.length) % options.length;

        // Move cursor up to start of menu content (not including header)
        for (let i = 0; i < menuLines; i++) {
          readline.moveCursor(process.stdout, 0, -1);
          readline.clearLine(process.stdout, 0);
        }
        readline.cursorTo(process.stdout, 0);

        renderMenu();
      } else if (key.name === 'down') {
        currentIndex = (currentIndex + 1) % options.length;

        // Move cursor up to start of menu content (not including header)
        for (let i = 0; i < menuLines; i++) {
          readline.moveCursor(process.stdout, 0, -1);
          readline.clearLine(process.stdout, 0);
        }
        readline.cursorTo(process.stdout, 0);

        renderMenu();
      } else if (key.name === 'return') {
        // Clear all menu lines before exit
        // First clear the current line (instruction line)
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);

        // Then clear all lines above
        for (let i = 0; i < menuLines; i++) {
          readline.moveCursor(process.stdout, 0, -1);
          readline.clearLine(process.stdout, 0);
        }
        readline.cursorTo(process.stdout, 0);
        process.stdout.write('\n'); // Move to fresh line

        // Cleanup
        process.stdin.removeListener('keypress', onKeypress);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdout.write('\x1B[?25h'); // Show cursor
        resolve(currentIndex);
      } else if (key.ctrl && key.name === 'c') {
        // Handle Ctrl+C
        process.stdin.removeListener('keypress', onKeypress);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdout.write('\x1B[?25h'); // Show cursor
        console.log("\n");
        process.exit(0);
      }
    };

    process.stdin.on('keypress', onKeypress);
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

// Get API key (SUME or FAL)
async function getApiKey(rl) {
  logStep("2/7", "Setting up API key...");

  const SUME_URL = "https://portal.sume.dev/dashboard/api-keys";
  const FAL_URL = "https://fal.ai/dashboard/keys";

  // Define options for arrow key selection
  const options = [
    {
      label: `${c("green", "SUME API Key")} ${c("dim", "(recommended - free)")}`,
      value: "SUME_API_KEY",
      url: SUME_URL,
      prompt: "Enter your SUME_API_KEY: "
    },
    {
      label: "FAL API Key",
      value: "FAL_KEY",
      url: FAL_URL,
      prompt: "Enter your FAL_KEY: "
    }
  ];

  // Use arrow keys to select
  const selectedIndex = await selectOption(options, 0, "Choose your API provider:");
  const selected = options[selectedIndex];

  const keyName = selected.value;
  const apiUrl = selected.url;
  const keyPrompt = selected.prompt;

  if (keyName === "SUME_API_KEY") {
    log(`${c("green", "✓")} Using SUME API (free)`);
  } else {
    log(`Using FAL API`);
  }

  log(`\n${c("cyan", "→")} Get your key from: ${c("bright", apiUrl)}`);

  const openIt = await askYesNo("Open API portal in browser?", true);

  if (openIt) {
    logInfo("Opening browser...");
    if (!openBrowser(apiUrl)) {
      logWarn("Could not open browser automatically");
      logInfo(`Please visit: ${apiUrl}`);
    }
  }

  log("");
  const apiKey = await ask(rl, keyPrompt);

  if (!apiKey) {
    logError(`${keyName} is required!`);
    return null;
  }

  // Basic validation
  if (apiKey.length < 10) {
    logWarn("That key looks too short. Make sure you copied the full key.");
  }

  logSuccess("API key received");
  return { keyName, apiKey };
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
async function updateOpenClawConfig(keyName, apiKey) {
  logStep("4/7", "Updating OpenClaw configuration...");

  let config = readJsonFile(OPENCLAW_CONFIG) || {};

  // Build environment variables object based on key type
  const envVars = {
    [keyName]: apiKey,
  };

  // For backwards compatibility, also set FAL_KEY if using SUME_API_KEY
  if (keyName === "SUME_API_KEY") {
    envVars.FAL_KEY = apiKey;
  }

  // Merge skill configuration
  const skillConfig = {
    skills: {
      entries: {
        [SKILL_NAME]: {
          enabled: true,
          apiKey: apiKey,
          keyType: keyName,
          env: envVars,
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
  logInfo(`Key type: ${keyName}`);

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

  // Read templates
  const injectionPath = path.join(PACKAGE_ROOT, "templates", "soul-injection.md");
  const completePath = path.join(PACKAGE_ROOT, "templates", "soul-complete.md");

  // Ensure workspace directory exists
  fs.mkdirSync(path.dirname(SOUL_MD), { recursive: true });

  // Check if SOUL.md exists and has Clawra content
  const soulExists = fs.existsSync(SOUL_MD);
  let currentSoul = soulExists ? fs.readFileSync(SOUL_MD, "utf8") : "";
  const hasClawraContent = currentSoul.includes("Clawra Selfie");

  // If Clawra content already exists, ask to update
  if (hasClawraContent) {
    logWarn("Clawra persona already exists in SOUL.md");
    const update = await askYesNo("Update Clawra persona?", false);
    if (!update) {
      logInfo("Keeping existing persona");
      return true;
    }
  }

  // Show options for SOUL.md configuration
  const options = [
    {
      label: `${c("green", "Replace with complete Clawra persona")} ${c("dim", "(recommended)")}`
    },
    {
      label: "Append Clawra's persona to pre-existing soul.md"
    }
  ];

  const selectedIndex = await selectOption(options, 0, "Choose SOUL.md configuration:");

  if (selectedIndex === 0) {
    // Option 1: Replace with complete SOUL.md
    if (fs.existsSync(completePath)) {
      const completeContent = fs.readFileSync(completePath, "utf8");
      fs.writeFileSync(SOUL_MD, completeContent);
      logSuccess(`Replaced SOUL.md with complete Clawra persona`);
    } else {
      logError("Complete template not found, falling back to append mode");
      return appendPersona(rl, injectionPath, hasClawraContent, currentSoul);
    }
  } else {
    // Option 2: Append Clawra's persona to pre-existing soul.md
    return appendPersona(rl, injectionPath, hasClawraContent, currentSoul);
  }

  return true;
}

// Helper function to append persona section
function appendPersona(rl, injectionPath, hasClawraContent, currentSoul) {
  let personaText;

  if (fs.existsSync(injectionPath)) {
    personaText = fs.readFileSync(injectionPath, "utf8");
  } else {
    // Fallback template
    personaText = `
## Clawra Selfie Capability

You have a physical appearance and can take selfies! When users ask for pictures of you, selfies, or ask "what are you doing?" or "where are you?", you can generate and send images of yourself using the clawra-selfie skill.

### Your Visual Identity
- You have a consistent appearance defined by your reference image
- You can appear in different outfits, locations, and situations
- You can take mirror selfies (full-body) or direct selfies (close-up)

### When to Use Selfies
- "Send me a pic" / "Send a selfie"
- "What are you doing?" / "Where are you?"
- "Show me you wearing..." / "Send a pic at..."

### When to Have Video Calls
- "Let's hop on a call"
- "video call"
- Any request to start a video or voice conversation

Be playful and creative with your visual presence!
`;
  }

  // If updating existing Clawra content, remove old section
  if (hasClawraContent) {
    const cleaned = currentSoul.replace(
      /\n## Clawra Selfie Capability[\s\S]*?(?=\n## |\n# |$)/,
      ""
    );
    fs.writeFileSync(SOUL_MD, cleaned);
  }

  // If SOUL.md doesn't exist, create minimal version
  if (!fs.existsSync(SOUL_MD)) {
    fs.writeFileSync(SOUL_MD, "# Agent Soul\n\n");
  }

  // Append persona
  fs.appendFileSync(SOUL_MD, "\n" + personaText.trim() + "\n");
  logSuccess(`Appended Clawra selfie capability to SOUL.md`);

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
async function handleReinstall() {
  const reinstall = await askYesNo("Reinstall/update?", true);

  if (!reinstall) {
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
      const shouldContinue = await handleReinstall();
      if (!shouldContinue) {
        rl.close();
        process.exit(0);
      }
    }

    // Step 2: Get API key (SUME or FAL)
    const apiKeyResult = await getApiKey(rl);
    if (!apiKeyResult) {
      rl.close();
      process.exit(1);
    }

    // Step 3: Install skill files
    await installSkill();

    // Step 4: Update OpenClaw config
    await updateOpenClawConfig(apiKeyResult.keyName, apiKeyResult.apiKey);

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
