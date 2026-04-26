
import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, addDoc, updateDoc, deleteDoc, getDocs, doc } from "firebase/firestore";
import Navbar from "../../components/Navbar";
import DropdownTreeSelect from "react-dropdown-tree-select";
import "react-dropdown-tree-select/dist/styles.css";

// Helper to build tree from flat array, with checked state for selected tags
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

// Custom value renderer to avoid blue box bug
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

export default function MyListPage() {
  const [items, setItems] = useState([]);
  const [tags, setTags] = useState([]);
  const [screen, setScreen] = useState("listing");
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    url: "",
    map: "",
    tags: []
  });
  // Tag filter state for listing
  const [tagFilter, setTagFilter] = useState([]);
  // Search text state for listing
  const [searchText, setSearchText] = useState("");
  // Explicit toggle to show all items in listing
  const [showAllItems, setShowAllItems] = useState(false);
  // Search mode: 'tag' or 'text'
  const [searchMode, setSearchMode] = useState("tag");

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

  // Fetch items from Firestore
  const fetchItems = async () => {
    try {
      const snap = await getDocs(collection(db, "mylist"));
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  // Fetch tags from Firestore
  const fetchTags = async () => {
    try {
      const snap = await getDocs(collection(db, "tags"));
      setTags(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  // Only fetch tags on mount
  useEffect(() => {
    fetchTags();
  }, []);

  // Fetch items only when tagFilter changes (in tag mode) or when searchMode changes
  useEffect(() => {
    if (screen !== "listing") return;
    if (showAllItems) {
      fetchItems();
      return;
    }

    if (searchMode === "tag") {
      if (tagFilter.length > 0) {
        fetchItems();
      } else {
        setItems([]);
      }
    } else {
      // In text mode, always fetch all items (for client-side search)
      fetchItems();
    }
  }, [tagFilter, searchMode, screen, showAllItems]);

  const handleAddClick = () => {
    setSelectedItem(null);
    setFormData({
      title: "",
      description: "",
      url: "",
      map: "",
      tags: []
    });
    setScreen("add");
  };

  const handleEditClick = (item) => {
    setSelectedItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      url: item.url || "",
      map: item.map || "",
      tags: item.tags || []
    });
    setScreen("edit");
  };

  const handleClose = () => {
    setScreen("listing");
    setSelectedItem(null);
  };

  const handleSave = async () => {
    try {
      if (!formData.title.trim()) {
        alert("Title is required");
        return;
      }
      const dataToSave = {
        title: formData.title,
        description: formData.description,
        url: formData.url,
        map: formData.map,
        tags: formData.tags,
        updatedAt: new Date()
      };
      if (screen === "add") {
        dataToSave.createdAt = new Date();
        await addDoc(collection(db, "mylist"), dataToSave);
      } else if (screen === "edit" && selectedItem) {
        const itemRef = doc(db, "mylist", selectedItem.id);
        await updateDoc(itemRef, dataToSave);
      }
      fetchItems();
      handleClose();
    } catch (error) {
      console.error("Error saving item:", error);
      alert("Error saving item: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      const itemRef = doc(db, "mylist", selectedItem.id);
      await deleteDoc(itemRef);
      fetchItems();
      handleClose();
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Error deleting item: " + error.message);
    }
  };

  const getTagDetails = (tagId) => tags.find(t => t.id === tagId);
// ...existing code...
  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
        {screen === "listing" && (
          <>
            <h2 style={{ marginBottom: 16 }}>My List</h2>
            {/* Toggle search mode */}
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => {
                  if (searchMode === "tag") {
                    setSearchMode("text");
                    setTagFilter([]);
                    setShowAllItems(false);
                  } else {
                    setSearchMode("tag");
                    setSearchText("");
                    setShowAllItems(false);
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
                    setShowAllItems(false);
                  } else {
                    setSearchMode("text");
                    setTagFilter([]);
                    setShowAllItems(false);
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
                  setShowAllItems(true);
                }}
                style={{
                  padding: '6px 16px',
                  borderRadius: 4,
                  border: '1px solid #007bff',
                  background: showAllItems ? '#007bff' : '#fff',
                  color: showAllItems ? '#fff' : '#007bff',
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
                    setShowAllItems(false);
                    setTagFilter(selectedNodes.map(n => n.value));
                  }}
                  texts={{ placeholder: 'Filter by tags...' }}
                  className="mylist-tag-tree-select"
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
                    setShowAllItems(false);
                    setSearchText(e.target.value);
                  }}
                  placeholder="Search title or description..."
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
              aria-label="Add Item"
            >+
            </button>
            <div style={{ marginTop: 24 }}>
              {showAllItems ? (
                items.length === 0 ? (
                  <div style={{ color: '#888', textAlign: 'center', marginTop: 48 }}>No items found.</div>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {items.map(item => (
                      <li key={item.id} style={{ background: '#fff', borderRadius: 8, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: 20, cursor: 'pointer' }} onClick={() => { setSelectedItem(item); setScreen('view'); }}>
                        <div style={{ fontWeight: 600, fontSize: 18 }}>{item.title}</div>
                        <div style={{ color: '#888', fontSize: 14, marginTop: 4 }}>{item.description}</div>
                        <div style={{ marginTop: 8 }}>
                          {item.tags?.map(tagId => {
                            const tag = getTagDetails(tagId);
                            return tag ? <span key={tagId} style={{ background: tag.colorCode || '#eee', color: '#fff', fontWeight: 700, borderRadius: 4, padding: '2px 8px', marginRight: 4, fontSize: 13, textShadow: '0 1px 2px rgba(0,0,0,0.18)' }}>{tag.tag}</span> : null;
                          })}
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : searchMode === "tag" ? (
                tagFilter.length === 0 ? (
                  <div style={{ color: '#888', textAlign: 'center', marginTop: 48 }}>
                    Please select one or more tags to view items.
                  </div>
                ) : (
                  (() => {
                    // Get all selected tags and their descendants
                    const allTagIds = getDescendantTagIds(tagFilter, tags);
                    // Show items that have ANY of these tags
                    const filtered = items.filter(item =>
                      Array.isArray(item.tags) && item.tags.some(tagId => allTagIds.includes(tagId))
                    );
                    if (filtered.length === 0) {
                      return <div style={{ color: '#888', textAlign: 'center', marginTop: 48 }}>No items found.</div>;
                    }
                    return (
                      <ul style={{ listStyle: 'none', padding: 0 }}>
                        {filtered.map(item => (
                          <li key={item.id} style={{ background: '#fff', borderRadius: 8, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: 20, cursor: 'pointer' }} onClick={() => { setSelectedItem(item); setScreen('view'); }}>
                            <div style={{ fontWeight: 600, fontSize: 18 }}>{item.title}</div>
                            <div style={{ color: '#888', fontSize: 14, marginTop: 4 }}>{item.description}</div>
                            <div style={{ marginTop: 8 }}>
                              {item.tags?.map(tagId => {
                                const tag = getTagDetails(tagId);
                                return tag ? <span key={tagId} style={{ background: tag.colorCode || '#eee', color: '#fff', fontWeight: 700, borderRadius: 4, padding: '2px 8px', marginRight: 4, fontSize: 13, textShadow: '0 1px 2px rgba(0,0,0,0.18)' }}>{tag.tag}</span> : null;
                              })}
                            </div>
                          </li>
                        ))}
                      </ul>
                    );
                  })()
                )
              ) : (
                !searchText.trim() ? (
                  <div style={{ color: '#888', textAlign: 'center', marginTop: 48 }}>
                    Please enter text to search.
                  </div>
                ) : (
                  (() => {
                    const filtered = items.filter(item =>
                      (item.title && item.title.toLowerCase().includes(searchText.toLowerCase())) ||
                      (item.description && item.description.toLowerCase().includes(searchText.toLowerCase()))
                    );
                    if (filtered.length === 0) {
                      return <div style={{ color: '#888', textAlign: 'center', marginTop: 48 }}>No items found.</div>;
                    }
                    return (
                      <ul style={{ listStyle: 'none', padding: 0 }}>
                        {filtered.map(item => (
                          <li key={item.id} style={{ background: '#fff', borderRadius: 8, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: 20, cursor: 'pointer' }} onClick={() => { setSelectedItem(item); setScreen('view'); }}>
                            <div style={{ fontWeight: 600, fontSize: 18 }}>{item.title}</div>
                            <div style={{ color: '#888', fontSize: 14, marginTop: 4 }}>{item.description}</div>
                            <div style={{ marginTop: 8 }}>
                              {item.tags?.map(tagId => {
                                const tag = getTagDetails(tagId);
                                return tag ? <span key={tagId} style={{ background: tag.colorCode || '#eee', color: '#222', borderRadius: 4, padding: '2px 8px', marginRight: 4, fontSize: 13 }}>{tag.tag}</span> : null;
                              })}
                            </div>
                          </li>
                        ))}
                      </ul>
                    );
                  })()
                )
              )}
            </div>
          </>
        )}
        {screen === "view" && selectedItem && (
          <div className="mylist-form-mobile" style={{ maxWidth: 600, margin: '0 auto', background: '#f6f6f6', borderRadius: 8, padding: 24 }}>
            <h2>{selectedItem.title}</h2>
            <div style={{ margin: '12px 0' }}><b>Tags:</b> {selectedItem.tags?.map(tagId => getTagDetails(tagId)?.tag).filter(Boolean).join(', ') || <span style={{ color: '#888' }}>None</span>}</div>
            <div style={{ margin: '12px 0' }}><b>Description:</b><br />{selectedItem.description}</div>
            <div style={{ margin: '12px 0' }}><b>URL:</b> {selectedItem.url && <a href={selectedItem.url} target="_blank" rel="noopener noreferrer">{selectedItem.url}</a>}</div>
            <div style={{ margin: '12px 0' }}><b>Map:</b> {selectedItem.map && <a href={selectedItem.map} target="_blank" rel="noopener noreferrer">Open in Google Maps</a>}</div>
            <div style={{ marginTop: 24 }}>
              <button onClick={() => handleEditClick(selectedItem)} style={{ marginRight: 12, padding: '6px 16px', borderRadius: 4, background: '#ffc107', color: '#222', border: 'none' }}>Edit</button>
              <button onClick={handleClose} style={{ padding: '6px 16px', borderRadius: 4, background: '#eee', color: '#222', border: 'none' }}>Close</button>
            </div>
          </div>
        )}

        {(screen === "add" || screen === "edit") && (
          <div className="mylist-form-mobile" style={{ maxWidth: 600, margin: '0 auto', background: '#f9f9f9', borderRadius: 8, padding: 24 }}>
            <h3>{screen === "add" ? "Add New Item" : "Edit Item"}</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600 }}>Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', marginTop: 4 }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600 }}>Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', marginTop: 4 }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600 }}>URL</label>
              <input
                type="text"
                value={formData.url}
                onChange={e => setFormData({ ...formData, url: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', marginTop: 4 }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600 }}>Map (Google Maps Link)</label>
              <input
                type="text"
                value={formData.map}
                onChange={e => setFormData({ ...formData, map: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', marginTop: 4 }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600 }}>Tags</label>
              <div style={{ marginTop: 4 }}>
                <DropdownTreeSelect
                  data={buildTagTree(tags, "", formData.tags)}
                  onChange={(currentNode, selectedNodes) => {
                    setFormData({ ...formData, tags: selectedNodes.map(n => n.value) });
                  }}
                  texts={{ placeholder: 'Select tags...' }}
                  className="mylist-tag-tree-select"
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
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleSave} style={{ padding: '6px 16px', borderRadius: 4, background: '#28a745', color: '#fff', border: 'none' }}>{screen === "add" ? "Add" : "Update"}</button>
              <button onClick={handleClose} style={{ padding: '6px 16px', borderRadius: 4, background: '#eee', color: '#222', border: 'none' }}>Cancel</button>
              {screen === "edit" && <button onClick={handleDelete} style={{ padding: '6px 16px', borderRadius: 4, background: '#dc3545', color: '#fff', border: 'none' }}>Delete</button>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

