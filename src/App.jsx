// src/App.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { LangfuseClient } from "@langfuse/client";

const RESERVED_LABELS = new Set(["latest"]);
const AGENT_TAG_PREFIX = "agent:";

export default function App() {
  // --- ENV ---
  const baseUrl =
    import.meta.env.VITE_LANGFUSE_BASE_URL?.replace(/\/$/, "") || "";
  const publicKey = import.meta.env.VITE_LANGFUSE_PUBLIC_KEY || "";
  const secretKey = import.meta.env.VITE_LANGFUSE_SECRET_KEY || "";

  // --- GLOBAL UI STATE ---
  const [mode, setMode] = useState("list"); // "list" | "detail" | "create"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // --- DATA: prompts flat + agents grouping ---
  const [prompts, setPrompts] = useState([]);
  const [agentsMap, setAgentsMap] = useState({});
  const [openAgents, setOpenAgents] = useState({});
  const [query, setQuery] = useState("");

  // --- SELECTION / VERSIONS ---
  const [selectedName, setSelectedName] = useState("");
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [productionVersion, setProductionVersion] = useState(null);
  const [latestVersion, setLatestVersion] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(null);

  // --- FORM STATE ---
  const [formName, setFormName] = useState("");
  const [formAgent, setFormAgent] = useState("");
  const [formType, setFormType] = useState("text"); // "text" | "chat"
  const [formPromptText, setFormPromptText] = useState(""); // text-mode only
  const [chatRows, setChatRows] = useState([
    { id: 1, role: "system", content: "" },
    { id: 2, role: "user", content: "" },
  ]); // chat-mode rows

  const [formLabels, setFormLabels] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formConfig, setFormConfig] = useState("");
  const [formCommitMessage, setFormCommitMessage] = useState("");
  const [submitResult, setSubmitResult] = useState(null);

  // --- AUTH ---
  const authHeader = "Basic " + btoa(`${publicKey}:${secretKey}`);

  const langfuse = useMemo(() => {
    try {
      if (!publicKey || !secretKey || !baseUrl) return null;
      return new LangfuseClient({ publicKey, secretKey, baseUrl });
    } catch (err) {
      console.warn("Could not initialise Langfuse client", err);
      return null;
    }
  }, [publicKey, secretKey, baseUrl]);

  // --- HELPERS (agent mapping & placeholders) ---
  const showToast = useCallback((msg) => {
    setToast(msg);
    const id = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(id);
  }, []);

  const guardCreds = useCallback(() => {
    if (!publicKey || !secretKey || !baseUrl) {
      setError(
        "Please set VITE_LANGFUSE_PUBLIC_KEY, VITE_LANGFUSE_SECRET_KEY and VITE_LANGFUSE_BASE_URL in your .env"
      );
      return false;
    }
    return true;
  }, [publicKey, secretKey, baseUrl]);

  const getAgentFromPrompt = (p) => {
    const t = (p?.tags || []).find(
      (x) => typeof x === "string" && x.startsWith(AGENT_TAG_PREFIX)
    );
    if (t) return t.slice(AGENT_TAG_PREFIX.length);
    if (typeof p?.name === "string" && p.name.includes("/")) {
      return p.name.split("/")[0];
    }
    return "Unassigned";
  };

  const applyAgentTag = (tagsArray, agentName) => {
    const tags = Array.isArray(tagsArray) ? [...tagsArray] : [];
    const withoutAgent = tags.filter(
      (t) => !String(t).startsWith(AGENT_TAG_PREFIX)
    );
    return agentName
      ? [...withoutAgent, `${AGENT_TAG_PREFIX}${agentName}`]
      : withoutAgent;
  };

  // --- API CALLS ---
  const fetchPrompts = useCallback(async () => {
    if (!guardCreds()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/api/public/v2/prompts`, {
        headers: { Authorization: authHeader },
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Error ${res.status}: ${text}`);
      const data = text ? JSON.parse(text) : {};
      const list = (Array.isArray(data) ? data : data.data) ?? [];
      list.sort((a, b) => a.name.localeCompare(b.name));
      setPrompts(list);

      // build agents map
      const grouped = {};
      for (const p of list) {
        const agent = getAgentFromPrompt(p);
        if (!grouped[agent]) grouped[agent] = [];
        grouped[agent].push(p);
      }
      for (const k of Object.keys(grouped)) {
        grouped[k].sort((a, b) => a.name.localeCompare(b.name));
      }
      setAgentsMap(grouped);
    } catch (err) {
      setError(err?.message || "Failed to fetch prompts");
    } finally {
      setLoading(false);
    }
  }, [authHeader, baseUrl, guardCreds]);

  const fetchPromptVersion = useCallback(
    async (name, { version = null, label = null } = {}) => {
      let qs = "";
      if (version !== null) qs = `?version=${encodeURIComponent(version)}`;
      else if (label !== null) qs = `?label=${encodeURIComponent(label)}`;

      const res = await fetch(
        `${baseUrl}/api/public/v2/prompts/${encodeURIComponent(name)}${qs}`,
        { headers: { Authorization: authHeader } }
      );
      const text = await res.text();
      if (!res.ok) throw new Error(`Error ${res.status}: ${text}`);
      return text ? JSON.parse(text) : {};
    },
    [authHeader, baseUrl]
  );

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  // --- HYDRATE FORM WHEN currentVersion CHANGES ---
  useEffect(() => {
    if (!currentVersion) return;

    setFormName(currentVersion.name || "");
    setFormType(currentVersion.type || "text");
    setFormAgent(getAgentFromPrompt(currentVersion));

    if (currentVersion.type === "chat") {
      const arr = Array.isArray(currentVersion.prompt)
        ? currentVersion.prompt
        : [];
      setChatRows(
        arr.map((m, i) => {
          if (m?.type === "placeholder" && m?.name) {
            return {
              id: Date.now() + i,
              role: "placeholder",
              content: String(m.name),
            };
          }
          if (m?.role === "placeholder") {
            const raw = (typeof m.content === "string" ? m.content : "").trim();
            const name = raw.replace(/^\{\{|\}\}$/g, "");
            return { id: Date.now() + i, role: "placeholder", content: name };
          }
          return {
            id: Date.now() + i,
            role: m.role || "user",
            content:
              typeof m.content === "string"
                ? m.content
                : JSON.stringify(m.content ?? "", null, 2),
          };
        })
      );
      setFormPromptText("");
    } else {
      setFormPromptText(currentVersion.prompt || "");
      setChatRows([
        { id: 1, role: "system", content: "" },
        { id: 2, role: "user", content: "" },
      ]);
    }

    const safeLabels = Array.isArray(currentVersion.labels)
      ? currentVersion.labels.filter((l) => !RESERVED_LABELS.has(l))
      : [];
    setFormLabels(safeLabels.join(", "));
    setFormTags(
      Array.isArray(currentVersion.tags) ? currentVersion.tags.join(", ") : ""
    );

    if (currentVersion.config) {
      try {
        setFormConfig(JSON.stringify(currentVersion.config, null, 2));
      } catch {
        setFormConfig("");
      }
    } else {
      setFormConfig("");
    }

    setFormCommitMessage("");
    setSubmitResult(null);
  }, [currentVersion]);

  // --- NAV HELPERS ---
  const goLanding = useCallback(() => {
    setMode("list");
    setSelectedName("");
    setSelectedMeta(null);
    setCurrentVersion(null);
    setProductionVersion(null);
    setLatestVersion(null);
    setSubmitResult(null);
  }, []);

  const handleSelectPrompt = useCallback(
    (name) => {
      setSelectedName(name);
      setMode("detail");
      const meta = prompts.find((p) => p.name === name) || null;
      setSelectedMeta(meta);
      setCurrentVersion(null);
      setProductionVersion(null);
      setLatestVersion(null);
      setLoading(true);
      setError("");
      Promise.all([
        fetchPromptVersion(name, { label: "production" }).catch(() => null),
        fetchPromptVersion(name, { label: "latest" }).catch(() => null),
      ])
        .then(([prod, latest]) => {
          setProductionVersion(prod);
          setLatestVersion(latest);
          setCurrentVersion(prod || latest || null);
        })
        .catch((err) =>
          setError(err?.message || "Failed to fetch prompt versions")
        )
        .finally(() => setLoading(false));
    },
    [fetchPromptVersion, prompts]
  );

  const startNewPrompt = useCallback(() => {
    setMode("create");
    setSelectedName("");
    setSelectedMeta(null);
    setCurrentVersion(null);
    setProductionVersion(null);
    setLatestVersion(null);
    setFormName("");
    setFormAgent("");
    setFormType("text");
    setFormPromptText("");
    setChatRows([
      { id: 1, role: "system", content: "" },
      { id: 2, role: "user", content: "" },
    ]);
    setFormLabels("");
    setFormTags("");
    setFormConfig("");
    setFormCommitMessage("");
    setSubmitResult(null);
  }, []);

  const duplicatePrompt = useCallback(() => {
    if (!currentVersion) return;
    setMode("create");
    setSelectedName("");
    setSelectedMeta(null);
    setCurrentVersion(null);
    setProductionVersion(null);
    setLatestVersion(null);

    setFormName(`${currentVersion.name}-copy`);
    setFormAgent(getAgentFromPrompt(currentVersion));
    setFormType(currentVersion.type || "text");

    if (currentVersion.type === "chat") {
      const arr = Array.isArray(currentVersion.prompt)
        ? currentVersion.prompt
        : [];
      setChatRows(
        arr.map((m, i) => {
          if (m?.type === "placeholder" && m?.name) {
            return { id: Date.now() + i, role: "placeholder", content: m.name };
          }
          if (m?.role === "placeholder") {
            const raw = (typeof m.content === "string" ? m.content : "").trim();
            const name = raw.replace(/^\{\{|\}\}$/g, "");
            return { id: Date.now() + i, role: "placeholder", content: name };
          }
          return {
            id: Date.now() + i,
            role: m.role || "user",
            content: typeof m.content === "string" ? m.content : "",
          };
        })
      );
      setFormPromptText("");
    } else {
      setFormPromptText(currentVersion.prompt || "");
      setChatRows([
        { id: 1, role: "system", content: "" },
        { id: 2, role: "user", content: "" },
      ]);
    }

    const safeLabels = Array.isArray(currentVersion.labels)
      ? currentVersion.labels.filter((l) => !RESERVED_LABELS.has(l))
      : [];
    setFormLabels(safeLabels.join(", "));
    setFormTags(
      Array.isArray(currentVersion.tags) ? currentVersion.tags.join(", ") : ""
    );
    setFormConfig(
      currentVersion.config
        ? JSON.stringify(currentVersion.config, null, 2)
        : ""
    );
    setFormCommitMessage("");
    showToast("Duplicated into form. Change the name and submit.");
  }, [currentVersion, showToast]);

  const setAsProduction = useCallback(
    async () => {
      if (!langfuse) {
        setError(
          "Langfuse SDK is unavailable. Install @langfuse/client and set credentials."
        );
        showToast("SDK not available");
        return;
      }
      if (!selectedMeta || !currentVersion) {
        showToast("Select a prompt version first");
        return;
      }
      const name = selectedMeta.name;
      const targetVersion = currentVersion.version;
      if (!targetVersion) {
        showToast("Version is undefined");
        return;
      }
      if (
        !window.confirm(
          `Set version #${targetVersion} of “${name}” as production?`
        )
      )
        return;

      setLoading(true);
      setError("");
      try {
        if (
          productionVersion &&
          productionVersion.version &&
          productionVersion.version !== targetVersion
        ) {
          const prev = (productionVersion.labels || []).filter(
            (l) => l !== "production" && !RESERVED_LABELS.has(l)
          );
          await langfuse.prompt.update({
            name,
            version: productionVersion.version,
            newLabels: prev,
          });
        }
        const cleaned = (currentVersion.labels || []).filter(
          (l) => l !== "production" && !RESERVED_LABELS.has(l)
        );
        const newLabels = Array.from(new Set([...cleaned, "production"]));
        await langfuse.prompt.update({
          name,
          version: targetVersion,
          newLabels,
        });

        showToast("Production label updated");
        await fetchPrompts();
        handleSelectPrompt(name);
      } catch (err) {
        const msg =
          err?.message ||
          "Failed to update production label (check SDK credentials/host)";
        setError(msg);
        showToast("Failed to set production");
      } finally {
        setLoading(false);
      }
    },
    [
      currentVersion,
      fetchPrompts,
      handleSelectPrompt,
      langfuse,
      productionVersion,
      selectedMeta,
      showToast,
    ]
  );

  // --- CHAT EDITOR HANDLERS ---
  const handleAddChatRow = useCallback((role) => {
    setChatRows((r) => [...r, { id: Date.now(), role, content: "" }]);
  }, []);

  const handleRemoveChatRow = useCallback((id) => {
    setChatRows((r) => r.filter((row) => row.id !== id));
  }, []);

  const handleChatRowChange = useCallback((id, field, value) => {
    setChatRows((r) =>
      r.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }, []);

  // --- SUBMIT (CREATE / NEW VERSION) ---
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");
      setSubmitResult(null);

      // 1) Build prompt body first
      let promptBody;
      if (formType === "chat") {
        const built = [];
        const nameRx = /^[A-Za-z_][A-Za-z0-9_]*$/;
        for (const r of chatRows) {
          if (r.role === "placeholder") {
            const name = String(r.content || "").trim();
            if (!nameRx.test(name)) {
              setError(
                "Invalid placeholder name. Use letters/numbers/underscore, starting with a letter or underscore (e.g., chat_history)."
              );
              return;
            }
            built.push({ type: "placeholder", name });
          } else {
            built.push({ role: r.role, content: r.content ?? "" });
          }
        }
        promptBody = built;
      } else {
        promptBody = formPromptText;
      }

      // 2) Parse labels/tags/config
      let labels = [];
      if (formLabels?.trim()) {
        labels = formLabels
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .filter((l) => !RESERVED_LABELS.has(l));
      }

      let tags = [];
      if (formTags?.trim()) {
        tags = formTags.split(",").map((s) => s.trim()).filter(Boolean);
      }
      // enforce single agent tag
      tags = applyAgentTag(tags, formAgent?.trim());

      let configObj;
      if (formConfig?.trim()) {
        try {
          configObj = JSON.parse(formConfig);
        } catch (err) {
          setError("Invalid config JSON: " + err.message);
          return;
        }
      }

      // 3) Build payload
      const payload = {
        type: formType,
        name: formName,
        prompt: promptBody,
        ...(labels.length ? { labels } : {}),
        ...(tags.length ? { tags } : {}),
        ...(configObj ? { config: configObj } : {}),
        ...(formCommitMessage?.trim()
          ? { commitMessage: formCommitMessage.trim() }
          : {}),
      };

      // 4) Submit
      setLoading(true);
      try {
        const res = await fetch(`${baseUrl}/api/public/v2/prompts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify(payload),
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`Error ${res.status}: ${text}`);
        const data = text ? JSON.parse(text) : {};
        setSubmitResult(data);

        await fetchPrompts();
        await handleSelectPrompt(formName);
        setCurrentVersion(data);
        setMode("detail");

        showToast(currentVersion ? "New version created" : "Prompt created");
      } catch (err) {
        setError(err?.message || "Failed to submit prompt");
      } finally {
        setLoading(false);
      }
    },
    [
      authHeader,
      baseUrl,
      chatRows,
      currentVersion,
      fetchPrompts,
      formAgent,
      formCommitMessage,
      formConfig,
      formLabels,
      formName,
      formPromptText,
      formTags,
      formType,
      handleSelectPrompt,
      showToast,
    ]
  );

  // --- AGENT ENTRIES (SEARCH + UNASSIGNED AT BOTTOM) ---
  const agentEntries = useMemo(() => {
    const entries = Object.entries(agentsMap || {});
    const q = query.trim().toLowerCase();

    // If no search, just sort agents with "Unassigned" at the bottom
    if (!q) {
      const normal = [];
      let unassigned = null;
      for (const [agent, items] of entries) {
        if (agent === "Unassigned") unassigned = [agent, items];
        else normal.push([agent, items]);
      }
      normal.sort((a, b) => a[0].localeCompare(b[0]));
      if (unassigned) normal.push(unassigned);
      return normal;
    }

    // With search: filter prompts per agent
    const filtered = [];
    for (const [agent, items] of entries) {
      const agentMatch = agent.toLowerCase().includes(q);

      const filteredItems = items.filter((p) => {
        const labels = Array.isArray(p.labels) ? p.labels.join(" ") : "";
        const tags = Array.isArray(p.tags) ? p.tags.join(" ") : "";
        return (
          p.name.toLowerCase().includes(q) ||
          (p.type || "").toLowerCase().includes(q) ||
          labels.toLowerCase().includes(q) ||
          tags.toLowerCase().includes(q)
        );
      });

      if (agentMatch) {
        filtered.push([agent, items]);
      } else if (filteredItems.length > 0) {
        filtered.push([agent, filteredItems]);
      }
    }

    const normal = [];
    let unassigned = null;
    for (const [agent, items] of filtered) {
      if (agent === "Unassigned") unassigned = [agent, items];
      else normal.push([agent, items]);
    }
    normal.sort((a, b) => a[0].localeCompare(b[0]));
    if (unassigned) normal.push(unassigned);

    return normal;
  }, [agentsMap, query]);

  // --- RENDER ---
  return (
    <div className="light-root">
      {/* Header */}
      <header className="lf-topbar">
        <h1>
          {mode === "list"
            ? "Agents & Prompts"
            : mode === "detail"
            ? selectedName
            : "Create Prompt"}
        </h1>
        <div>
          {mode === "list" && (
            <>
              <button className="btn" onClick={fetchPrompts} disabled={loading}>
                ↻ Refresh
              </button>
              <button className="btn primary" onClick={startNewPrompt}>
                + New prompt
              </button>
            </>
          )}
          {mode !== "list" && (
            <button className="btn ghost" onClick={goLanding}>
              ← Back
            </button>
          )}
        </div>
      </header>

      <main className="container">
        {error && (
          <div className="alert error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {mode === "list" && (
          <>
            {/* Search */}
            <div className="toolbar">
              <div className="search-wrap">
                <span className="search-ico">🔍</span>
                <input
                  placeholder="Search agents & prompts…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Agents accordion */}
            <div className="table-card">
              <div className="panel-head">Agents</div>
              <ul className="agent-accordion">
                {agentEntries.map(([agent, items]) => {
                  const isOpen = !!openAgents[agent];
                  return (
                    <li
                      key={agent}
                      className={`agent-item ${isOpen ? "open" : ""}`}
                    >
                      <button
                        className="agent-row"
                        aria-expanded={isOpen}
                        aria-controls={`agent-panel-${agent}`}
                        onClick={() =>
                          setOpenAgents((s) => ({ ...s, [agent]: !s[agent] }))
                        }
                      >
                        <span className="agent-left">
                          <span
                            className={`caret ${isOpen ? "open" : ""}`}
                            aria-hidden="true"
                          >
                            ▸
                          </span>
                          <span className="agent-name">{agent}</span>
                        </span>
                        <span
                          className="count"
                          title={`${items.length} prompts`}
                        >
                          {items.length}
                        </span>
                      </button>

                      {isOpen && (
                        <div
                          id={`agent-panel-${agent}`}
                          className="agent-prompts"
                          role="region"
                          aria-label={`${agent} prompts`}
                        >
                          <table className="table compact">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Labels</th>
                                <th>Tags</th>
                                <th
                                  style={{ width: 96, textAlign: "center" }}
                                >
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((p) => (
                                <tr
                                  key={p.name}
                                  className="row-link"
                                  onClick={() => handleSelectPrompt(p.name)}
                                >
                                  <td>
                                    <span className="name-pill">{p.name}</span>
                                  </td>
                                  <td>
                                    <span className="type-badge">
                                      {p.type}
                                    </span>
                                  </td>
                                  <td>{(p.labels || []).join(", ")}</td>
                                  <td className="tags-cell">
                                    {(p.tags || []).map((t) => (
                                      <span key={t} className="tag">
                                        {t}
                                      </span>
                                    ))}
                                  </td>
                                  <td
                                    className="actions-cell"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      className="icon-btn"
                                      title="Duplicate"
                                      onClick={async () => {
                                        await handleSelectPrompt(p.name);
                                        setTimeout(duplicatePrompt, 200);
                                      }}
                                    >
                                      ⧉
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}

        {(mode === "create" || (mode === "detail" && currentVersion)) && (
          <>
            {mode === "detail" && selectedMeta && currentVersion && (
              <div className="detail-grid">
                {/* Versions list */}
                <section className="panel">
                  <div className="panel-head">Versions</div>
                  <ul className="version-list">
                    {selectedMeta.versions
                      ?.slice()
                      .sort((a, b) => b - a)
                      .map((v) => {
                        const isProd =
                          productionVersion &&
                          productionVersion.version === v;
                        const isLatest =
                          latestVersion && latestVersion.version === v;
                        const isCurrent = currentVersion.version === v;
                        return (
                          <li key={v}>
                            <button
                              className={`version-item ${
                                isCurrent ? "active" : ""
                              }`}
                              onClick={() => {
                                setLoading(true);
                                setError("");
                                fetchPromptVersion(selectedMeta.name, {
                                  version: v,
                                })
                                  .then((ver) => setCurrentVersion(ver))
                                  .catch((err) =>
                                    setError(
                                      err?.message ||
                                        "Failed to fetch version"
                                    )
                                  )
                                  .finally(() => setLoading(false));
                              }}
                            >
                              <span># {v}</span>
                              <span className="spacer" />
                              {isProd && (
                                <span className="chip green">production</span>
                              )}
                              {isLatest && (
                                <span className="chip cyan">latest</span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                  <div className="stack">
                    <button className="btn warn" onClick={setAsProduction}>
                      Set as production
                    </button>
                    <button className="btn" onClick={duplicatePrompt}>
                      Duplicate
                    </button>
                  </div>
                </section>

                {/* Version detail */}
                <section className="panel">
                  <div className="panel-head">
                    <div className="title">
                      {currentVersion.name}{" "}
                      <span className="muted">
                        # {currentVersion.version}
                      </span>
                    </div>
                    <div className="inline">
                      <span className="type-badge">
                        {currentVersion.type}
                      </span>
                      {(currentVersion.labels || []).map((lbl) => (
                        <span
                          key={lbl}
                          className={`chip ${
                            lbl === "production"
                              ? "green"
                              : lbl === "latest"
                              ? "cyan"
                              : ""
                          }`}
                        >
                          {lbl}
                        </span>
                      ))}
                    </div>
                  </div>

                  {currentVersion.type === "chat" ? (
                    <div className="chat">
                      {Array.isArray(currentVersion.prompt) &&
                        currentVersion.prompt.map((m, i) => {
                          if (m?.type === "placeholder") {
                            return (
                              <div key={i} className="chat-row">
                                <div className="role">PLACEHOLDER</div>
                                <div className="bubble">[{m.name}]</div>
                              </div>
                            );
                          }
                          return (
                            <div key={i} className="chat-row">
                              <div className="role">
                                {String(m.role).toUpperCase()}
                              </div>
                              <div className="bubble">
                                {typeof m.content === "string"
                                  ? m.content
                                  : JSON.stringify(m.content, null, 2)}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <pre className="code">{currentVersion.prompt}</pre>
                  )}

                  {currentVersion.config && (
                    <details className="details">
                      <summary>Config</summary>
                      <pre className="code">
                        {JSON.stringify(currentVersion.config, null, 2)}
                      </pre>
                    </details>
                  )}
                  {currentVersion.tags &&
                    currentVersion.tags.length > 0 && (
                      <div className="kv">
                        <span className="k">Tags</span>
                        <span className="v">
                          {currentVersion.tags.join(", ")}
                        </span>
                      </div>
                    )}
                </section>
              </div>
            )}

            {/* Create/Edit form */}
            <section className="panel">
              <div className="panel-head">
                {mode === "create" ? "Create Prompt" : "Edit Prompt"}
              </div>

              {/* Tab switcher */}
              <div className="tabbar">
                <button
                  className={`tab ${formType === "text" ? "active" : ""}`}
                  onClick={() => setFormType("text")}
                >
                  Text
                </button>
                <button
                  className={`tab ${formType === "chat" ? "active" : ""}`}
                  onClick={() => setFormType("chat")}
                >
                  Chat
                </button>
              </div>

              <form className="form" onSubmit={handleSubmit}>
                <label className="fld">
                  <span className="lbl">Prompt Name</span>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    disabled={Boolean(currentVersion)}
                    title={
                      currentVersion
                        ? "Name is locked when editing. Use Duplicate to create a new prompt."
                        : ""
                    }
                  />
                  {currentVersion && (
                    <span className="hint">
                      Name locked — click Duplicate to create another.
                    </span>
                  )}
                </label>

                <label className="fld">
                  <span className="lbl">Agent</span>
                  <input
                    type="text"
                    value={formAgent}
                    onChange={(e) => setFormAgent(e.target.value)}
                    placeholder="e.g., SupportBot"
                  />
                </label>

                {formType === "text" && (
                  <label className="fld">
                    <span className="lbl">Prompt (Text Mode)</span>
                    <textarea
                      value={formPromptText}
                      onChange={(e) => setFormPromptText(e.target.value)}
                      rows={6}
                      placeholder="Enter prompt text; use {{variable}} placeholders as needed"
                    />
                  </label>
                )}

                {formType === "chat" && (
                  <>
                    <div className="chat-editor">
                      {chatRows.map((row) => (
                        <div key={row.id} className="chat-editor-row">
                          <select
                            value={row.role}
                            onChange={(e) =>
                              handleChatRowChange(
                                row.id,
                                "role",
                                e.target.value
                              )
                            }
                          >
                            <option value="system">System</option>
                            <option value="user">User</option>
                            <option value="placeholder">Placeholder</option>
                          </select>
                          <textarea
                            value={row.content}
                            onChange={(e) =>
                              handleChatRowChange(
                                row.id,
                                "content",
                                e.target.value
                              )
                            }
                            rows={2}
                            placeholder={
                              row.role === "placeholder"
                                ? "Placeholder name (e.g., chat_history)"
                                : "Enter message content"
                            }
                          />
                          <button
                            type="button"
                            className="btn icon small"
                            onClick={() => handleRemoveChatRow(row.id)}
                            title="Remove row"
                          >
                            ➖
                          </button>
                        </div>
                      ))}
                      <div className="chat-editor-actions">
                        <button
                          type="button"
                          className="btn small"
                          onClick={() => handleAddChatRow("system")}
                        >
                          + System
                        </button>
                        <button
                          type="button"
                          className="btn small"
                          onClick={() => handleAddChatRow("user")}
                        >
                          + User
                        </button>
                        <button
                          type="button"
                          className="btn small"
                          onClick={() => handleAddChatRow("placeholder")}
                        >
                          + Placeholder
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div className="grid2">
                  <label className="fld">
                    <span className="lbl">Labels (comma separated)</span>
                    <input
                      type="text"
                      value={formLabels}
                      onChange={(e) => setFormLabels(e.target.value)}
                      placeholder="e.g. production, staging"
                    />
                    <span className="hint">
                      “latest” is reserved and ignored.
                    </span>
                  </label>
                  <label className="fld">
                    <span className="lbl">Tags (comma separated)</span>
                    <input
                      type="text"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      placeholder="optional tags"
                    />
                  </label>
                </div>

                <label className="fld">
                  <span className="lbl">Config (JSON)</span>
                  <textarea
                    value={formConfig}
                    onChange={(e) => setFormConfig(e.target.value)}
                    rows={4}
                    placeholder='e.g. {"model":"gpt-4o","temperature":0.2}'
                  />
                </label>

                <label className="fld">
                  <span className="lbl">Commit Message</span>
                  <input
                    type="text"
                    value={formCommitMessage}
                    onChange={(e) => setFormCommitMessage(e.target.value)}
                    placeholder="Describe your changes (optional)"
                  />
                </label>

                <div className="actions">
                  <button
                    className="btn primary"
                    type="submit"
                    disabled={loading}
                  >
                    {currentVersion ? "Create New Version" : "Create Prompt"}
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={startNewPrompt}
                  >
                    New Prompt
                  </button>
                  {mode === "detail" && (
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={goLanding}
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {submitResult && (
                  <div className="result">
                    <strong>Submission Result</strong>
                    <pre className="code">
                      {JSON.stringify(submitResult, null, 2)}
                    </pre>
                  </div>
                )}
              </form>
            </section>
          </>
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
