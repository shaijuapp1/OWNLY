import { useState, useEffect } from "react";
import DropdownTreeSelect from "react-dropdown-tree-select";
import "react-dropdown-tree-select/dist/styles.css";
import { auth, db } from "../../firebase";
import { collection, addDoc, updateDoc, getDocs, doc } from "firebase/firestore";
import RichTextEditor from "./RichTextEditor";
import Navbar from "../../components/Navbar";
import "./NotesPage.css";

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [tags, setTags] = useState([]);
  const [screen, setScreen] = useState("listing");
  const [selectedNote, setSelectedNote] = useState(null);
  // For tag filter in listing
  const [tagFilter, setTagFilter] = useState([]);
  // For text search in listing
  const [searchText, setSearchText] = useState("");
  // Explicit toggle to show all notes in listing
  const [showAllNotes, setShowAllNotes] = useState(false);
  // Toggle between tag and text search
  const [searchMode, setSearchMode] = useState("text");
  // removed unused selectedTag state
  const [formData, setFormData] = useState({
    title: "",
    note: "",
    tags: []
  });

  // ...existing code (all logic, hooks, handlers, and return JSX remain unchanged, but are now inside the function)...

  // Fetch notes from Firestore
  const fetchNotes = async () => {
    try {
      const notesSnap = await getDocs(collection(db, "notes"));
      setNotes(notesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

  // Fetch tags from Firestore
  const fetchTags = async () => {
    try {
      const tagsSnap = await getDocs(collection(db, "tags"));
      setTags(tagsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchTags();
  }, []);

  const handleAddClick = () => {
    setSelectedNote(null);
    setFormData({
      title: "",
      note: "",
      tags: []
    });
    setScreen("add");
  };

  const handleEditClick = (note) => {
    setSelectedNote(note);
    setFormData({
      title: note.title,
      note: note.note,
      tags: note.tags || []
    });
    setScreen("edit");
  };

  const handleClose = () => {
    setScreen("listing");
    setSelectedNote(null);
  };

  const handleSave = async () => {
    try {
      if (!formData.title.trim()) {
        alert("Title is required");
        return;
      }

      const currentUser = auth.currentUser;
      const userData = currentUser ? currentUser.email : "Anonymous";

      const dataToSave = {
        title: formData.title,
        note: formData.note,
        tags: formData.tags,
        createdAt: screen === "add" ? new Date() : selectedNote.createdAt,
        updatedAt: new Date()
      };

      if (screen === "add") {
        // Initialize empty history for new notes
        dataToSave.history = [];
        await addDoc(collection(db, "notes"), dataToSave);
      } else if (screen === "edit") {
        // Add edit history entry
        const historyEntry = {
          timestamp: new Date().toISOString(),
          user: userData,
          previousTitle: selectedNote.title,
          previousNote: selectedNote.note,
          previousTags: selectedNote.tags || []
        };

        const noteRef = doc(db, "notes", selectedNote.id);
        const existingHistory = selectedNote.history || [];
        dataToSave.history = [...existingHistory, historyEntry];
        await updateDoc(noteRef, dataToSave);
      }
      fetchNotes();
      handleClose();
    } catch (error) {
      console.error("Error saving note:", error);
      alert("Error saving note: " + error.message);
    }
  };

  const getTagDetails = (tagId) => {
    return tags.find(t => t.id === tagId);
  };

  // Helper to build tag tree for DropdownTreeSelect
  function buildTagTree(tags, parentId = "", selected = []) {
    return tags
      .filter(tag => (tag.parentid || "") === parentId)
      .map(tag => ({
        label: tag.tag,
        value: tag.id,
        checked: selected.includes(tag.id),
        children: buildTagTree(tags, tag.id, selected),
        color: tag.colorCode || tag.color || undefined
      }));
  }

  // Custom value renderer for tag pills
  function TagValueRenderer({ selected, label, value, data }) {
    return (
      <span style={{
        background: data.color || '#eee',
        color: '#fff',
        borderRadius: 4,
        padding: '2px 10px',
        marginRight: 4,
        fontWeight: 700,
        fontSize: 14,
        display: 'inline-block',
        letterSpacing: 0.2,
        textShadow: '0 1px 2px rgba(0,0,0,0.18)'
      }}>{label}</span>
    );
  }

  // Helper: get all descendant tag ids for a set of tag ids
  function getDescendantTagIds(selectedIds, allTags) {
    const descendants = new Set();
    function addDescendants(parentIds) {
      for (const pid of parentIds) {
        descendants.add(pid);
        const children = allTags.filter(t => (t.parentid || "") === pid).map(t => t.id);
        if (children.length > 0) addDescendants(children);
      }
    }
    addDescendants(selectedIds);
    return Array.from(descendants);
  }

  // Listing filter logic: tag or text search
  const getFilteredAndSearchedNotes = () => {
    if (showAllNotes) return notes;

    if (searchMode === "tag") {
      if (!tagFilter.length) return [];
      // Get all selected tags and descendants
      const allTagIds = getDescendantTagIds(tagFilter, tags);
      // Show notes that have ANY of these tags
      return notes.filter(note => Array.isArray(note.tags) && note.tags.some(tagId => allTagIds.includes(tagId)));
    } else {
      if (!searchText.trim()) return [];
      return notes.filter(note =>
        (note.title && note.title.toLowerCase().includes(searchText.toLowerCase())) ||
        (note.note && note.note.toLowerCase().includes(searchText.toLowerCase()))
      );
    }
  };

  const handleViewNote = (note) => {
    setSelectedNote(note);
    setFormData({
      title: note.title,
      note: note.note,
      tags: note.tags || []
    });
    setScreen("view");
  };

  return (
    <>
      <Navbar />
      <div style={{ padding: "20px" }}>
        {screen === "listing" && (
          <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
            <h2 style={{ marginBottom: 16 }}>Notes</h2>
            {/* Toggle search mode */}
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => {
                  if (searchMode === "tag") {
                    setSearchMode("text");
                    setTagFilter([]);
                    setShowAllNotes(false);
                  } else {
                    setSearchMode("tag");
                    setSearchText("");
                    setShowAllNotes(false);
                  }
                }}
                style={{
                  padding: '6px 16px',
                  borderRadius: 4,
                  background: searchMode === "tag" ? '#007bff' : '#eee',
                  color: searchMode === "tag" ? '#fff' : '#222',
                  border: 'none',
                  marginRight: 8
                }}
              >
                Tag Filter
              </button>
              <button
                onClick={() => {
                  if (searchMode === "text") {
                    setSearchMode("tag");
                    setSearchText("");
                    setShowAllNotes(false);
                  } else {
                    setSearchMode("text");
                    setTagFilter([]);
                    setShowAllNotes(false);
                  }
                }}
                style={{
                  padding: '6px 16px',
                  borderRadius: 4,
                  background: searchMode === "text" ? '#007bff' : '#eee',
                  color: searchMode === "text" ? '#fff' : '#222',
                  border: 'none'
                }}
              >
                Text Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchMode("text");
                  setSearchText("");
                  setTagFilter([]);
                  setShowAllNotes(true);
                }}
                style={{
                  padding: '6px 16px',
                  borderRadius: 4,
                  border: '1px solid #007bff',
                  background: showAllNotes ? '#007bff' : '#fff',
                  color: showAllNotes ? '#fff' : '#007bff',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  marginLeft: 8
                }}
              >
                Show All
              </button>
            </div>
            {/* Tag filter multi-select (only in tag mode) */}
            {searchMode === "tag" && (
              <div style={{ maxWidth: 400, marginBottom: 20 }}>
                <DropdownTreeSelect
                  data={buildTagTree(tags, "", tagFilter)}
                  onChange={(currentNode, selectedNodes) => {
                    setShowAllNotes(false);
                    setTagFilter(selectedNodes.map(n => n.value));
                  }}
                  texts={{ placeholder: 'Filter by tags...' }}
                  className="notes-tag-tree-select"
                  mode="multiSelect"
                  keepTreeOnSearch
                  inlineSearchInput
                  showPartiallySelected
                  keepChildrenOnSearch
                  valueRenderer={TagValueRenderer}
                  style={{ width: '100%' }}
                />
              </div>
            )}
            {/* Search text box (only in text mode) */}
            {searchMode === "text" && (
              <div style={{ maxWidth: 400, marginBottom: 20 }}>
                <input
                  type="text"
                  value={searchText}
                  onChange={e => {
                    setShowAllNotes(false);
                    setSearchText(e.target.value);
                  }}
                  placeholder="Search title or content..."
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                />
              </div>
            )}
            <button
              onClick={handleAddClick}
              style={{
                position: 'fixed',
                bottom: 32,
                right: 32,
                zIndex: 100,
                background: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 56,
                height: 56,
                fontSize: 32,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
              aria-label="Add Note"
            >+
            </button>
            <div style={{ marginTop: 24 }}>
              {getFilteredAndSearchedNotes().length === 0 ? (
                <div style={{ color: '#888', textAlign: 'center', marginTop: 48 }}>
                  No notes found. <button className="btn btn-link" onClick={handleAddClick}>Add one now</button>
                </div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {getFilteredAndSearchedNotes().map((note) => (
                    <li key={note.id} style={{ background: '#fff', borderRadius: 8, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: 20, cursor: 'pointer' }} onClick={() => handleViewNote(note)}>
                      <div style={{ fontWeight: 600, fontSize: 18 }}>{note.title}</div>
                      <div style={{ color: '#888', fontSize: 14, marginTop: 4 }} dangerouslySetInnerHTML={{ __html: note.note }}></div>
                      <div style={{ marginTop: 8 }}>
                        {note.tags?.map(tagId => {
                          const tag = getTagDetails(tagId);
                          return tag ? <span key={tagId} style={{ background: tag.colorCode || '#eee', color: '#fff', fontWeight: 700, borderRadius: 4, padding: '2px 8px', marginRight: 4, fontSize: 13, textShadow: '0 1px 2px rgba(0,0,0,0.18)' }}>{tag.tag}</span> : null;
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {screen === "view" && selectedNote && (
          <div className="card shadow-lg">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">{selectedNote.title}</h5>
            </div>
            <div className="card-body">
              <div className="note-content-view" dangerouslySetInnerHTML={{ __html: selectedNote.note }}></div>
              
              <div className="mt-4">
                <strong>Tags:</strong>
                <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {selectedNote.tags && selectedNote.tags.length > 0 ? (
                    selectedNote.tags.map((tagId) => {
                      const tag = getTagDetails(tagId);
                      return tag ? (
                        <span
                          key={tagId}
                          style={{
                            backgroundColor: tag.colorCode,
                            color: "#fff",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            fontWeight: "500"
                          }}
                        >
                          {tag.tag}
                        </span>
                      ) : null;
                    })
                  ) : (
                    <span style={{ color: "#999" }}>No tags</span>
                  )}
                </div>
              </div>

              {selectedNote.history && selectedNote.history.length > 0 && (
                <div className="mt-5">
                  <h6 className="mb-3" style={{ borderBottom: "2px solid #ddd", paddingBottom: "8px" }}>
                    Edit History
                  </h6>
                  <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                    {selectedNote.history.map((entry, idx) => (
                      <div key={idx} style={{
                        padding: "12px",
                        borderLeft: "3px solid #007bff",
                        backgroundColor: "#f8f9fa",
                        marginBottom: "12px",
                        borderRadius: "4px"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <strong style={{ color: "#007bff" }}>Edit #{selectedNote.history.length - idx}</strong>
                          <span style={{ fontSize: "0.85rem", color: "#666" }}>
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ marginBottom: "8px", color: "#666", fontSize: "0.9rem" }}>
                          <strong>By:</strong> {entry.user}
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#555", marginTop: "8px" }}>
                          <details style={{ cursor: "pointer" }}>
                            <summary style={{ fontWeight: "500", marginBottom: "4px" }}>
                              View previous version
                            </summary>
                            <div style={{ marginTop: "8px", paddingLeft: "12px" }}>
                              <div style={{ marginBottom: "8px" }}>
                                <strong style={{ display: "block", marginBottom: "4px" }}>Previous Title:</strong>
                                <div style={{ color: "#333", fontSize: "0.9rem" }}>{entry.previousTitle}</div>
                              </div>
                              {entry.previousNote && (
                                <div>
                                  <strong style={{ display: "block", marginBottom: "4px" }}>Previous Content:</strong>
                                  <div 
                                    style={{ 
                                      color: "#333", 
                                      fontSize: "0.9rem",
                                      backgroundColor: "#fff",
                                      padding: "8px",
                                      borderRadius: "3px"
                                    }}
                                    dangerouslySetInnerHTML={{ __html: entry.previousNote }}
                                  />
                                </div>
                              )}
                            </div>
                          </details>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="card-footer d-flex gap-2">
              <button
                className="btn btn-warning"
                onClick={() => handleEditClick(selectedNote)}
              >
                Edit
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleClose}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {(screen === "add" || screen === "edit") && (
          <div className="card shadow">
            <div className="card-body">
              <h3 className="mb-4">{screen === "add" ? "Add New Note" : "Edit Note"}</h3>

              <div className="mb-3">
                <label className="form-label fw-bold">Title *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter note title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold">Note *</label>
                <RichTextEditor
                  value={formData.note}
                  onChange={(value) => setFormData({ ...formData, note: value })}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold">Tags</label>
                <div style={{ marginTop: 4 }}>
                  <DropdownTreeSelect
                    data={buildTagTree(tags, "", formData.tags)}
                    onChange={(currentNode, selectedNodes) => {
                      setFormData({ ...formData, tags: selectedNodes.map(n => n.value) });
                    }}
                    texts={{ placeholder: 'Select tags...' }}
                    className="notes-tag-tree-select"
                    mode="multiSelect"
                    keepTreeOnSearch
                    inlineSearchInput
                    showPartiallySelected
                    keepChildrenOnSearch
                    valueRenderer={TagValueRenderer}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="mb-3">
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                  {formData.tags.length > 0 ? (
                    formData.tags.map((tagId) => {
                      const tag = getTagDetails(tagId);
                      return tag ? (
                        <span
                          key={tagId}
                          style={{
                            backgroundColor: tag.colorCode,
                            color: "#fff",
                            padding: "5px 10px",
                            borderRadius: "4px",
                            fontWeight: "500"
                          }}
                        >
                          {tag.tag}
                        </span>
                      ) : null;
                    })
                  ) : (
                    <span style={{ color: "#999" }}>No tags selected</span>
                  )}
                </div>
              </div>

              <div className="d-flex gap-2">
                <button className="btn btn-success" onClick={handleSave}>
                  {screen === "add" ? "Add Note" : "Update Note"}
                </button>
                <button className="btn btn-secondary" onClick={handleClose}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
