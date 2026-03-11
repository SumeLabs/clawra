# Usage Examples

Complete usage guide for Clawra.

## Basic Usage

Once installed, your OpenClaw agent will automatically respond to selfie requests.

### Natural Language Prompts

```
"Send me a selfie"
"Send a pic wearing a cowboy hat"
"What are you doing right now?"
"Show me you at a coffee shop"
"Send a photo of yourself"
"Take a picture for me"
```

## Selfie Modes

### Mirror Mode

**Best for**: Outfits, fashion, full-body shots

**Trigger keywords**: `wearing`, `outfit`, `clothes`, `dress`, `suit`, `fashion`, `full-body`, `mirror`

**Examples**:
```
"Send a pic wearing a santa hat"
"Show me your outfit today"
"Send a selfie in a business suit"
"What would you look like in streetwear?"
"Send a pic wearing a summer dress"
```

**Result**: Full-body or half-body shot, mirror reflection style

### Direct Mode

**Best for**: Locations, portraits, close-ups

**Trigger keywords**: `cafe`, `restaurant`, `beach`, `park`, `city`, `location`, `close-up`, `portrait`, `face`, `eyes`, `smile`

**Examples**:
```
"Send a pic at a cozy cafe"
"Show me you at the beach"
"Send a selfie at a concert"
"What would you look like in Paris?"
"Send a close-up portrait"
```

**Result**: Close-up shot, direct eye contact, location context

### Auto Mode

Let Clawra automatically detect the best mode:

```
"Send me a selfie"                    # → Auto-detects based on context
"Send a pic"                          # → Defaults to mirror mode
"What are you doing?"                 # → Asks for context
```

## Advanced Usage

### Specific Fashion Items

```
"Send a pic wearing:
- A leather jacket
- Vintage sunglasses
- A summer hat
- Formal evening wear
- Athleisure outfit
- Cosplay costume
```

### Location Scenarios

```
"Show me you:
- At a sunny beach
- In a cozy library
- At a busy cafe
- In a snowy mountain
- At a concert
- In a garden
- At the gym
- In a kitchen cooking
```

### Creative Scenarios

```
"Send a pic:
- As a cyberpunk character
- In 1920s style
- As an astronaut
- Reading a book
- Playing guitar
- Working on a laptop
- With a pet
- Celebrating birthday
```

## Mode Comparison

| Prompt | Mode | Result |
|--------|------|--------|
| "wearing a red dress" | Mirror | Full-body fashion shot |
| "at a red carpet event" | Direct | Close-up with background |
| "in a winter coat" | Mirror | Outfit showcase |
| "at a snowy cabin" | Direct | Portrait with scenery |

## Tips for Better Results

### 1. Be Specific

✅ Good:
```
"wearing a blue denim jacket with white sneakers"
"at a sunny beach with palm trees"
```

❌ Vague:
```
"wearing something nice"
"somewhere fun"
```

### 2. Use Descriptive Language

✅ Good:
```
"wearing a cozy oversized sweater in autumn colors"
"at a modern coffee shop with warm lighting"
```

### 3. Combine Elements

```
"wearing a leather jacket at a rock concert"
"in formal wear at a gala event"
"wearing workout clothes at the gym"
```

### 4. Seasonal Themes

```
"wearing a winter coat in the snow"
"in a summer dress at the beach"
"wearing a halloween costume"
"in formal attire at a new year's party"
```

## Common Patterns

### Fashion Blog Style

```
"OOTD: wearing [item] at [location]"
"Today's look: [description]"
"Style inspiration: [theme]"
```

### Travel Blog Style

```
"Greetings from [location]!"
"Exploring [place] today"
"Current view: [description]"
```

### Lifestyle Style

```
"Morning routine: [activity]"
"Weekend vibes: [description]"
"Cozy evening: [activity]"
```

## Multi-Platform Usage

Clawra works across all OpenClaw-supported platforms:

### Discord
```
@bot send me a selfie
@bot send a pic wearing headphones
```

### Telegram
```
Send me a selfie
What are you wearing today?
```

### WhatsApp
```
Send a pic
Show me at the beach
```

### Slack
```
/clawra send selfie
/clawra pic wearing a suit
```

## Troubleshooting Common Prompts

### Issue: Mode Not Detected Correctly

**Problem**: "at a cafe" triggers mirror mode

**Solution**: Be more explicit:
```
"Send a direct selfie at a cafe"
"Close-up at a cafe"
```

### Issue: Image Not Consistent

**Problem**: Character looks different each time

**Solution**: Use fal.ai provider (it has image editing):
```bash
export CLAWRA_PROVIDER="fal"
```

### Issue: Generation Too Slow

**Solution**: Use Stability AI or enable caching:
```bash
export CLAWRA_PROVIDER="stability"
export CLAWRA_CACHE_ENABLED="true"
```

## Examples Gallery

### Fashion Examples

```
"wearing a vintage leather jacket"
"in a summer floral dress"
"wearing streetwear with sneakers"
"in formal evening attire"
"wearing cozy winter clothes"
```

### Location Examples

```
"at a tropical beach"
"in a modern art gallery"
"at a busy street market"
"in a quiet library"
"at a rooftop bar"
```

### Activity Examples

```
"reading a book in a cafe"
"cooking in the kitchen"
"working on a laptop"
"playing video games"
"doing yoga"
```

### Seasonal Examples

```
"wearing a halloween costume"
"in a christmas sweater"
"with valentine's day decorations"
"wearing summer beachwear"
"in autumn layers"
```

## Best Practices

1. **Start Simple**: Begin with basic prompts
2. **Add Details**: Gradually add more description
3. **Use Keywords**: Include mode-triggering keywords
4. **Be Patient**: AI generation takes 5-30 seconds
5. **Experiment**: Try different styles and combinations

## Next Steps

- Check [Troubleshooting](./TROUBLESHOOTING.md) for issues
- See [Configuration](./CONFIGURATION.md) for advanced options
- Read [API Reference](./API.md) for programmatic usage
