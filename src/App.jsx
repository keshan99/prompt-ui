import React, { useEffect, useMemo, useState, useCallback } from "react";
import { LangfuseClient } from "@langfuse/client";

const RESERVED_LABELS = new Set(["latest"]);

export default function App() {
  const baseUrl =
    import.meta.env.VITE_LANGFUSE_BASE_URL?.replace(/\/$/, "") || "";
  const publicKey = import.meta.env.VITE_LANGFUSE_PUBLIC_KEY || "";
  const secretKey = import.meta.env.VITE_LANGFUSE_SECRET_KEY || "";

  const [mode, setMode] = useState("list");

  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedName, setSelectedName] = useState("");
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [productionVersion, setProductionVersion] = useState(null);
  const [latestVersion, setLatestVersion] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(null);

  const [query, setQuery] = useState("");

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("text"); // “text” or “chat”
  // For text mode:
  const [formPromptText, setFormPromptText] = useState("");
  // For chat mode:
  const [chatRows, setChatRows] = useState([
    { id: 1, role: "system", content: "" },
    { id: 2, role: "user", content: "" },
  ]);

  const [formLabels, setFormLabels] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formConfig, setFormConfig] = useState("");
  const [formCommitMessage, setFormCommitMessage] = useState("");
  const [submitResult, setSubmitResult] = useState(null);

  const [toast, setToast] = useState("");

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

  // … (fetchPrompts, fetchPromptVersion, etc same as before) …

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

  // const fetchPrompts = useCallback(async () => {
  //   if (!guardCreds()) return;
  //   setLoading(true);
  //   setError("");
  //   try {
  //     const res = await fetch(`${baseUrl}/api/public/v2/prompts`, {
  //       headers: { Authorization: authHeader },
  //     });
  //     const text = await res.text();
  //     if (!res.ok) throw new Error(`Error ${res.status}: ${text}`);
  //     const data = text ? JSON.parse(text) : {};
  //     const list = Array.isArray(data) ? data : data.data;
  //     list?.sort((a, b) => a.name.localeCompare(b.name));
  //     setPrompts(list || []);
  //   } catch (err) {
  //     setError(err?.message || "Failed to fetch prompts");
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [authHeader, baseUrl, guardCreds]);

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

    // Hydrate "latestVersionCreatedAt" since the list endpoint often doesn't include it
    const enriched = await Promise.all(
      list.map(async (p) => {
        try {
          const r = await fetch(
            `${baseUrl}/api/public/v2/prompts/${encodeURIComponent(p.name)}?label=latest`,
            { headers: { Authorization: authHeader } }
          );
          const t = await r.text();
          if (!r.ok) throw new Error(`Error ${r.status}: ${t}`);
          const latest = t ? JSON.parse(t) : null;

          return {
            ...p,
            // normalize a field your table can read
            latestVersionCreatedAt:
              latest?.createdAt || latest?.created_at || null,
            _latestVersion: latest?.version ?? null,
          };
        } catch {
          return { ...p, latestVersionCreatedAt: null, _latestVersion: null };
        }
      })
    );

    enriched.sort((a, b) => a.name.localeCompare(b.name));
    setPrompts(enriched);
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

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  // useEffect(() => {
  //   if (!currentVersion) return;
  //   setFormName(currentVersion.name || "");
  //   setFormType(currentVersion.type || "text");
  //   if (currentVersion.type === "chat") {
  //     // convert prompt (array) into chatRows
  //     const arr = Array.isArray(currentVersion.prompt) ? currentVersion.prompt : [];
  //     const rows = arr.map((m, idx) => ({
  //       id: idx + 1,
  //       role: m.role || "user",
  //       content: m.content || "",
  //     }));
  //     setChatRows(rows);
  //   } else {
  //     setFormPromptText(currentVersion.prompt || "");
  //   }
  //   const safeLabels = Array.isArray(currentVersion.labels)
  //     ? currentVersion.labels.filter((l) => !RESERVED_LABELS.has(l))
  //     : [];
  //   setFormLabels(safeLabels.join(", "));
  //   setFormTags(Array.isArray(currentVersion.tags) ? currentVersion.tags.join(", ") : "");
  //   if (currentVersion.config) {
  //     try {
  //       setFormConfig(JSON.stringify(currentVersion.config, null, 2));
  //     } catch {
  //       setFormConfig("");
  //     }
  //   } else {
  //     setFormConfig("");
  //   }
  //   setFormCommitMessage("");
  //   setSubmitResult(null);
  // }, [currentVersion]);

  // useEffect(() => {
  //   if (!currentVersion) return;

  //   setFormName(currentVersion.name || "");
  //   setFormType(currentVersion.type || "text");

  //   if (currentVersion.type === "chat") {
  //     const arr = Array.isArray(currentVersion.prompt)
  //       ? currentVersion.prompt
  //       : [];
  //     setChatRows(
  //       arr.map((m, i) => ({
  //         id: Date.now() + i,
  //         role: m.role || "user", // keep "placeholder" if present
  //         content:
  //           typeof m.content === "string"
  //             ? m.content
  //             : JSON.stringify(m.content ?? "", null, 2),
  //       }))
  //     );
  //   } else {
  //     setFormPromptText?.(currentVersion.prompt || ""); // if you have formPromptText; otherwise your text state
  //   }

  //   const safeLabels = Array.isArray(currentVersion.labels)
  //     ? currentVersion.labels.filter((l) => !RESERVED_LABELS.has(l))
  //     : [];
  //   setFormLabels(safeLabels.join(", "));
  //   setFormTags(
  //     Array.isArray(currentVersion.tags) ? currentVersion.tags.join(", ") : ""
  //   );

  //   if (currentVersion.config) {
  //     try {
  //       setFormConfig(JSON.stringify(currentVersion.config, null, 2));
  //     } catch {
  //       setFormConfig("");
  //     }
  //   } else {
  //     setFormConfig("");
  //   }

  //   setFormCommitMessage("");
  //   setSubmitResult(null);
  // }, [currentVersion]);

  useEffect(() => {
    if (!currentVersion) return;

    setFormName(currentVersion.name || "");
    setFormType(currentVersion.type || "text");

    if (currentVersion.type === "chat") {
      const arr = Array.isArray(currentVersion.prompt)
        ? currentVersion.prompt
        : [];
      setChatRows(
        arr.map((m, i) => {
          // New format (correct): { type: "placeholder", name: "..." }
          if (m?.type === "placeholder" && m?.name) {
            return {
              id: Date.now() + i,
              role: "placeholder",
              content: String(m.name),
            };
          }
          // Back-compat: old/wrong format { role:"placeholder", content:"{{name}}"/"name" }
          if (m?.role === "placeholder") {
            const raw = (typeof m.content === "string" ? m.content : "").trim();
            const name = raw.replace(/^\{\{|\}\}$/g, ""); // strip braces if present
            return { id: Date.now() + i, role: "placeholder", content: name };
          }
          // Normal chat message
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
    } else {
      setFormPromptText(currentVersion.prompt || "");
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
    setSubmitResult(null);
  }, [currentVersion]);

  // Wrap "name" into {{name}} if not already wrapped
  const toBraced = (raw) => {
    const s = String(raw || "").trim();
    if (!s) return "";
    if (/^\{\{.*\}\}$/.test(s)) return s;
    return `{{${s.replace(/^\{\{|\}\}$/g, "")}}}`;
  };

  // Validate {{variable}} where variable = [A-Za-z_][A-Za-z0-9_]*
  const isValidPlaceholder = (braced) =>
    /^\{\{[A-Za-z_][A-Za-z0-9_]*\}\}$/.test(String(braced || "").trim());

  const goLanding = useCallback(() => {
    setMode("list");
    setSelectedName("");
    setSelectedMeta(null);
    setCurrentVersion(null);
    setProductionVersion(null);
    setLatestVersion(null);
    setSubmitResult(null);
  }, []);

  // … handleSelectPrompt, startNewPrompt etc same as before …
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
    setFormType("text");
    setFormPromptText("");
    setFormLabels("");
    setFormTags("");
    setFormConfig("");
    setFormCommitMessage("");
    setSubmitResult(null);
  }, []);

  // const duplicatePrompt = useCallback(() => {
  //   if (!currentVersion) return;
  //   setMode("create");
  //   setSelectedName("");
  //   setSelectedMeta(null);
  //   setCurrentVersion(null);
  //   setProductionVersion(null);
  //   setLatestVersion(null);
  //   setFormName(`${currentVersion.name}-copy`);
  //   setFormType(currentVersion.type || "text");
  //   if (currentVersion.type === "chat") {
  //     try {
  //       setFormPrompt(JSON.stringify(currentVersion.prompt, null, 2));
  //     } catch {
  //       setFormPrompt("");
  //     }
  //   } else {
  //     setFormPrompt(currentVersion.prompt || "");
  //   }
  //   const safeLabels = Array.isArray(currentVersion.labels)
  //     ? currentVersion.labels.filter((l) => !RESERVED_LABELS.has(l))
  //     : [];
  //   setFormLabels(safeLabels.join(", "));
  //   setFormTags(
  //     Array.isArray(currentVersion.tags) ? currentVersion.tags.join(", ") : ""
  //   );
  //   if (currentVersion.config) {
  //     try {
  //       setFormConfig(JSON.stringify(currentVersion.config, null, 2));
  //     } catch {
  //       setFormConfig("");
  //     }
  //   } else {
  //     setFormConfig("");
  //   }
  //   setFormCommitMessage("");
  //   showToast("Duplicated into form. Change the name and submit.");
  // }, [currentVersion, showToast]);
  const duplicatePrompt = useCallback(() => {
    if (!currentVersion) return;
    setMode("create");
    setSelectedName("");
    setSelectedMeta(null);
    setCurrentVersion(null);
    setProductionVersion(null);
    setLatestVersion(null);

    setFormName(`${currentVersion.name}-copy`);
    setFormType(currentVersion.type || "text");

    if (currentVersion.type === "chat") {
      const arr = Array.isArray(currentVersion.prompt)
        ? currentVersion.prompt
        : [];
      setChatRows(
        arr.map((m, i) => ({
          id: Date.now() + i,
          role: m.role || "user", // keeps "placeholder"
          content: typeof m.content === "string" ? m.content : "",
        }))
      );
    } else {
      setFormPromptText?.(currentVersion.prompt || ""); // or setFormPrompt if that's your text state
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

  const setAsProduction = useCallback(async () => {
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
  }, [
    currentVersion,
    fetchPrompts,
    handleSelectPrompt,
    langfuse,
    productionVersion,
    selectedMeta,
    showToast,
  ]);

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

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");
      setSubmitResult(null);

      // let promptBody;
      // if (formType === "chat") {
      //   const built = [];

      //   for (const r of chatRows) {
      //     if (r.role === "placeholder") {
      //       const braced = toBraced(r.content);
      //       if (!isValidPlaceholder(braced)) {
      //         setError(
      //           "Invalid placeholder. Use letters/numbers/underscore, starting with a letter or underscore, e.g. {{msg_history}}"
      //         );
      //         return;
      //       }
      //       built.push({ role: "placeholder", content: braced });
      //     } else {
      //       built.push({ role: r.role, content: r.content ?? "" });
      //     }
      //   }

      //   promptBody = built;
      // } else {
      //   promptBody = formPromptText; // or your text-mode state
      // }

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
            built.push({ type: "placeholder", name }); // <-- correct shape for Langfuse
          } else {
            built.push({ role: r.role, content: r.content ?? "" });
          }
        }
        promptBody = built;
      } else {
        // TEXT mode keeps {{variables}} in the string
        promptBody = formPromptText;
      }

      let labels = [];
      if (formLabels.trim()) {
        labels = formLabels
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .filter((l) => !RESERVED_LABELS.has(l));
      }
      let tags = [];
      if (formTags.trim()) {
        tags = formTags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      let configObj = undefined;
      if (formConfig.trim()) {
        try {
          configObj = JSON.parse(formConfig);
        } catch (err) {
          setError("Invalid config JSON: " + err.message);
          return;
        }
      }

      // const payload = {
      //   type: formType,
      //   name: formName,
      //   prompt: promptBody,
      //   ...(labels.length ? { labels } : {}),
      //   ...(tags.length ? { tags } : {}),
      //   ...(configObj ? { config: configObj } : {}),
      //   ...(formCommitMessage.trim()
      //     ? { commitMessage: formCommitMessage.trim() }
      //     : {}),
      // };

      const payload = {
        type: formType,
        name: formName,
        prompt: promptBody,
        ...(labels.length ? { labels } : {}),
        ...(tags.length ? { tags } : {}),
        ...(configObj ? { config: configObj } : {}),
        ...(formCommitMessage.trim()
          ? { commitMessage: formCommitMessage.trim() }
          : {}),
      };

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
        // open detail view
        // (reuse existing handleSelectPrompt)
        // small delay to ensure list is updated
        setTimeout(() => {
          // the name might be new, so open
          // but we can call handleSelectPrompt(formName)
          // (assuming handleSelectPrompt defined)
        }, 300);

        setMode("detail");
        showToast(
          formType === "chat"
            ? "Prompt created/updated."
            : "Prompt created/updated."
        );
      } catch (err) {
        setError(err?.message || "Failed to submit prompt");
      } finally {
        setLoading(false);
      }
    },
    [
      baseUrl,
      authHeader,
      chatRows,
      formCommitMessage,
      formConfig,
      formLabels,
      formName,
      formPromptText,
      formTags,
      formType,
      fetchPrompts,
      showToast,
    ]
  );

  // derived
  const filteredPrompts = useMemo(() => {
    if (!query.trim()) return prompts;
    const q = query.toLowerCase();
    return prompts.filter((p) => {
      const labels = Array.isArray(p.labels) ? p.labels.join(" ") : "";
      const tags = Array.isArray(p.tags) ? p.tags.join(" ") : "";
      return (
        p.name.toLowerCase().includes(q) ||
        (p.type || "").toLowerCase().includes(q) ||
        labels.toLowerCase().includes(q) ||
        tags.toLowerCase().includes(q)
      );
    });
  }, [prompts, query]);

  return (
    <div className="light-root">
      {/* Header */}
      <header className="lf-topbar">
        <h1>
          {mode === "list"
            ? "Prompts"
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
              <button className="btn primary" onClick={() => startNewPrompt()}>
                + New prompt
              </button>
            </>
          )}
          {mode !== "list" && (
            <button className="btn ghost" onClick={goLanding}>
              ← Back to Prompts
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
            {/* Search / Filters */}
            <div className="toolbar">
              <div className="search-wrap">
                <span className="search-ico">🔍</span>
                <input
                  placeholder="Search..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="dropdown">Names, Tags ▾</div>
              <div className="dropdown">Filters ▾</div>
            </div>

            {/* Table */}
            <div className="table-card">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Versions</th>
                    <th>Type</th>
                    <th>Latest Version Created At ▾</th>
                    <th>Tags</th>
                    <th style={{ width: "96px", textAlign: "center" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && prompts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="muted">
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!loading && filteredPrompts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="muted">
                        No prompts
                      </td>
                    </tr>
                  )}
                  {filteredPrompts.map((p) => (
                    <tr
                      key={p.name}
                      className="row-link"
                      onClick={() => handleSelectPrompt(p.name)}
                    >
                      <td>
                        <span className="name-pill">{p.name}</span>
                      </td>
                      <td>
                        {Array.isArray(p.versions)
                          ? p.versions.length
                          : p.versions || 0}
                      </td>
                      <td>
                        <span className="type-badge">{p.type}</span>
                      </td>
                      <td>
  {p.latestVersionCreatedAt
    ? new Date(p.latestVersionCreatedAt).toLocaleString()
    : "—"}
</td>
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
                          onClick={() => {
                            handleSelectPrompt(p.name);
                            setTimeout(() => duplicatePrompt(), 300);
                          }}
                        >
                          ⧉
                        </button>
                        <button
                          className="icon-btn muted-ico"
                          title="Delete (disabled)"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {(mode === "create" || (mode === "detail" && currentVersion)) && (
          <>
            {mode === "detail" && selectedMeta && currentVersion && (
              <div className="detail-grid">
                <section className="panel">
                  <div className="panel-head">Versions</div>
                  <ul className="version-list">
                    {selectedMeta.versions
                      ?.slice()
                      .sort((a, b) => b - a)
                      .map((v) => {
                        const isProd =
                          productionVersion && productionVersion.version === v;
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
                                      err?.message || "Failed to fetch version"
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

                <section className="panel">
                  <div className="panel-head">
                    <div className="title">
                      {currentVersion.name}{" "}
                      <span className="muted"># {currentVersion.version}</span>
                    </div>
                    <div className="inline">
                      <span className="type-badge">{currentVersion.type}</span>
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
                      {/* {Array.isArray(currentVersion.prompt) && currentVersion.prompt.map((m, i) => (
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
                        ))} */}
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
                  {currentVersion.tags && currentVersion.tags.length > 0 && (
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

            {/* Form section */}
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
                      {chatRows.map((row, idx) => (
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
                                ? "Enter placeholder name e.g. {{msg_history}}"
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
                      “latest” is reserved and will be ignored.
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
