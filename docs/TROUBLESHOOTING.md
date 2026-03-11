# Troubleshooting Guide

Common issues and solutions for Clawra.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Configuration Issues](#configuration-issues)
- [Generation Issues](#generation-issues)
- [OpenClaw Issues](#openclaw-issues)
- [Provider-Specific Issues](#provider-specific-issues)
- [Performance Issues](#performance-issues)

---

## Installation Issues

### Issue: "command not found: clawra"

**Symptoms**: Running `npx clawra@latest` gives command not found error

**Solutions**:

1. Ensure Node.js is installed:
```bash
node --version  # Should be v18+
npm --version
```

2. Try installing globally:
```bash
npm install -g clawra
clawra
```

3. Or run with npx:
```bash
npx --yes clawra@latest
```

---

### Issue: "Failed to install skill"

**Symptoms**: Installation script fails

**Solutions**:

1. Check OpenClaw is installed:
```bash
which openclaw
openclaw --version
```

2. Check directory permissions:
```bash
ls -la ~/.openclaw/
# Should be writable by current user
```

3. Try manual installation (see [Installation Guide](./INSTALLATION.md))

---

## Configuration Issues

### Issue: "FAL_KEY not found"

**Symptoms**: Error message about missing API key

**Solutions**:

1. Check environment variable:
```bash
echo $FAL_KEY
```

2. Set the variable:
```bash
export FAL_KEY="your_key_here"
```

3. Make it permanent by adding to `~/.zshrc` or `~/.bash_profile`:
```bash
echo 'export FAL_KEY="your_key_here"' >> ~/.zshrc
source ~/.zshrc
```

4. Verify OpenClaw config:
```bash
cat ~/.openclaw/openclaw.json | grep -A5 clawra-selfie
```

---

### Issue: "Invalid API key"

**Symptoms**: API returns 401 or authentication error

**Solutions**:

1. Regenerate key at [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys)

2. Copy the full key (including `fc-` prefix)

3. No extra spaces:
```bash
# Wrong
export FAL_KEY=" fc-xxx "

# Correct
export FAL_KEY="fc-xxx"
```

---

### Issue: "Provider not supported"

**Symptoms**: Error about unsupported provider

**Solutions**:

1. Check provider name:
```bash
export CLAWRA_PROVIDER="fal"  # or "openai", "stability", "custom"
```

2. Valid providers:
- `fal` - fal.ai
- `openai` - OpenAI DALL-E
- `stability` - Stability AI
- `custom` - Custom OpenAI-compatible endpoint

---

## Generation Issues

### Issue: "Failed to generate image"

**Symptoms**: Image generation fails with generic error

**Solutions**:

1. Check API quota:
```bash
# Log into fal.ai dashboard and check credits
```

2. Try simpler prompt:
```
# Instead of:
"wearing a complex steampunk outfit with gears and clockwork at a victorian market"

# Try:
"wearing steampunk outfit"
```

3. Check rate limits:
- fal.ai: 10 req/min (free tier)
- Wait a minute and retry

4. Enable debug mode:
```bash
export CLAWRA_DEBUG="true"
```

---

### Issue: "Images look different each time"

**Symptoms**: Character inconsistency between generations

**Solutions**:

1. Use fal.ai (has image editing):
```bash
export CLAWRA_PROVIDER="fal"
export FAL_MODEL="xai/grok-imagine-image/edit"
```

2. Other providers don't support image editing, so consistency isn't guaranteed

3. Consider using a custom reference image:
```bash
export CLAWRA_REFERENCE_IMAGE="https://your-cdn.com/consistent-character.png"
```

---

### Issue: "Wrong mode selected"

**Symptoms**: Mirror mode used when expecting direct, or vice versa

**Solutions**:

1. Be explicit about mode:
```
"Send a mirror selfie wearing..."
"Send a direct selfie at..."
```

2. Force mode in config:
```bash
export CLAWRA_MODE="mirror"  # or "direct"
```

3. Check keyword detection:
- Mirror: `outfit`, `wearing`, `clothes`
- Direct: `cafe`, `beach`, `location`

---

### Issue: "Image quality is poor"

**Solutions**:

1. Use larger size:
```bash
export CLAWRA_DEFAULT_SIZE="2048"
```

2. Use DALL-E 3 (better quality):
```bash
export CLAWRA_PROVIDER="openai"
export OPENAI_MODEL="dall-e-3"
```

3. Improve prompt:
```
# Add quality keywords:
"high quality, detailed, professional photo of..."
```

---

## OpenClaw Issues

### Issue: "OpenClaw gateway not running"

**Symptoms**: Can't send images to messaging platforms

**Solutions**:

1. Start gateway:
```bash
openclaw gateway start
```

2. Or run in background:
```bash
openclaw gateway --daemon
```

3. Check status:
```bash
openclaw doctor
```

---

### Issue: "Failed to send message"

**Symptoms**: Image generates but doesn't arrive in chat

**Solutions**:

1. Check channel format:
```
# Discord
#general
1234567890123456789

# Telegram
@username
-1001234567890

# WhatsApp
1234567890@s.whatsapp.net
```

2. Verify bot permissions:
- Can send messages in channel
- Can send images/attachments

3. Check OpenClaw logs:
```bash
openclaw gateway --verbose
```

---

### Issue: "Skill not responding"

**Symptoms**: No response to selfie requests

**Solutions**:

1. Check skill is enabled:
```bash
cat ~/.openclaw/openclaw.json | jq '.skills.entries."clawra-selfie".enabled'
```

2. Check SOUL.md is updated:
```bash
grep -A5 "Clawra Selfie" ~/.openclaw/workspace/SOUL.md
```

3. Restart OpenClaw:
```bash
openclaw gateway restart
```

4. Check skill logs:
```bash
tail -f ~/.openclaw/logs/gateway.log
```

---

## Provider-Specific Issues

### fal.ai Issues

#### Rate Limited

**Symptoms**: "Rate limit exceeded" error

**Solutions**:

1. Wait 60 seconds and retry

2. Enable caching:
```bash
export CLAWRA_CACHE_ENABLED="true"
```

3. Upgrade plan at [fal.ai](https://fal.ai)

#### Insufficient Credits

**Symptoms**: "Insufficient credits" error

**Solutions**:

1. Check balance at [fal.ai/dashboard/billing](https://fal.ai/dashboard/billing)

2. Add credits or upgrade plan

---

### OpenAI Issues

#### Content Policy Violation

**Symptoms**: "Content policy violation" error

**Solutions**:

1. Simplify prompt (remove potentially problematic content)

2. Try different phrasing

#### High Latency

**Symptoms**: Takes 20-30+ seconds

**Solutions**:

1. Use fal.ai instead (faster)

2. Increase timeout:
```bash
export CLAWRA_TIMEOUT="60000"
```

---

### Stability AI Issues

#### Model Not Available

**Symptoms**: "Model not found" error

**Solutions**:

1. Check available models:
```bash
curl https://api.stability.ai/v1/models \
  -H "Authorization: Bearer $STABILITY_KEY"
```

2. Use correct model name:
```bash
export STABILITY_MODEL="sdxl-v1-0"
```

---

## Performance Issues

### Issue: "Generation is too slow"

**Solutions**:

1. Use faster provider:
```bash
export CLAWRA_PROVIDER="fal"  # Usually fastest
```

2. Enable caching:
```bash
export CLAWRA_CACHE_ENABLED="true"
```

3. Use smaller size:
```bash
export CLAWRA_DEFAULT_SIZE="512"  # Faster but lower quality
```

---

### Issue: "High API costs"

**Solutions**:

1. Enable caching:
```bash
export CLAWRA_CACHE_ENABLED="true"
export CLAWRA_CACHE_TTL="86400"  # 24 hours
```

2. Use cheaper provider:
```bash
export CLAWRA_PROVIDER="stability"  # Usually cheapest
```

3. Reduce image size:
```bash
export CLAWRA_DEFAULT_SIZE="512"
```

---

## Debug Mode

Enable debug logging for detailed information:

```bash
export CLAWRA_DEBUG="true"
```

This will log:
- API requests and responses
- Prompt construction
- Mode detection
- Timing information

---

## Getting Help

If issues persist:

1. Check [GitHub Issues](https://github.com/SumeLabs/clawra/issues)
2. Join [OpenClaw Discord](https://discord.gg/openclaw)
3. Create a new issue with:
   - Error message
   - Environment details
   - Steps to reproduce
   - Debug logs (if possible)

---

## Quick Diagnostic Commands

```bash
# Check installation
which clawra && clawra --version

# Check OpenClaw
openclaw doctor

# Check environment
env | grep -E "(FAL|CLAWRA|OPENAI)"

# Check config
cat ~/.openclaw/openclaw.json | jq '.skills.entries."clawra-selfie"'

# Test generation (if CLI available)
clawra test "wearing a red dress"
```
