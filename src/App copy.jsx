// import React, { useEffect, useState, useMemo } from 'react';
// // Langfuse JS/TS SDK.  Install via `npm install @langfuse/client` to enable
// // programmatic label updates (e.g. moving the production label).
// import { LangfuseClient } from '@langfuse/client';

// /**
//  * Simple prompt management UI for Langfuse.
//  *
//  * This component interacts directly with the Langfuse public API to
//  * list prompts, fetch a prompt by name, and create or update prompts.
//  * Environment variables defined in `.env` (prefixed with VITE_) supply
//  * the API credentials and base URL.  Exposing secrets in the browser
//  * is not recommended for production use; this is intended for local
//  * experimentation.  See the README for details.
//  */
// function App() {
//   const baseUrl = import.meta.env.VITE_LANGFUSE_BASE_URL?.replace(/\/$/, '') || '';
//   const publicKey = import.meta.env.VITE_LANGFUSE_PUBLIC_KEY || '';
//   const secretKey = import.meta.env.VITE_LANGFUSE_SECRET_KEY || '';

//   const [prompts, setPrompts] = useState([]);
//   const [selectedName, setSelectedName] = useState('');
//   // Meta information for the selected prompt (contains versions array)
//   const [selectedMeta, setSelectedMeta] = useState(null);
//   // Prompt version details for production and latest labels
//   const [productionVersion, setProductionVersion] = useState(null);
//   const [latestVersion, setLatestVersion] = useState(null);
//   // Currently viewed version details
//   const [currentVersion, setCurrentVersion] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   // Form state for creating/updating prompts
//   const [formName, setFormName] = useState('');
//   const [formType, setFormType] = useState('text');
//   const [formPrompt, setFormPrompt] = useState('');
//   const [formLabels, setFormLabels] = useState('');
//   const [formTags, setFormTags] = useState('');
//   const [formConfig, setFormConfig] = useState('');
//   const [formCommitMessage, setFormCommitMessage] = useState('');
//   const [submitResult, setSubmitResult] = useState(null);

//   // Toast state for transient notifications
//   const [toast, setToast] = useState('');

//   // When the currently viewed version changes, prefill the form fields
//   useEffect(() => {
//     if (currentVersion) {
//       setFormName(currentVersion.name || '');
//       setFormType(currentVersion.type || 'text');
//       if (currentVersion.type === 'chat') {
//         try {
//           setFormPrompt(JSON.stringify(currentVersion.prompt, null, 2));
//         } catch {
//           setFormPrompt('');
//         }
//       } else {
//         setFormPrompt(currentVersion.prompt || '');
//       }
//       setFormLabels(Array.isArray(currentVersion.labels) ? currentVersion.labels.join(', ') : '');
//       setFormTags(Array.isArray(currentVersion.tags) ? currentVersion.tags.join(', ') : '');
//       if (currentVersion.config) {
//         try {
//           setFormConfig(JSON.stringify(currentVersion.config, null, 2));
//         } catch {
//           setFormConfig('');
//         }
//       } else {
//         setFormConfig('');
//       }
//       setFormCommitMessage('');
//     }
//   }, [currentVersion]);

//   // Construct basic auth header from env vars
//   const authHeader = 'Basic ' + btoa(`${publicKey}:${secretKey}`);

//   // Instantiate the Langfuse SDK client.  We memoize the instance to avoid
//   // recreating it on every render.  If the SDK is not installed or the
//   // credentials are missing, langfuse will be null and SDK-specific features
//   // (such as moving production labels) will be disabled.
//   const langfuse = useMemo(() => {
//     try {
//       if (!publicKey || !secretKey || !baseUrl) return null;
//       return new LangfuseClient({ publicKey, secretKey, baseUrl });
//     } catch (err) {
//       console.warn('Could not initialise Langfuse client', err);
//       return null;
//     }
//   }, [publicKey, secretKey, baseUrl]);

//   // Fetch list of prompts on mount
//   useEffect(() => {
//     if (!publicKey || !secretKey || !baseUrl) {
//       setError('Please configure LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY and LANGFUSE_BASE_URL in the .env file.');
//       return;
//     }
//     fetchPrompts();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   function fetchPrompts() {
//     setLoading(true);
//     setError('');
//     fetch(`${baseUrl}/api/public/v2/prompts`, {
//       headers: {
//         Authorization: authHeader,
//       },
//     })
//       .then(async (res) => {
//         if (!res.ok) {
//           const text = await res.text();
//           throw new Error(`Error ${res.status}: ${text}`);
//         }
//         return res.json();
//       })
//       .then((data) => {
//         // API returns either { data: [...] } or a plain array
//         const list = Array.isArray(data) ? data : data.data;
//         setPrompts(list);
//       })
//       .catch((err) => {
//         setError(err.message || 'Failed to fetch prompts');
//       })
//       .finally(() => setLoading(false));
//   }

//   // Move the production label to the currently selected version using the
//   // Langfuse JS SDK.  This operation is only available via the SDK and not
//   // through the public API.  If `langfuse` is null, a warning is displayed.
//   async function setAsProduction() {
//     if (!langfuse) {
//       alert('Langfuse SDK is not available. Please install @langfuse/client and ensure credentials are set.');
//       return;
//     }
//     if (!selectedMeta || !currentVersion) {
//       alert('Please select a prompt version first.');
//       return;
//     }
//     const name = selectedMeta.name;
//     const targetVersion = currentVersion.version;
//     if (!targetVersion) {
//       alert('Current version is undefined.');
//       return;
//     }
//     if (!window.confirm(`Set version #${targetVersion} of ${name} as production?`)) return;
//     setLoading(true);
//     setError('');
//     try {
//       // Remove production label from the previous production version if it differs.
//       // Filter out both 'production' and 'latest' when updating labels, since
//       // 'latest' is automatically assigned and cannot be set manually via the SDK.
//       if (productionVersion && productionVersion.version && productionVersion.version !== targetVersion) {
//         const prevLabels = (productionVersion.labels || []).filter((l) => l !== 'production' && l !== 'latest');
//         await langfuse.prompt.update({ name, version: productionVersion.version, newLabels: prevLabels });
//       }
//       // Build new labels for the target version: remove reserved labels ('production', 'latest') from existing labels,
//       // then add 'production'.
//       const cleaned = (currentVersion.labels || []).filter((l) => l !== 'production' && l !== 'latest');
//       const newLabels = Array.from(new Set([...cleaned, 'production']));
//       await langfuse.prompt.update({ name, version: targetVersion, newLabels });
//       showToast('Production label updated');
//       // Refresh list and reload prompt details
//       // Note: fetchPrompts() is not async; we call it and then re-select the prompt
//       await fetchPrompts();
//       // Use handleSelectPrompt to re-open this prompt in the UI
//       handleSelectPrompt(name);
//     } catch (err) {
//       const message = err?.message || 'Failed to update production label';
//       setError(message);
//       alert(message);
//     } finally {
//       setLoading(false);
//     }
//   }

//   // Duplicate the currently selected prompt version into a new prompt.  This
//   // copies the prompt content, type, labels, tags and config into the form
//   // and clears the selection so the user can create a new prompt with a
//   // different name.  The name is initialised to the original name with
//   // "-copy" appended.
//   function duplicatePrompt() {
//     if (!currentVersion) return;
//     // Clear selection so the form behaves as a new prompt
//     setSelectedName('');
//     setSelectedMeta(null);
//     setCurrentVersion(null);
//     setProductionVersion(null);
//     setLatestVersion(null);
//     // Prefill form with values from the current version
//     setFormName(`${currentVersion.name}-copy`);
//     setFormType(currentVersion.type || 'text');
//     if (currentVersion.type === 'chat') {
//       try {
//         setFormPrompt(JSON.stringify(currentVersion.prompt, null, 2));
//       } catch {
//         setFormPrompt('');
//       }
//     } else {
//       setFormPrompt(currentVersion.prompt || '');
//     }
//     setFormLabels(Array.isArray(currentVersion.labels) ? currentVersion.labels.join(', ') : '');
//     setFormTags(Array.isArray(currentVersion.tags) ? currentVersion.tags.join(', ') : '');
//     if (currentVersion.config) {
//       try {
//         setFormConfig(JSON.stringify(currentVersion.config, null, 2));
//       } catch {
//         setFormConfig('');
//       }
//     } else {
//       setFormConfig('');
//     }
//     setFormCommitMessage('');
//     showToast('Duplicating prompt. Change the name and submit to create a new prompt.');
//   }

//   // Helper to display a short-lived toast message
//   function showToast(msg) {
//     setToast(msg);
//     setTimeout(() => setToast(''), 2500);
//   }

//   function fetchPromptVersion(name, { version = null, label = null } = {}) {
//     // Build query string based on version or label
//     let query = '';
//     if (version !== null) {
//       query = `?version=${encodeURIComponent(version)}`;
//     } else if (label !== null) {
//       query = `?label=${encodeURIComponent(label)}`;
//     }
//     return fetch(`${baseUrl}/api/public/v2/prompts/${encodeURIComponent(name)}${query}`, {
//       headers: {
//         Authorization: authHeader,
//       },
//     }).then(async (res) => {
//       const text = await res.text();
//       if (!res.ok) {
//         throw new Error(`Error ${res.status}: ${text}`);
//       }
//       return text ? JSON.parse(text) : {};
//     });
//   }

//   function handleSelectPrompt(name) {
//     setSelectedName(name);
//     // find the meta info for this prompt
//     const meta = prompts.find((p) => p.name === name) || null;
//     setSelectedMeta(meta);
//     // Reset versions
//     setCurrentVersion(null);
//     setProductionVersion(null);
//     setLatestVersion(null);
//     setLoading(true);
//     setError('');
//     // Fetch production and latest versions in parallel
//     Promise.all([
//       fetchPromptVersion(name, { label: 'production' }).catch(() => null),
//       fetchPromptVersion(name, { label: 'latest' }).catch(() => null),
//     ])
//       .then(([prod, latest]) => {
//         setProductionVersion(prod);
//         setLatestVersion(latest);
//         // Default view: production if available, else latest
//         setCurrentVersion(prod || latest);
//       })
//       .catch((err) => {
//         setError(err.message || 'Failed to fetch prompt versions');
//       })
//       .finally(() => setLoading(false));
//   }

//   function handleSubmit(e) {
//     e.preventDefault();
//     setSubmitResult(null);
//     setError('');
//     let promptBody;
//     if (formType === 'chat') {
//       try {
//         // Allow the user to input either a JSON array or pretty printed JSON
//         promptBody = JSON.parse(formPrompt);
//         if (!Array.isArray(promptBody)) {
//           throw new Error('Chat prompt must be a JSON array of messages');
//         }
//       } catch (err) {
//         setError('Invalid chat prompt JSON: ' + err.message);
//         return;
//       }
//     } else {
//       promptBody = formPrompt;
//     }
//     // Prepare payload
//     const payload = {
//       type: formType,
//       name: formName,
//       prompt: promptBody,
//     };
//     if (formLabels.trim()) {
//       payload.labels = formLabels.split(',').map((s) => s.trim());
//     }
//     if (formTags.trim()) {
//       payload.tags = formTags.split(',').map((s) => s.trim());
//     }
//     if (formConfig.trim()) {
//       try {
//         payload.config = JSON.parse(formConfig);
//       } catch (err) {
//         setError('Invalid config JSON: ' + err.message);
//         return;
//       }
//     }
//     if (formCommitMessage.trim()) {
//       payload.commitMessage = formCommitMessage;
//     }
//     setLoading(true);
//     fetch(`${baseUrl}/api/public/v2/prompts`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: authHeader,
//       },
//       body: JSON.stringify(payload),
//     })
//       .then(async (res) => {
//         const text = await res.text();
//         if (!res.ok) {
//           throw new Error(`Error ${res.status}: ${text}`);
//         }
//         return text ? JSON.parse(text) : {};
//       })
//       .then((data) => {
//         setSubmitResult(data);
//         // Refresh the list of prompts
//         fetchPrompts();
//         // If we were editing an existing prompt (creating a new version)
//         // open the prompt again and show the newly created version.  Otherwise
//         // select the newly created prompt.  In both cases we set the
//         // current version to the response from the API to ensure the
//         // details view shows the new version rather than the old
//         if (currentVersion) {
//           showToast('New version created');
//         } else {
//           showToast('Prompt created');
//         }
//         // Open the prompt name and override currentVersion to the new version
//         handleSelectPrompt(formName);
//         setCurrentVersion(data);
//       })
//       .catch((err) => {
//         setError(err.message || 'Failed to submit prompt');
//       })
//       .finally(() => setLoading(false));
//   }
//   return (
//     <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
//       {/* Sidebar listing prompts */}
//       <aside style={{ width: '250px', borderRight: '1px solid #ddd', padding: '1rem', overflowY: 'auto' }}>
//         <h2 style={{ marginTop: 0 }}>Prompts</h2>
//         <button onClick={fetchPrompts} disabled={loading} style={{ marginBottom: '0.5rem' }}>
//           Refresh
//         </button>
//         <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
//           {prompts.map((p) => (
//             <li key={p.name} style={{ marginBottom: '0.25rem' }}>
//               <button
//                 onClick={() => handleSelectPrompt(p.name)}
//                 style={{
//                   background: selectedName === p.name ? '#f0f0f0' : 'transparent',
//                   border: 'none',
//                   width: '100%',
//                   textAlign: 'left',
//                   padding: '0.25rem',
//                   cursor: 'pointer',
//                 }}
//               >
//                 <strong>{p.name}</strong>
//                 <div style={{ fontSize: '0.8rem', color: '#666' }}>
//                   {p.type} | labels: {(p.labels || []).join(', ')}
//                 </div>
//               </button>
//             </li>
//           ))}
//         </ul>
//       </aside>
//       {/* Main content area */}
//       <main style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
//         <h1>Langfuse Prompt Management</h1>
//         {error && (
//           <div style={{ color: 'red', marginBottom: '1rem' }}>
//             <strong>Error:</strong> {error}
//           </div>
//         )}
//         {loading && <p>Loading…</p>}

//         {/* Selected prompt details and versions */}
//         {selectedMeta && currentVersion && (
//           <section style={{ marginBottom: '2rem' }}>
//             {/* Version list on the left */}
//             <div style={{ display: 'flex' }}>
//               <div style={{ width: '200px', marginRight: '1rem' }}>
//                 <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Versions</h3>
//                 <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
//                   {selectedMeta.versions && selectedMeta.versions.slice().sort((a, b) => b - a).map((v) => {
//                     // Determine if this version has special labels
//                     const isProd = productionVersion && productionVersion.version === v;
//                     const isLatest = latestVersion && latestVersion.version === v;
//                     const isCurrent = currentVersion.version === v;
//                     return (
//                       <li key={v} style={{ marginBottom: '0.5rem' }}>
//                         <button
//                           onClick={() => {
//                             // Fetch specific version when clicked
//                             setLoading(true);
//                             setError('');
//                             fetchPromptVersion(selectedMeta.name, { version: v })
//                               .then((ver) => {
//                                 setCurrentVersion(ver);
//                               })
//                               .catch((err) => {
//                                 setError(err.message || 'Failed to fetch version');
//                               })
//                               .finally(() => setLoading(false));
//                           }}
//                           style={{
//                             background: isCurrent ? '#f0f8ff' : '#f8f9fa',
//                             border: '1px solid #ddd',
//                             borderRadius: '4px',
//                             width: '100%',
//                             padding: '0.25rem',
//                             textAlign: 'left',
//                             cursor: 'pointer',
//                           }}
//                         >
//                           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
//                             <span style={{ fontWeight: isCurrent ? 'bold' : 'normal' }}># {v}</span>
//                             <span>
//                               {isProd && (
//                                 <span style={{ background: '#28a745', color: '#fff', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.75rem', marginRight: '0.2rem' }}>
//                                   production
//                                 </span>
//                               )}
//                               {isLatest && (
//                                 <span style={{ background: '#17a2b8', color: '#fff', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.75rem' }}>
//                                   latest
//                                 </span>
//                               )}
//                             </span>
//                           </div>
//                         </button>
//                       </li>
//                     );
//                   })}
//                 </ul>
//                 {/* Version-related actions */}
//                 <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
//                   <button
//                     onClick={setAsProduction}
//                     style={{
//                       background: '#fffbeb',
//                       color: '#92400e',
//                       border: '1px solid #fcd34d',
//                       borderRadius: '4px',
//                       padding: '6px',
//                       cursor: 'pointer',
//                       fontSize: '0.9rem',
//                     }}
//                   >
//                     Set as production
//                   </button>
//                   <button
//                     onClick={duplicatePrompt}
//                     style={{
//                       background: '#eef2ff',
//                       color: '#3730a3',
//                       border: '1px solid #d1d5db',
//                       borderRadius: '4px',
//                       padding: '6px',
//                       cursor: 'pointer',
//                       fontSize: '0.9rem',
//                     }}
//                   >
//                     Duplicate
//                   </button>
//                 </div>
//               </div>
//               {/* Display current version content */}
//               <div style={{ flex: 1 }}>
//                 <h2>
//                   {currentVersion.name}{' '}
//                   <span style={{ fontSize: '0.9rem', color: '#666' }}># {currentVersion.version}</span>
//                 </h2>
//                 <div style={{ marginBottom: '0.5rem' }}>
//                   <span style={{ background: '#eee', padding: '0.25rem 0.5rem', borderRadius: '4px', marginRight: '0.5rem' }}>
//                     {currentVersion.type}
//                   </span>
//                   {Array.isArray(currentVersion.labels) && currentVersion.labels.map((lbl) => (
//                     <span
//                       key={lbl}
//                       style={{ background: lbl === 'production' ? '#28a745' : lbl === 'latest' ? '#17a2b8' : '#6c757d', color: '#fff', padding: '0.25rem 0.5rem', borderRadius: '4px', marginRight: '0.25rem', fontSize: '0.8rem' }}
//                     >
//                       {lbl}
//                     </span>
//                   ))}
//                 </div>
//                 {/* Display prompt content parsed */}
//                 {currentVersion.type === 'chat' ? (
//                   <div>
//                     {Array.isArray(currentVersion.prompt) && currentVersion.prompt.map((msg, idx) => (
//                       <div key={idx} style={{ marginBottom: '0.5rem' }}>
//                         <h4 style={{ margin: 0, textTransform: 'capitalize' }}>{msg.role}</h4>
//                         <div style={{ whiteSpace: 'pre-wrap', background: '#f9f9f9', border: '1px solid #eee', padding: '0.5rem', borderRadius: '4px' }}>{msg.content}</div>
//                       </div>
//                     ))}
//                   </div>
//                 ) : (
//                   <div style={{ whiteSpace: 'pre-wrap', background: '#f9f9f9', border: '1px solid #eee', padding: '0.5rem', borderRadius: '4px' }}>{currentVersion.prompt}</div>
//                 )}
//                 {/* Display config if present */}
//                 {currentVersion.config && (
//                   <details style={{ marginTop: '1rem' }}>
//                     <summary><strong>Config</strong></summary>
//                     <pre style={{ overflowX: 'auto' }}>{JSON.stringify(currentVersion.config, null, 2)}</pre>
//                   </details>
//                 )}
//                 {/* Display tags if present */}
//                 {currentVersion.tags && currentVersion.tags.length > 0 && (
//                   <div style={{ marginTop: '0.5rem' }}>
//                     <strong>Tags:</strong> {currentVersion.tags.join(', ')}
//                   </div>
//                 )}
//               </div>
//             </div>
//           </section>
//         )}

//         {/* Create/Update form */}
//         <section>
//           <h2>{currentVersion ? 'Edit Prompt' : 'Create Prompt'}</h2>
//           <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', maxWidth: '800px' }}>
//             <label>
//               Prompt Name:
//               <input
//                 type="text"
//                 value={formName}
//                 onChange={(e) => setFormName(e.target.value)}
//                 required
//                 style={{ width: '100%', marginTop: '0.25rem' }}
//                 disabled={Boolean(currentVersion)}
//                 title={currentVersion ? 'Name is locked when editing an existing prompt. Use Duplicate to create a new prompt with a different name.' : ''}
//               />
//             </label>
//             <label style={{ marginTop: '0.5rem' }}>
//               Prompt Type:
//               <select
//                 value={formType}
//                 onChange={(e) => setFormType(e.target.value)}
//                 style={{ width: '100%', marginTop: '0.25rem' }}
//               >
//                 <option value="text">text</option>
//                 <option value="chat">chat</option>
//               </select>
//             </label>
//             <label style={{ marginTop: '0.5rem' }}>
//               Prompt Content:
//               <textarea
//                 value={formPrompt}
//                 onChange={(e) => setFormPrompt(e.target.value)}
//                 rows={6}
//                 required
//                 placeholder={formType === 'text' ? 'Enter prompt string with {{placeholders}}' : 'Enter JSON array of chat messages'}
//                 style={{ width: '100%', marginTop: '0.25rem', fontFamily: 'monospace' }}
//               />
//             </label>
//             <label style={{ marginTop: '0.5rem' }}>
//               Labels (comma‑separated):
//               <input
//                 type="text"
//                 value={formLabels}
//                 onChange={(e) => setFormLabels(e.target.value)}
//                 placeholder="e.g. production, staging"
//                 style={{ width: '100%', marginTop: '0.25rem' }}
//               />
//             </label>
//             <label style={{ marginTop: '0.5rem' }}>
//               Tags (comma‑separated):
//               <input
//                 type="text"
//                 value={formTags}
//                 onChange={(e) => setFormTags(e.target.value)}
//                 placeholder="optional tags"
//                 style={{ width: '100%', marginTop: '0.25rem' }}
//               />
//             </label>
//             <label style={{ marginTop: '0.5rem' }}>
//               Config (JSON):
//               <textarea
//                 value={formConfig}
//                 onChange={(e) => setFormConfig(e.target.value)}
//                 rows={3}
//                 placeholder='e.g. {"model": "gpt-4o", "temperature": 0.2}'
//                 style={{ width: '100%', marginTop: '0.25rem', fontFamily: 'monospace' }}
//               />
//             </label>
//             <label style={{ marginTop: '0.5rem' }}>
//               Commit Message:
//               <input
//                 type="text"
//                 value={formCommitMessage}
//                 onChange={(e) => setFormCommitMessage(e.target.value)}
//                 placeholder="Describe your changes (optional)"
//                 style={{ width: '100%', marginTop: '0.25rem' }}
//               />
//             </label>
//             <div style={{ marginTop: '1rem' }}>
//               <button
//                 type="submit"
//                 disabled={loading}
//                 style={{ padding: '0.5rem 1rem', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '0.5rem' }}
//               >
//                 {currentVersion ? 'Create New Version' : 'Create Prompt'}
//               </button>
//               <button
//                 type="button"
//                 onClick={() => {
//                   // Reset all selection and form fields for a brand new prompt
//                   setSelectedName('');
//                   setSelectedMeta(null);
//                   setCurrentVersion(null);
//                   setProductionVersion(null);
//                   setLatestVersion(null);
//                   setFormName('');
//                   setFormType('text');
//                   setFormPrompt('');
//                   setFormLabels('');
//                   setFormTags('');
//                   setFormConfig('');
//                   setFormCommitMessage('');
//                   setSubmitResult(null);
//                 }}
//                 style={{ padding: '0.5rem 1rem', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px' }}
//               >
//                 New Prompt
//               </button>
//             </div>
//           </form>
//           {submitResult && (
//             <div style={{ marginTop: '1rem', background: '#e6ffed', padding: '1rem', borderRadius: '4px' }}>
//               <strong>Submission Result:</strong>
//               <pre style={{ overflowX: 'auto', marginTop: '0.5rem' }}>{JSON.stringify(submitResult, null, 2)}</pre>
//             </div>
//           )}
//         </section>
//         {/* Toast notification */}
//         {toast && (
//           <div
//             style={{
//               position: 'fixed',
//               bottom: 16,
//               right: 16,
//               background: '#111827',
//               color: '#fff',
//               padding: '10px 14px',
//               borderRadius: 10,
//               zIndex: 1000,
//             }}
//           >
//             {toast}
//           </div>
//         )}
//       </main>
//     </div>
//   );
// }

// export default App;



import React, { useEffect, useMemo, useState, useCallback } from "react";
import { LangfuseClient } from "@langfuse/client";

const RESERVED_LABELS = new Set(["latest"]);

export default function App() {
  const baseUrl =
    import.meta.env.VITE_LANGFUSE_BASE_URL?.replace(/\/$/, "") || "";
  const publicKey = import.meta.env.VITE_LANGFUSE_PUBLIC_KEY || "";
  const secretKey = import.meta.env.VITE_LANGFUSE_SECRET_KEY || "";

  // view mode: 'list' (landing), 'detail' (selected prompt), 'create' (new)
  const [mode, setMode] = useState("list");

  // data
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // selection + versions
  const [selectedName, setSelectedName] = useState("");
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [productionVersion, setProductionVersion] = useState(null);
  const [latestVersion, setLatestVersion] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(null);

  // search/filter (UI only; server still returns full list)
  const [query, setQuery] = useState("");

  // form (create/edit)
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("text");
  const [formPrompt, setFormPrompt] = useState("");
  const [formLabels, setFormLabels] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formConfig, setFormConfig] = useState("");
  const [formCommitMessage, setFormCommitMessage] = useState("");
  const [submitResult, setSubmitResult] = useState(null);

  // toast
  const [toast, setToast] = useState("");

  // auth
  const authHeader = "Basic " + btoa(`${publicKey}:${secretKey}`);

  // SDK (only needed for moving prod label)
  const langfuse = useMemo(() => {
    try {
      if (!publicKey || !secretKey || !baseUrl) return null;
      return new LangfuseClient({ publicKey, secretKey, baseUrl });
    } catch (err) {
      console.warn("Could not initialise Langfuse client", err);
      return null;
    }
  }, [publicKey, secretKey, baseUrl]);

  // utils
  const showToast = useCallback((msg) => {
    setToast(msg);
    const id = setTimeout(() => setToast(""), 2200);
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

  const fetchPrompts = useCallback(() => {
    if (!guardCreds()) return Promise.resolve();
    setLoading(true);
    setError("");
    return fetch(`${baseUrl}/api/public/v2/prompts`, {
      headers: { Authorization: authHeader },
    })
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok) throw new Error(`Error ${res.status}: ${text}`);
        return text ? JSON.parse(text) : {};
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : data.data;
        list?.sort((a, b) => a.name.localeCompare(b.name));
        setPrompts(list || []);
      })
      .catch((err) => setError(err?.message || "Failed to fetch prompts"))
      .finally(() => setLoading(false));
  }, [authHeader, baseUrl, guardCreds]);

  const fetchPromptVersion = useCallback(
    (name, { version = null, label = null } = {}) => {
      let qs = "";
      if (version !== null) qs = `?version=${encodeURIComponent(version)}`;
      else if (label !== null) qs = `?label=${encodeURIComponent(label)}`;

      return fetch(
        `${baseUrl}/api/public/v2/prompts/${encodeURIComponent(name)}${qs}`,
        { headers: { Authorization: authHeader } }
      ).then(async (res) => {
        const text = await res.text();
        if (!res.ok) throw new Error(`Error ${res.status}: ${text}`);
        return text ? JSON.parse(text) : {};
      });
    },
    [authHeader, baseUrl]
  );

  // effects
  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  // hydrate form when switching currentVersion
  useEffect(() => {
    if (!currentVersion) return;
    setFormName(currentVersion.name || "");
    setFormType(currentVersion.type || "text");
    if (currentVersion.type === "chat") {
      try {
        setFormPrompt(JSON.stringify(currentVersion.prompt, null, 2));
      } catch {
        setFormPrompt("");
      }
    } else {
      setFormPrompt(currentVersion.prompt || "");
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

  // actions
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
    setFormType("text");
    setFormPrompt("");
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
    setFormType(currentVersion.type || "text");
    if (currentVersion.type === "chat") {
      try {
        setFormPrompt(JSON.stringify(currentVersion.prompt, null, 2));
      } catch {
        setFormPrompt("");
      }
    } else {
      setFormPrompt(currentVersion.prompt || "");
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
    if (!window.confirm(`Set version #${targetVersion} of “${name}” as production?`)) return;

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

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");
      setSubmitResult(null);

      let promptBody;
      if (formType === "chat") {
        try {
          promptBody = JSON.parse(formPrompt);
          if (!Array.isArray(promptBody)) {
            throw new Error("Chat prompt must be a JSON array of messages");
          }
        } catch (err) {
          setError("Invalid chat prompt JSON: " + err.message);
          return;
        }
      } else {
        promptBody = formPrompt;
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
        tags = formTags.split(",").map((s) => s.trim()).filter(Boolean);
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

        // Refresh + reopen detail
        await fetchPrompts();
        handleSelectPrompt(formName);
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
      currentVersion,
      fetchPrompts,
      formCommitMessage,
      formConfig,
      formLabels,
      formName,
      formPrompt,
      formTags,
      formType,
      handleSelectPrompt,
      showToast,
    ]
  );

  // derived
  const filteredPrompts = React.useMemo(() => {
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

  // UI — light theme
  return (
    <div className="light-root">
      <header className="lf-topbar">
        <div className="lf-topbar-left">
          <h1>Prompts</h1>
        </div>
        <div className="lf-topbar-right">
          <button className="btn" onClick={fetchPrompts} disabled={loading}>
            ↻ Refresh
          </button>
          <button className="btn primary" onClick={startNewPrompt}>
            + New prompt
          </button>
        </div>
      </header>

      {/* Landing / list */}
      {mode === "list" && (
        <main className="container">
          {error && (
            <div className="alert error">
              <strong>Error:</strong> {error}
            </div>
          )}
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

          <div className="table-card">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>Name</th>
                  <th>Versions</th>
                  <th>Type</th>
                  <th>Latest Version Created At ▾</th>
                  <th>Tags</th>
                  <th style={{ width: 96, textAlign: "center" }}>Actions</th>
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
                    <td>{Array.isArray(p.versions) ? p.versions.length : (p.versions || 0)}</td>
                    <td>
                      <span className="type-badge">{p.type}</span>
                    </td>
                    <td>{p.latestVersionCreatedAt || ""}</td>
                    <td className="tags-cell">
                      {(p.tags || []).map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                    </td>
                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="icon-btn"
                        title="Duplicate"
                        onClick={() => {
                          // open detail then duplicate (to reuse logic)
                          handleSelectPrompt(p.name);
                          // delay duplicate until versions fetched/rendered
                          setTimeout(() => {
                            if (latestVersion) duplicatePrompt();
                          }, 300);
                        }}
                      >
                        ⧉
                      </button>
                      {/* Trash icon reserved; implement delete later if desired */}
                      <button className="icon-btn muted-ico" title="Delete (disabled)">🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      )}

      {/* Detail */}
      {mode === "detail" && selectedMeta && currentVersion && (
        <main className="container">
          {error && (
            <div className="alert error">
              <strong>Error:</strong> {error}
            </div>
          )}

          <button className="btn ghost" onClick={goLanding} style={{ marginBottom: 8 }}>
            ← Back to Prompts
          </button>

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
                          className={`version-item ${isCurrent ? "active" : ""}`}
                          onClick={() => {
                            setLoading(true);
                            setError("");
                            fetchPromptVersion(selectedMeta.name, { version: v })
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
                          {isProd && <span className="chip green">production</span>}
                          {isLatest && <span className="chip cyan">latest</span>}
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
                  {currentVersion.name} <span className="muted"># {currentVersion.version}</span>
                </div>
                <div className="inline">
                  <span className="type-badge">{currentVersion.type}</span>
                  {(currentVersion.labels || []).map((lbl) => (
                    <span
                      key={lbl}
                      className={`chip ${lbl === "production" ? "green" : lbl === "latest" ? "cyan" : ""}`}
                    >
                      {lbl}
                    </span>
                  ))}
                </div>
              </div>

              {currentVersion.type === "chat" ? (
                <div className="chat">
                  {Array.isArray(currentVersion.prompt) &&
                    currentVersion.prompt.map((msg, idx) => (
                      <div key={idx} className="chat-row">
                        <div className="role">{String(msg.role || "").toUpperCase()}</div>
                        <div className="bubble">
                          {typeof msg.content === "string"
                            ? msg.content
                            : JSON.stringify(msg.content, null, 2)}
                        </div>
                      </div>
                    ))}
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
                  <span className="v">{currentVersion.tags.join(", ")}</span>
                </div>
              )}
            </section>
          </div>

          {/* Form */}
          <section className="panel">
            <div className="panel-head">{currentVersion ? "Edit Prompt" : "Create Prompt"}</div>
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
                      ? "Name is locked when editing. Use Duplicate to create a new prompt with a different name."
                      : ""
                  }
                />
                {currentVersion && (
                  <span className="hint">
                    Name locked — click <em>Duplicate</em> to create another.
                  </span>
                )}
              </label>

              <label className="fld">
                <span className="lbl">Type</span>
                <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                  <option value="text">text</option>
                  <option value="chat">chat</option>
                </select>
              </label>

              <label className="fld">
                <span className="lbl">Prompt</span>
                <textarea
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  rows={formType === "chat" ? 10 : 8}
                  placeholder={
                    formType === "text"
                      ? "Enter prompt text with {{placeholders}}"
                      : 'Enter JSON array: [{"role":"system","content":"..."}]'
                  }
                />
              </label>

              <div className="grid2">
                <label className="fld">
                  <span className="lbl">Labels (comma separated)</span>
                  <input
                    type="text"
                    value={formLabels}
                    onChange={(e) => setFormLabels(e.target.value)}
                    placeholder="e.g. production, staging"
                  />
                  <span className="hint">“latest” is reserved and ignored.</span>
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
                  rows={6}
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
                <button className="btn primary" type="submit" disabled={loading}>
                  {currentVersion ? "Create New Version" : "Create Prompt"}
                </button>
                <button className="btn" type="button" onClick={startNewPrompt}>
                  New Prompt
                </button>
                <button className="btn ghost" type="button" onClick={goLanding}>
                  Cancel
                </button>
              </div>
            </form>

            {submitResult && (
              <div className="result">
                <strong>Submission Result</strong>
                <pre className="code">{JSON.stringify(submitResult, null, 2)}</pre>
              </div>
            )}
          </section>
        </main>
      )}

      {/* Create mode uses same form but without version pane */}
      {mode === "create" && (
        <main className="container">
          {error && (
            <div className="alert error">
              <strong>Error:</strong> {error}
            </div>
          )}
          <button className="btn ghost" onClick={goLanding} style={{ marginBottom: 8 }}>
            ← Back to Prompts
          </button>
          <section className="panel">
            <div className="panel-head">Create Prompt</div>
            <form className="form" onSubmit={handleSubmit}>
              <label className="fld">
                <span className="lbl">Prompt Name</span>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </label>

              <label className="fld">
                <span className="lbl">Type</span>
                <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                  <option value="text">text</option>
                  <option value="chat">chat</option>
                </select>
              </label>

              <label className="fld">
                <span className="lbl">Prompt</span>
                <textarea
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  rows={formType === "chat" ? 10 : 8}
                  placeholder={
                    formType === "text"
                      ? "Enter prompt text with {{placeholders}}"
                      : 'Enter JSON array: [{"role":"system","content":"..."}]'
                  }
                />
              </label>

              <div className="grid2">
                <label className="fld">
                  <span className="lbl">Labels (comma separated)</span>
                  <input
                    type="text"
                    value={formLabels}
                    onChange={(e) => setFormLabels(e.target.value)}
                    placeholder="e.g. production, staging"
                  />
                  <span className="hint">“latest” is reserved and ignored.</span>
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
                  rows={6}
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
                <button className="btn primary" type="submit" disabled={loading}>
                  Create Prompt
                </button>
                <button className="btn ghost" type="button" onClick={goLanding}>
                  Cancel
                </button>
              </div>
            </form>
            {submitResult && (
              <div className="result">
                <strong>Submission Result</strong>
                <pre className="code">{JSON.stringify(submitResult, null, 2)}</pre>
              </div>
            )}
          </section>
        </main>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
