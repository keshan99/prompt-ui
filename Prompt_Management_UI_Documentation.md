# 🧠 Prompt Management UI — Technical Overview

## 📍 Purpose
This UI provides a **lightweight prompt management dashboard** that integrates directly with **Langfuse** using its **Public REST APIs**.  
It allows internal users to:
- View, edit, and create new prompt versions  
- Duplicate existing prompts  
- Set a version as **production**  
- View metadata (labels, tags, versions, config, etc.)

---

## ⚙️ How It Works

### 1. Authentication
Each **Langfuse project** provides:
- `PUBLIC_KEY`  
- `SECRET_KEY`  
- `BASE_URL`  

These credentials are stored in `.env` for local and server use:

```bash
VITE_LANGFUSE_PUBLIC_KEY=pk-lf-xxxx
VITE_LANGFUSE_SECRET_KEY=sk-lf-xxxx
VITE_LANGFUSE_BASE_URL=https://your-langfuse-instance.com
```

The app authenticates via **Basic Auth**:

```js
Authorization: Basic base64("PUBLIC_KEY:SECRET_KEY")
```

These keys grant access to the **Public Prompt Management API** and can be rotated or replaced from the Langfuse project settings.

> 🔒 **Important:**  
> Langfuse’s “dashboard login” (email, SSO, etc.) is **not usable for API authentication**.  
> The Public API only supports **Basic Auth using project keys**, not user sessions.

---

### 2. Architecture

| Layer | Purpose |
|-------|----------|
| **React Frontend** | Displays and edits prompts (chat/text modes, placeholders, config). |
| **Langfuse Public API** | Provides prompt listing, retrieval, and version creation. |
| **Langfuse SDK (JS)** | Used only for operations not exposed by the public API (e.g., updating production labels). |

**Data Flow Example:**

```
UI → fetch /api/public/v2/prompts → display list  
UI → fetch /api/public/v2/prompts/{name}?label=latest → show version details  
UI → POST /api/public/v2/prompts → create new version  
UI → langfuse.prompt.update() → move production label
```

---

### 3. Prompt Storage Format
Langfuse supports two prompt types:
- **Text prompts:** raw text with `{{variables}}`
- **Chat prompts:** an array of message blocks (system, user, placeholders)

**Example:**
```json
[
  { "role": "system", "content": "You are a helpful assistant." },
  { "type": "placeholder", "name": "chat_history" },
  { "role": "user", "content": "Hi there!" }
]
```

Our UI automatically maps:
- `type: "placeholder"` ↔ editable placeholder row  
- `role: "system" | "user"` ↔ message blocks

---

## 🔑 Why We Use Keys (and Not Langfuse Login)

Using the **PUBLIC_KEY** and **SECRET_KEY** is the only supported method for programmatic access to prompts, traces, and generations.

In the future, we can move the key configuration to a **settings section in our UI** or use a **backend proxy**:
- The UI authenticates via our own system (e.g., login).  
- The backend securely stores and uses Langfuse keys for API calls.  
- Prevents exposing the secret key to browser clients.

---

## 🚫 Limitations (Current Public API)

| Function | Status | Notes |
|-----------|---------|-------|
| List all prompts | ✅ | `/api/public/v2/prompts` |
| Get specific version | ✅ | `/api/public/v2/prompts/{name}?version=...` |
| Create new version | ✅ | `/api/public/v2/prompts` |
| Set production label | ✅ (via SDK) | `langfuse.prompt.update()` |
| Delete prompt / version | ❌ **Not supported** | Not available in public API or SDK |
| Rename prompt | ❌ | Requires creating a new prompt and deleting old manually |
| Authentication via user login | ❌ | Only project keys supported |

---

## 🧰 API Reference (used by our app)

| Method | Endpoint | Purpose |
|:--------|:----------|:----------|
| **GET** | `/api/public/v2/prompts` | List all prompts |
| **GET** | `/api/public/v2/prompts/{name}` | Get prompt metadata |
| **GET** | `/api/public/v2/prompts/{name}?label=latest` | Get latest version |
| **POST** | `/api/public/v2/prompts` | Create a new version |
| **PATCH** | (SDK only) | Update labels (`set as production`) |
