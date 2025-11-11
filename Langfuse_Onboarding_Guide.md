# 🧭 Onboarding End Users with Langfuse

This guide explains how to onboard end users into **Langfuse**, focusing on **Prompt Management** — including creating, testing, and managing prompt versions through both the Langfuse UI and integrated applications.

---

## 🔗 1. Access Langfuse Hosted Environment

Use the following link to access the Langfuse instance:  
👉 **[Langfuse Dashboard URL – _replace this link_]**

> 💡 You’ll need an active Langfuse account to log in. Contact the admin if you don’t have access.

**📸 Screenshot Placeholder:**  
`[Add screenshot: Langfuse login page]`

---

## 🧩 2. Overview of Langfuse Features

Langfuse provides full observability for your LLM and GenAI applications.  
Key features include:

| Feature | Description |
|----------|--------------|
| **Prompt Management** | Centralized control over prompts with versioning and metadata. |
| **Tracing & Metrics** | Track requests, responses, and token usage for LLM calls. |
| **Evaluation** | Set up qualitative or quantitative tests to monitor model performance. |
| **Analytics** | Aggregate dashboard for latency, cost, and quality insights. |

In this onboarding, we will primarily focus on **Prompt Management**.

**📸 Screenshot Placeholder:**  
`[Add screenshot: Langfuse dashboard overview]`

---

## ✨ 3. Prompt Management Workflow

Langfuse allows managing prompts as first-class entities with support for:
- Creating and editing prompts.
- Maintaining multiple versions.
- Tagging versions as “production,” “staging,” or custom labels.
- Integrating directly via API or SDK for retrieval.

### 3.1 Create or Import a Prompt
1. Navigate to **Prompts** in the left menu.  
2. Click **“Create new prompt.”**
3. Define a **Prompt Name**, **Input Variables**, and **Base Template**.
4. Save it — this becomes **version 1**.

**📸 Screenshot Placeholder:**  
`[Add screenshot: Create new prompt screen]`

---

## 🧪 4. Testing Prompts with a Live Application

You can test prompts directly from your hosted application integrated with Langfuse.  
Follow these steps to validate how a prompt performs in real time.

### 4.1 Access the Live Testing App
Open the app here:  
👉 **[Add live testing app URL here]**

### 4.2 Sample Code for Prompt Invocation

Below is an example of how to fetch and use a prompt dynamically in Python using the Langfuse SDK:

```python
from langfuse import Langfuse
from openai import OpenAI

# Initialize Langfuse
lf = Langfuse(
    public_key="YOUR_PUBLIC_KEY",
    secret_key="YOUR_SECRET_KEY",
    base_url="https://your-langfuse-url.com"
)

# Fetch the latest production prompt
prompt = lf.get_prompt("support-summarizer", label="production")

# Example OpenAI call using the prompt
client = OpenAI(api_key="YOUR_OPENAI_KEY")

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": prompt["template"]},
        {"role": "user", "content": "Summarize this support conversation"}
    ],
)

print(response.choices[0].message.content)
```

**📸 Screenshot Placeholder:**  
`[Add screenshot: Prompt version in Langfuse UI + code test result]`

---

## 🔄 5. Managing Prompt Versioning

Langfuse automatically creates a new version every time a prompt is edited.  
You can assign labels such as `production`, `staging`, or custom tags for better deployment control.

### 5.1 Creating a New Version
- Open an existing prompt.
- Click **“Create new version.”**
- Modify the template and save changes.
- The **latest** label is automatically assigned to the newest version.

### 5.2 Assigning a Production Label
- Go to the version history.
- Select the desired version.
- Assign the **production** label to make it active for your applications.

> ⚠️ Note: “latest” is automatically maintained by Langfuse and cannot be manually changed.

**📸 Screenshot Placeholder:**  
`[Add screenshot: Version management screen]`

---

## 🧠 6. Best Practices for Prompt Management

| Practice | Recommendation |
|-----------|----------------|
| **Use consistent naming** | Keep prompt names descriptive and consistent across teams. |
| **Leverage labels** | Use `staging`, `production`, etc. to control deployment environments. |
| **Track versions** | Always document version changes (especially for prompt refinements). |
| **Monitor performance** | Use traces and feedback metrics to iterate intelligently. |

**📸 Screenshot Placeholder:**  
`[Add screenshot: Langfuse prompt list with version tags]`

---

## ✅ 7. Summary

By following the above steps, you can:
- Log in and explore Langfuse.
- Create and manage prompts effectively.
- Test live prompts using your app integration.
- Maintain versioned control and production-ready setups.

For any setup or access issues, please reach out to the **AI Engineering / Langfuse Admin team**.

---

## 📸 Suggested Screenshots to Include

| Section | Image Description |
|----------|-------------------|
| 1 | Langfuse login page |
| 2 | Dashboard overview |
| 3 | Create new prompt form |
| 4 | Prompt list and tags |
| 4 | Code test example / console output |
| 5 | Version history view |
| 6 | Production label assignment screen |

---

**Last Updated:** 2025-11-11  
**Author:** Udara Nilupul Bandara  
**Team:** AI & Data Engineering
