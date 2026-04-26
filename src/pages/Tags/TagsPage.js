import { useState, useEffect } from "react";
import { Tree } from "react-arborist";
// If your version of react-arborist does not provide a CSS file, add your own styles for the tree or copy from the Arborist repo.
import { db } from "../../firebase";
import { collection, addDoc, updateDoc, deleteDoc, getDocs, doc } from "firebase/firestore";
import Navbar from "../../components/Navbar";

import "./TagsPage.mobile.css";



// ...existing code...

const COLORS = {
  "Red": "#DC3545",
  "Green": "#28A745",
  "Blue": "#007BFF",
  "Yellow": "#FFC107",
  "Purple": "#6F42C1",
  "Orange": "#FD7E14",
  "Cyan": "#17A2B8",
  "Pink": "#E83E8C",
  "Teal": "#20C997",
  "Indigo": "#6610F2"
};

// Helper to build tree from flat array
function buildTagTree(tags, parentId = "") {
  return tags
    .filter(tag => (tag.parentid || "") === parentId)
    .map(tag => ({
      ...tag,
      children: buildTagTree(tags, tag.id)
    }));
}

export default function TagsPage() {
    // State for child tag form
    const [showChildForm, setShowChildForm] = useState(false);
    const [childForm, setChildForm] = useState({ tag: '', color: 'Red' });

    // Handler to add a child tag
    const handleAddChildTag = async (e) => {
      e.preventDefault();
      if (!childForm.tag.trim() || !selectedTagId) return;
      try {
        await addDoc(collection(db, "tags"), {
          tag: childForm.tag,
          color: childForm.color,
          colorCode: COLORS[childForm.color] || childForm.color,
          parentid: selectedTagId
        });
        setChildForm({ tag: '', color: 'Red' });
        setShowChildForm(false);
        fetchTags();
      } catch (error) {
        alert("Failed to add child tag");
      }
    };
  // State declarations (must be at the top)
  const [tags, setTags] = useState([]);
  const [selectedTagId, setSelectedTagId] = useState(null);
  const [viewMode, setViewMode] = useState(true); // true=view, false=edit
  const [editTagId, setEditTagId] = useState(null);
  const [editForm, setEditForm] = useState({ tag: "", color: "Red" });
  const [screen] = useState("listing");
  const [formData, setFormData] = useState({ tag: "", color: "Red" });

  // Debug: log tags and treeData
  useEffect(() => {
    console.log('tags:', tags);
    console.log('treeData:', buildTagTree(tags));
  }, [tags]);

  // Find selected tag object
  const selectedTag = tags.find(t => t.id === selectedTagId) || null;

  // Handler to save edit
  const handleSaveEdit = async (tagId) => {
    if (!editForm.tag.trim()) return;
    try {
      await updateDoc(doc(db, "tags", tagId), {
        tag: editForm.tag,
        color: editForm.color,
        colorCode: COLORS[editForm.color] || editForm.color
      });
      setEditTagId(null);
      fetchTags();
    } catch (error) {
      alert("Failed to update tag");
    }
  };

  // Handler to delete a tag (only if not used in notes or mylist)
  const handleDeleteTag = async (tagId) => {
    if (!window.confirm("Are you sure you want to delete this tag?")) return;
    try {
      // Check if tag is used in any notes
      const notesSnap = await getDocs(collection(db, "notes"));
      let used = false;
      notesSnap.forEach(docSnap => {
        const note = docSnap.data();
        if (Array.isArray(note.tags) && note.tags.includes(tagId)) {
          used = true;
        }
      });
      // Check if tag is used in any mylist items
      if (!used) {
        const mylistSnap = await getDocs(collection(db, "mylist"));
        mylistSnap.forEach(docSnap => {
          const item = docSnap.data();
          if (Array.isArray(item.tags) && item.tags.includes(tagId)) {
            used = true;
          }
        });
      }
      if (used) {
        alert("Cannot delete: This tag is used in one or more notes or mylist items.");
        return;
      }
      await deleteDoc(doc(db, "tags", tagId));
      fetchTags();
    } catch (error) {
      alert("Failed to delete tag");
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
    fetchTags();
  }, []);


  // Handler to add a new root tag
  const handleAddRootTag = async (e) => {
    e.preventDefault();
    if (!formData.tag.trim()) return;
    try {
      await addDoc(collection(db, "tags"), {
        tag: formData.tag,
        color: formData.color,
        colorCode: COLORS[formData.color] || formData.color,
        parentid: ""
      });
      setFormData({ ...formData, tag: "" });
      fetchTags();
    } catch (error) {
      alert("Failed to add tag");
    }
  };





  // Arborist expects children as 'children' property
  const treeData = buildTagTree(tags);

  // Custom node renderer for Arborist
  function TagNode({ node, style, dragHandle }) {
    // Show tag name, fallback to id, and show node.data as JSON for debugging
    if (!node || !node.data) return null;
    let label = node.data.tag && node.data.tag.trim() ? node.data.tag : node.id;
    if (!node.data.tag || !node.data.tag.trim()) {
      console.warn('TagNode: missing tag property in node.data:', node.data);
    }
    return (
      <div
        style={{
          ...style,
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: 4,
          background: node.id === selectedTagId ? '#e6f7ff' : undefined,
          marginBottom: 2,
          marginLeft: node.level * 16 // indent children
        }}
        ref={dragHandle}
        onClick={() => {
          setSelectedTagId(node.id);
          setViewMode(true);
          setEditTagId(null);
        }}
      >
        {node.isInternal && (
          <span onClick={e => { e.stopPropagation(); node.toggle(); }} style={{ marginRight: 8, cursor: 'pointer', fontSize: 16 }}>
            {node.isOpen ? '▼' : '▶'}
          </span>
        )}
        <span style={{ color: '#111', fontWeight: 600, fontSize: 16 }}>{label}</span>
      </div>
    );
    return (
      <div
        style={{ ...style, cursor: 'pointer', padding: 4, borderRadius: 4, background: node.id === selectedTagId ? '#e6f7ff' : undefined }}
        ref={dragHandle}
        onClick={() => {
          setSelectedTagId(node.id);
          setViewMode(true);
          setEditTagId(null);
        }}
      >
        <span style={{ color: node.data.colorCode || node.data.color, fontWeight: 500 }}>{label}</span>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <h2>Tags</h2>
      {screen === "listing" && (
        <div className="tag-flex-mobile" style={{ display: 'flex', gap: 0, width: '100vw', maxWidth: '100vw' }}>
          <div className="tag-tree-mobile" style={{ flex: 1, minWidth: 0, width: '100%', maxWidth: '100%', borderRight: '1px solid #eee', height: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            <strong style={{ padding: '16px 0 0 16px' }}>Tag Tree:</strong>
            <div style={{ flex: 1, minHeight: 0, background: '#fafcff', width: '100%' }}>
              <Tree
                data={treeData}
                childrenAccessor="children"
                idAccessor="id"
                rowHeight={32}
                width={undefined}
                height={undefined}
                padding={8}
                selection={selectedTagId}
                style={{ width: '100%', height: '100%' }}
              >
                 {props => <TagNode {...props} />}
              </Tree>
            </div>
          </div>
          <div className="tag-details-mobile" style={{ flex: 1, minWidth: 0, width: '100%', maxWidth: '100%', height: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', background: '#fafcff', padding: 0 }}>
            {selectedTag && viewMode && (
              <div style={{ background: '#f6f6f6', borderRadius: 6, padding: 16, marginBottom: 16 }}>
                <h4 style={{ marginTop: 0 }}>{selectedTag.tag}</h4>
                <div><b>Color:</b> {selectedTag.color}</div>
                <div><b>Color Code:</b> {selectedTag.colorCode || COLORS[selectedTag.color] || selectedTag.color}</div>
                <div><b>Parent:</b> {selectedTag.parentid || '(root)'}</div>
                <button style={{ marginTop: 12 }} onClick={() => {
                  setEditTagId(selectedTag.id);
                  setEditForm({ tag: selectedTag.tag, color: selectedTag.color });
                  setViewMode(false);
                }}>Edit</button>
                <button style={{ marginLeft: 8 }} onClick={() => setShowChildForm(v => !v)}>
                  {showChildForm ? 'Cancel' : 'Add Child Tag'}
                </button>
                {showChildForm && (
                  <form onSubmit={handleAddChildTag} style={{ marginTop: 12, background: '#f9f9f9', padding: 10, borderRadius: 6 }}>
                    <div style={{ marginBottom: 8 }}>
                      <label>Child Tag: </label>
                      <input
                        type="text"
                        value={childForm.tag}
                        onChange={e => setChildForm({ ...childForm, tag: e.target.value })}
                        placeholder="Enter child tag name"
                        style={{ marginRight: 8 }}
                      />
                      <select
                        value={childForm.color}
                        onChange={e => setChildForm({ ...childForm, color: e.target.value })}
                        style={{ marginRight: 8 }}
                      >
                        {Object.keys(COLORS).map((colorName) => (
                          <option key={colorName} value={colorName}>
                            {colorName}
                          </option>
                        ))}
                      </select>
                      <button type="submit">Add</button>
                    </div>
                  </form>
                )}
              </div>
            )}
            {selectedTag && !viewMode && editTagId === selectedTag.id && (
              <form
                className="tag-form-mobile"
                onSubmit={e => { e.preventDefault(); handleSaveEdit(selectedTag.id); setViewMode(true); }}
                style={{ background: '#f6f6f6', borderRadius: 6, padding: 16, marginBottom: 16 }}
              >
                <h4>Edit Tag</h4>
                <div style={{ marginBottom: 8 }}>
                  <label>Name: </label>
                  <input
                    type="text"
                    value={editForm.tag}
                    onChange={e => setEditForm({ ...editForm, tag: e.target.value })}
                    style={{ marginLeft: 8 }}
                  />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label>Color: </label>
                  <select
                    value={editForm.color}
                    onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                    style={{ marginLeft: 8 }}
                  >
                    {Object.keys(COLORS).map((colorName) => (
                      <option key={colorName} value={colorName}>
                        {colorName}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Only allow delete if no children */}
                {tags.some(t => t.parentid === selectedTag.id) ? (
                  <div style={{ color: 'red', marginBottom: 8 }}>Cannot delete: This tag has child tags.</div>
                ) : (
                  <button type="button" style={{ marginRight: 8 }} onClick={() => handleDeleteTag(selectedTag.id)}>Delete</button>
                )}
                <button type="submit">Save</button>
                <button type="button" style={{ marginLeft: 8 }} onClick={() => setViewMode(true)}>Quit</button>
              </form>
            )}
            <form onSubmit={handleAddRootTag} className="tag-form-mobile" style={{ marginBottom: 24, background: '#f9f9f9', padding: 12, borderRadius: 6, maxWidth: 400 }}>
              <div style={{ marginBottom: 8 }}>
                <label>New Root Tag: </label>
                <input
                  type="text"
                  value={formData.tag}
                  onChange={e => setFormData({ ...formData, tag: e.target.value })}
                  placeholder="Enter tag name"
                  style={{ marginRight: 8 }}
                />
                <select
                  value={formData.color}
                  onChange={e => setFormData({ ...formData, color: e.target.value })}
                  style={{ marginRight: 8 }}
                >
                  {Object.keys(COLORS).map((colorName) => (
                    <option key={colorName} value={colorName}>
                      {colorName}
                    </option>
                  ))}
                </select>
                <button type="submit">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
