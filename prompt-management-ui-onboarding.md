# 🧭 Providing Options to Onboard with the Prompt Management UI

This page explains how our internal **Prompt Management UI** works, how teams can **onboard their AI agents**, and how **agent-specific prompts** are handled within the interface.

---

## 🎯 Overview

We’ve built a **custom Langfuse-integrated UI** that allows our teams to:
- Manage prompts visually without using the Langfuse dashboard.
- Group prompts by **AI Agent** (instead of showing all prompts together).
- Quickly create, edit, version, or set production prompts.
- Duplicate or onboard prompts for new agents.

This tool interacts directly with the **Langfuse Public API** using project credentials (`PUBLIC_KEY` and `SECRET_KEY`) defined in the `.env` file.

---

## ⚙️ How It Works

### 1. Architecture Summary

| Layer | Description |
|-------|--------------|
| **Frontend (React)** | The UI lists all agents and their related prompts. Agents can be expanded to view or manage prompts. |
| **Langfuse Public API** | Handles listing, versioning, creation, and labeling of prompts. |
| **Langfuse SDK (JS)** | Used to update prompt labels (e.g., marking a version as `production`). |
| **Environment Variables** | `.env` file stores project keys and base URL securely. |

```bash
VITE_LANGFUSE_PUBLIC_KEY=pk-lf-xxxx
VITE_LANGFUSE_SECRET_KEY=sk-lf-xxxx
VITE_LANGFUSE_BASE_URL=https://your-langfuse-instance.com
```

All communication happens via `Basic Auth` using these keys.

---

## 🧩 Agent-Based Prompt Handling

Instead of showing all prompts in one flat list (as in Langfuse), our UI groups them by **Agent**.

Each prompt is automatically assigned to an agent using a **tag convention**:

```bash
agent:SupportBot
agent:FinanceAssistant
agent:DataQA
```

### Example
- Prompt tagged with `agent:SupportBot` → shown under “SupportBot” agent.
- Prompts without any tag → appear under “Unassigned”.

When new prompts are created:
- The user can manually enter an agent name.
- The system automatically tags the prompt as `agent:<name>`.
- These prompts then appear under the correct agent section next time the list is refreshed.

---

## 🖥️ How to Use the UI

### Step 1 — Launch the App
Run the UI (local or hosted). You’ll be asked to connect your Langfuse project credentials.

> ⚠️ These credentials are **project keys**, not personal logins.  
> Langfuse does not support login/SSO for API access.

---

### Step 2 — View Agents
Once loaded, you’ll see a **list of all Agents**.  
Each agent card shows:
- Agent name
- Number of prompts available
- Expand/collapse button

📸 *[Screenshot placeholder: “Agent overview section”]*

---

### Step 3 — Expand an Agent
Click an agent row to expand and view its prompts.

You can now:
- View prompt name, type, labels, and tags
- Duplicate prompts
- Click a prompt to open its full detail view

📸 *[Screenshot placeholder: “Expanded agent view with prompts”]*

---

### Step 4 — Create or Edit a Prompt
Click **+ New Prompt** to create one.

You can:
- Choose prompt type (Text or Chat)
- Add roles or placeholders for Chat prompts
- Assign the prompt to an agent (auto-tags it)
- Optionally include configuration JSON

📸 *[Screenshot placeholder: “Prompt creation form (chat example)”]*

---

### Step 5 — Set Production Version
When viewing an existing prompt:
- Use **“Set as Production”** to mark a specific version.
- The label updates automatically in Langfuse.

📸 *[Screenshot placeholder: “Prompt version detail with production label”]*

---

## 🧠 Key Features Recap

✅ Group prompts by agent  
✅ Support for `text` and `chat` prompt modes  
✅ Add placeholders with validation  
✅ Create, edit, or duplicate prompts  
✅ Mark prompt versions as `production`  
✅ “Unassigned” section for orphaned prompts  
✅ Built-in search (agents + prompts)

📸 *[Screenshot placeholder: “Search bar and filtered results view”]*

---

## 🔒 Security Notes

- Authentication uses **Langfuse project keys** only.
- Keys are stored locally via `.env` — no user login system yet.
- For production, a **backend proxy** can be added to hide the secret key from browser clients.

---

## 🚧 Limitations

| Feature | Status |
|----------|---------|
| Prompt Deletion | ❌ Not supported by Langfuse API |
| Rename Prompt | ❌ Requires creating a new prompt |
| User Login / Auth | ❌ Not supported; use project keys |
| Group Rename | ✅ Rename tags to change grouping |
| Version Labeling | ✅ Fully supported |

---

## 🖼️ Suggested Images for Wiki Page

You can add the following images/screenshots in your Confluence wiki:

1. **UI Overview** — top-level view showing all agents.  
   _Screenshot placeholder: `ui_overview`_

2. **Expanded Agent View** — showing prompts grouped under an agent.  
   _Screenshot placeholder: `expanded_agent`_

3. **Prompt Creation Form** — with chat/text tabs visible.  
   _Screenshot placeholder: `create_prompt_form`_

4. **Placeholder Example** — a chat prompt showing placeholder inputs.  
   _Screenshot placeholder: `placeholder_example`_

5. **Prompt Detail View** — showing version labels (production/latest).  
   _Screenshot placeholder: `prompt_detail`_

6. **Search Demo** — search bar filtering across agents and prompts.  
   _Screenshot placeholder: `search_demo`_

---

## 📦 Future Enhancements
- Add backend proxy for authentication (hide keys from UI)
- Enable prompt deletion or archival
- Integrate user roles & permissions
- Add audit logs for prompt changes

---

**Author:** [Your Name or Team]  
**Last Updated:** {{Insert Date}}
