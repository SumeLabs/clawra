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

// Provider definitions
const PROVIDERS = {
  fal: { name: "fal.ai (Grok Imagine)", envKey: "FAL_KEY", url: "https://fal.ai/dashboard/keys" },
  openai: { name: "OpenAI (gpt-image-1)", envKey: "OPENAI_API_KEY", url: "https://platform.openai.com/api-keys" },
  google: { name: "Google Gemini", envKey: "GEMINI_API_KEY", url: "https://aistudio.google.com/apikey" },
  xai: { name: "x.ai (Grok Imagine)", envKey: "XAI_API_KEY", url: "https://console.x.ai" },
};

// Print banner
function printBanner() {
  console.log(`
${c("magenta", "┌──────────────────────────────────────────────────────┐")}
${c("magenta", "│")}  ${c("bright", "Clawra Selfie")} - Multi-Provider Skill Installer   ${c("magenta", "│")}
${c("magenta", "└──────────────────────────────────────────────────────┘")}

Add selfie generation superpowers to your OpenClaw agent!
Supported providers: ${c("cyan", "fal.ai")}, ${c("cyan", "OpenAI")}, ${c("cyan", "Google Gemini")}, ${c("cyan", "x.ai")}
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

// Get API keys for selected providers
async function getApiKeys(rl) {
  logStep("2/7", "Setting up image provider API keys...");

  log(`\nWhich image providers would you like to configure?`);
  log(`You need at least one provider. You can add more later.\n`);

  const providerIds = Object.keys(PROVIDERS);
  for (let i = 0; i < providerIds.length; i++) {
    const id = providerIds[i];
    const p = PROVIDERS[id];
    log(`  ${c("cyan", `${i + 1})`)} ${p.name} (${c("dim", p.envKey)})`);
  }
  log("");

  const selection = await ask(
    rl,
    `Enter provider numbers (comma-separated, default: 1): `
  );

  const selectedNums = (selection || "1")
    .split(",")
    .map((s) => parseInt(s.trim(), 10) - 1)
    .filter((n) => n >= 0 && n < providerIds.length);

  if (selectedNums.length === 0) {
    selectedNums.push(0); // default to fal
  }

  const apiKeys = {};

  for (const idx of selectedNums) {
    const id = providerIds[idx];
    const p = PROVIDERS[id];

    log(`\n${c("bright", `Setting up ${p.name}...`)}`);
    log(`${c("cyan", "→")} Get your key from: ${c("bright", p.url)}\n`);

    const openIt = await ask(rl, `Open ${p.name} in browser? (Y/n): `);
    if (openIt.toLowerCase() !== "n") {
      logInfo("Opening browser...");
      if (!openBrowser(p.url)) {
        logWarn("Could not open browser automatically");
        logInfo(`Please visit: ${p.url}`);
      }
    }

    log("");
    const key = await ask(rl, `Enter your ${p.envKey}: `);

    if (!key) {
      logWarn(`Skipping ${p.name} (no key provided)`);
      continue;
    }

    if (key.length < 10) {
      logWarn("That key looks too short. Make sure you copied the full key.");
    }

    apiKeys[id] = key;
    logSuccess(`${p.name} API key received`);
  }

  if (Object.keys(apiKeys).length === 0) {
    logError("At least one API key is required!");
    return null;
  }

  return apiKeys;
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

  // Build env vars from all configured providers
  const env = {};
  for (const [providerId, key] of Object.entries(apiKeys)) {
    const p = PROVIDERS[providerId];
    if (p) {
      env[p.envKey] = key;
    }
  }

  // Set default provider to the first configured one
  const defaultProvider = Object.keys(apiKeys)[0];
  env.IMAGE_PROVIDER = defaultProvider;

  // Merge skill configuration
  const skillConfig = {
    skills: {
      entries: {
        [SKILL_NAME]: {
          enabled: true,
          env,
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
  logInfo(`Default provider: ${PROVIDERS[defaultProvider].name}`);

  for (const [providerId] of Object.entries(apiKeys)) {
    logInfo(`Configured: ${PROVIDERS[providerId].name}`);
  }

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

${c("cyan", "Switch provider:")}
  Set IMAGE_PROVIDER to: fal, openai, google, or xai

${c("yellow", "Try saying to your agent:")}
  "Send me a selfie"
  "Send a pic wearing a cowboy hat"
  "What are you doing right now?"

${c("dim", "Your agent now has multi-provider selfie superpowers!")}
`);
}

// Handle reinstall
async function handleReinstall(rl, falKey) {
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
      const shouldContinue = await handleReinstall(rl, null);
      if (!shouldContinue) {
        rl.close();
        process.exit(0);
      }
    }

    // Step 2: Get API keys (multi-provider)
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
