---
name: sumecall
description: Start a video call (like Zoom or Google Meet) and share the join link.
metadata:
  {
    "openclaw":
      {
        "emoji": "\U0001F4F9",
        "skillKey": "sumecall",
        "requires": { "bins": ["curl"] },
      },
  }
---

# Video Call

Start a video call from inside a conversation and send the `join_url` to the user.

## When To Use

Use this when:

- The user says things like: "줌 콜하자", "구글 미트 하자", "화상통화하자", "영상통화하자", "콜 하자", "나랑 줌콜하자"
- The user says: "Let's hop on a call", "video call", "zoom call", "let's do a call"
- The conversation is getting too long/complex for chat.
- You (the agent) decide voice/video would be faster.

## API Contract (Portal)

Auth (shared by all endpoints):

- `Authorization: Bearer $SUME_API_KEY`

### `GET /api/v1/me` — whoami

Lightweight endpoint to verify the API key is valid without side-effects.

**Response 200:**

```json
{ "success": true, "data": { "user_id": "user_abc123" } }
```

- `data.user_id` — opaque identifier of the authenticated subject. Treat as opaque string; do not assume format.

**Error responses:** 401 Unauthorized, 429 Too Many Requests (same envelope as below).

### `POST /api/v1/rooms` — create room

### Request Body

| Field | Required | Type | Validation | Purpose |
|---|---|---|---|---|
| `session_id` | **yes** | string | trim, 1..128 | Current conversation session key. Get via `session_status` tool and pass as-is. |
| `topic` | no | string | trim, 1..500 | Room topic; used as default `room_display_name` |
| `room_display_name` | no | string | trim, 1..120 | Display title in meet UI sidebar |
| `agent_key` | no | string | trim, 1..64, `^[a-z0-9_-]+$` | Agent persona key (default: `elonmusk`) |
| `agent_display_name` | no | string | trim, 1..80 | Agent display name override in meet UI |

### Response

Success:

```json
{ "success": true, "data": { "room_name": "...", "join_url": "..." } }
```

Error (HTTP 401 / 400 / 429 / 500):

```json
{ "success": false, "error": "..." }
```

## Bootstrap Flow

On first invocation or when `SUME_API_KEY` is not configured, guide the user through setup.

### Check Credentials

1. Run: `openclaw config get skills.entries.sumecall.apiKey`
2. If a valid key is returned → skip to Workflow
3. If empty or missing → proceed to Setup Guide

### Setup Guide

1. Tell the user they need an API key and direct them to: https://portal.sume.so/settings/api-keys
2. Wait for the user to paste the key (format: `ak_...`)
3. Save the key:
   ```bash
   openclaw config set skills.entries.sumecall.apiKey "<pasted_key>"
   ```
4. Verify by running:
   ```bash
   openclaw config get skills.entries.sumecall.apiKey
   ```
5. Confirm setup is complete and the user can now start video calls.

### Key Validation

After saving, verify the key with the whoami endpoint (no side-effects):
```bash
curl -sS "https://portal.sume.so/api/v1/me" \
  -H "Authorization: Bearer $SUME_API_KEY"
```
- 200 + `user_id` → key is valid.
- 401 → key is invalid, ask user to re-check.

## Workflow

1. **Check credentials** via Bootstrap Flow.
2. **Confirm** with the user: "화상통화 할까?" / "Want to jump on a call?"
3. **Choose topic** — a short, human-readable title summarizing what you are discussing.
4. **Get session_id (required)** — call the `session_status` tool (no params) and copy the `Session Key` from the status card. Pass that value as `session_id` exactly as-is. This is mandatory; never omit it.
5. **Optionally set persona** — if the user specified a persona, set `agent_key` and/or `agent_display_name`.
6. **Create the room** using the bash tool (curl).
7. **Send the join_url** to the user.

## Implementation (bash tool)

Use a single command that:

- Reads `SUME_API_KEY` from the environment.
- Posts JSON to the portal.
- Extracts `join_url`.

Minimal example:

```bash
curl -sS -X POST "https://portal.sume.so/api/v1/rooms" \
  -H "Authorization: Bearer $SUME_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"topic":"First Principles","session_id":"sess_123"}'
```

Full control example:

```bash
curl -sS -X POST "https://portal.sume.so/api/v1/rooms" \
  -H "Authorization: Bearer $SUME_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"topic":"First Principles","session_id":"sess_123","room_display_name":"First Principles","agent_key":"elonmusk","agent_display_name":"Elon Musk"}'
```

If `jq` is available, prefer extracting `join_url` like:

```bash
... | jq -r '.data.join_url'
```

If `jq` is not available, return the raw JSON and manually copy out `data.join_url`.

## Response Template

After successful creation, reply casually with the `join_url`. Never mention "Sume" in the response.

## Safety

- Never print or echo `SUME_API_KEY`.
- Never mention "Sume" in user-facing responses. Use "화상통화" or "video call" instead.
- If the API returns an error, tell the user it failed and ask whether to retry.
- Once the user pastes an API key, save it immediately via `openclaw config set` and remind the user to clear the key from their chat history.
