# ⚙️ Updating Live Prompts in Langfuse (For Non-Technical Users)

This page provides a **step-by-step guide** for authorized users to safely update **production prompts** in **Langfuse**, and immediately view changes reflected in the **XL+ live chat application** — without requiring any coding or technical steps.

---

## 🧭 Purpose

To allow approved business or support users to:
- Safely edit prompt text in **Langfuse** (production environment).  
- Save the new version without breaking the live system.  
- Verify changes instantly inside the **XL+ chat** application.  

> ⚠️ **Note:** This guide applies only to the official **production environment**. Please follow each step carefully to avoid accidental disruptions.

---
### After Logging In

After you log in, you will see a list of **Organizations**.  
Select **XLPlues_dev** and then open **demo_project**.

If you accidentally end up in the wrong project/environment or if your dashboard looks different from the screenshots, don’t worry — at the top of the page (as shown in the image), you’ll see the **current environment/organization name**.  
Click it, and you’ll get the full list of organizations. From there, select **XLPlues_dev** and then choose **demo_project**.

**📸 Screenshot Placeholder:**  
`[Add screenshot: Organization dropdown showing XLPlues_dev and demo_project selection]`


## 🪜 Step-by-Step Guide

### Step 1 — Access Langfuse (Production)
1. Go to **[Langfuse Production URL – replace here]**
2. Log in with your company credentials.
3. From the sidebar, click **Prompts** → locate the prompt you want to update (e.g. `xlplus-support-summarizer`).

**📸 Screenshot Placeholder:**  
`[Add screenshot: Langfuse login screen and prompts menu]`

---

### Step 2 — Locate the Correct Prompt
1. Use the **Search bar** to find the correct production prompt.  
2. Check that the prompt name ends with “-prod” or “-production” (to ensure you are editing the correct one).  
3. Open it to view the current live version.

**📸 Screenshot Placeholder:**  
`[Add screenshot: Prompt list showing production prompts with version tags]`

---

### Step 3 — Create a Safe New Version
1. Click **“Create new version”** in the top-right corner.  
2. A copy of the current version will open in edit mode.  
3. Make your required text updates — for example, improve wording, change tone, or adjust system message.  
   - ✅ You **can** edit text and instructions.  
   - 🚫 Do **not** remove placeholders such as `{{input}}`, `{{context}}`, or `{{history}}`.  

**📸 Screenshot Placeholder:**  
`[Add screenshot: Edit prompt view with safe editable section highlighted]`

---

### Step 4 — Save and Label the Version
1. Once you finish editing, click **Save new version**.  
2. Langfuse automatically increments the version number (e.g. v5 → v6).  
3. Write a short **description** (like a commit message) before saving — e.g. *“Adjusted greeting tone for customer replies.”*

> 💡 **Tip:** The new version is saved but not yet active for live traffic.

**📸 Screenshot Placeholder:**  
`[Add screenshot: Save new version confirmation dialog]`

---

### Step 5 — Activate the Version for Production
1. In the prompt’s **Version History**, select the new version you created.  
2. Click **Assign label → production**.  
3. Confirm when prompted — this updates the live XL+ app to use your new version instantly.

> ⚠️ This is the **only step that changes the live system.**  
> Always double-check the version number and description before confirming.

**📸 Screenshot Placeholder:**  
`[Add screenshot: Version history showing production label assignment]`

---

### Step 6 — Test the Change in the XL+ Application
1. Open the **XL+ chat application**:  
   👉 **[Add XL+ production chat URL here]**
2. Start a new conversation using the same scenario as before.
3. Observe how the new prompt version affects responses (tone, structure, etc.).  
4. If results look incorrect, go back to Langfuse and **revert to the previous version** (see Step 7).

**📸 Screenshot Placeholder:**  
`[Add screenshot: XL+ chat showing new response behaviour]`

---

### Step 7 — Revert if Needed
1. In Langfuse, open the **Version History** tab for that prompt.  
2. Find the previous version (for example, v5).  
3. Click **Assign label → production** again to roll back instantly.  
4. Confirm — the system immediately switches back to the previous version.

**📸 Screenshot Placeholder:**  
`[Add screenshot: Revert to previous version screen]`

---

## 🧠 Best-Practice Checklist

| Task | Recommendation |
|------|----------------|
| **Version description** | Always write a short commit-style message when saving new versions. |
| **Testing** | Test results right after switching to production in the XL+ chat. |
| **Rollback** | If unsure, revert immediately — Langfuse keeps all versions. |
| **Safety** | Never delete prompts; always use “Create new version.” |
| **Team communication** | Notify the AI/Engineering team after production updates. |

---

## 📸 Suggested Screenshots to Include

| Section | Image Description |
|----------|-------------------|
| Step 1 | Langfuse login and prompts menu |
| Step 2 | Production prompt list with search results |
| Step 3 | Editing prompt (highlight editable text) |
| Step 4 | Save version confirmation window |
| Step 5 | Assign production label screen |
| Step 6 | XL+ chat showing updated output |
| Step 7 | Version rollback screen |

---

**Last Updated:** {{CURRENT_DATE}}  
**Author:** Udara Nilupul Bandara  
**Team:** AI & Data Engineering
