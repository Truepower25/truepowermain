import { useState, useRef } from 'react'
import { Save, X, Upload, Trash2, Plus, MoveUp, MoveDown } from 'lucide-react'
import { updatePageContent, uploadImage } from '../lib/supabase'

export default function PageContentEditor({ pageContent, onSaved }) {
  const [editingSection, setEditingSection] = useState(null)
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState({})
  const fileRefs = useRef({})
  const nextItemId = useRef(0)

  const pageName = pageContent.page_slug === 'about' ? '📖 About Page' : '🎬 Portfolio Page'
  const sections = pageContent.sections || []

  const startEdit = (section) => {
    setEditingSection(section.section_key)
    setFormData(JSON.parse(JSON.stringify(section.content || {})))
  }

  const handleImageUpload = async (fieldName, file) => {
    if (!file) return
    setUploading(prev => ({ ...prev, [fieldName]: true }))
    try {
      const url = await uploadImage(file, 'page-images')
      setFormData(prev => ({ ...prev, [fieldName]: url }))
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(prev => ({ ...prev, [fieldName]: false }))
    }
  }

  const handleArrayImageUpload = async (arrayKey, idx, subFieldName, file) => {
    if (!file) return
    const uploadKey = `${arrayKey}.${idx}.${subFieldName}`
    setUploading(prev => ({ ...prev, [uploadKey]: true }))
    try {
      const url = await uploadImage(file, 'page-images')
      setFormData(prev => {
        const newItems = [...(prev[arrayKey] || [])]
        newItems[idx] = { ...newItems[idx], [subFieldName]: url }
        return { ...prev, [arrayKey]: newItems }
      })
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(prev => ({ ...prev, [uploadKey]: false }))
    }
  }

  const handleArrayAdd = (arrayKey, template) => {
    const newItem = typeof template === 'object' && template !== null
      ? { ...template, id: nextItemId.current += 1 }
      : template
    setFormData(prev => ({
      ...prev,
      [arrayKey]: [...(prev[arrayKey] || []), newItem]
    }))
  }

  const handleArrayRemove = (arrayKey, index) => {
    setFormData(prev => ({
      ...prev,
      [arrayKey]: prev[arrayKey].filter((_, i) => i !== index)
    }))
  }

  const handleArrayMove = (arrayKey, index, direction) => {
    const newArray = [...formData[arrayKey]]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= newArray.length) return
    ;[newArray[index], newArray[newIndex]] = [newArray[newIndex], newArray[index]]
    setFormData(prev => ({ ...prev, [arrayKey]: newArray }))
  }

  const saveSection = async () => {
    setSaving(true)
    try {
      await updatePageContent(pageContent.page_slug, editingSection, formData)
      setEditingSection(null)
      if (onSaved) onSaved()
      alert('Saved successfully!')
    } catch (err) {
      alert('Error saving: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const getFileRef = (key) => {
    if (!fileRefs.current[key]) fileRefs.current[key] = { current: null }
    return fileRefs.current[key]
  }

  const renderForm = () => {
    if (!editingSection) return null
    const section = sections.find(s => s.section_key === editingSection)
    if (!section) return null
    const schema = section.schema || []

    return (
      <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4 overflow-auto">
        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-border sticky top-0 bg-white z-10">
            <div>
              <h3 className="font-display font-bold text-lg">Edit: {section.label}</h3>
              <p className="text-sub text-xs">{section.description}</p>
            </div>
            <button type="button" onClick={() => setEditingSection(null)} className="p-2 hover:bg-muted rounded-lg">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-6 space-y-5">
            {schema.length === 0 && (
              <p className="text-sub text-sm text-center py-8">No editable fields defined for this section.</p>
            )}

            {schema.map(field => (
              <div key={field.name}>
                <label className="label">{field.label}</label>

                {field.type === 'text' && (
                  <input
                    type="text"
                    className="input"
                    value={formData[field.name] || ''}
                    onChange={e => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                    placeholder={field.placeholder}
                  />
                )}

                {field.type === 'textarea' && (
                  <textarea
                    className="input resize-none"
                    rows={field.rows || 4}
                    value={formData[field.name] || ''}
                    onChange={e => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                    placeholder={field.placeholder}
                  />
                )}

                {field.type === 'image' && (() => {
                  const refKey = `top_${field.name}`
                  return (
                    <div>
                      {formData[field.name] && (
                        <div className="mb-3 relative inline-block">
                          <img src={formData[field.name]} alt="Preview" className="w-32 h-32 object-cover rounded-lg border border-border" />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, [field.name]: '' }))}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => getFileRef(refKey).current?.click()}
                        className="btn-outline flex items-center gap-2"
                        disabled={uploading[field.name]}
                      >
                        <Upload size={16} /> {uploading[field.name] ? 'Uploading...' : formData[field.name] ? 'Replace Image' : 'Upload Image'}
                      </button>
                      <input
                        ref={el => { getFileRef(refKey).current = el }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleImageUpload(field.name, e.target.files[0])}
                      />
                    </div>
                  )
                })()}

                {field.type === 'array' && (
                  <div className="space-y-3">
                    {(formData[field.name] || []).map((item, idx) => (
                      <div key={item?.id || idx} className="bg-muted rounded-xl p-4 border border-border">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-display font-semibold">{field.itemLabel || 'Item'} {idx + 1}</span>
                          <div className="flex gap-1">
                            <button type="button" onClick={() => handleArrayMove(field.name, idx, 'up')} className="p-1 hover:bg-white rounded" title="Move up">
                              <MoveUp size={14} />
                            </button>
                            <button type="button" onClick={() => handleArrayMove(field.name, idx, 'down')} className="p-1 hover:bg-white rounded" title="Move down">
                              <MoveDown size={14} />
                            </button>
                            <button type="button" onClick={() => handleArrayRemove(field.name, idx)} className="p-1 hover:bg-white rounded text-red-500" title="Remove">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {typeof item === 'string' && (
                          <input
                            type="text"
                            className="input text-sm"
                            value={item}
                            onChange={e => {
                              const newItems = [...(formData[field.name] || [])]
                              newItems[idx] = e.target.value
                              setFormData(prev => ({ ...prev, [field.name]: newItems }))
                            }}
                            placeholder={field.placeholder || ''}
                          />
                        )}

                        {typeof item === 'object' && item !== null && (field.itemFields || []).map(subField => {
                          const uploadKey = `${field.name}.${idx}.${subField.name}`
                          const refKey = `arr_${field.name}_${idx}_${subField.name}`
                          return (
                            <div key={subField.name} className="mb-3">
                              <label className="text-xs font-medium text-sub block mb-1">{subField.label}</label>

                              {subField.type === 'text' && (
                                <input
                                  type="text"
                                  className="input text-sm py-2"
                                  value={item[subField.name] || ''}
                                  placeholder={subField.placeholder}
                                  onChange={e => {
                                    const newItems = [...(formData[field.name] || [])]
                                    newItems[idx] = { ...newItems[idx], [subField.name]: e.target.value }
                                    setFormData(prev => ({ ...prev, [field.name]: newItems }))
                                  }}
                                />
                              )}

                              {subField.type === 'textarea' && (
                                <textarea
                                  className="input text-sm py-2 resize-none"
                                  rows={subField.rows || 2}
                                  value={item[subField.name] || ''}
                                  placeholder={subField.placeholder}
                                  onChange={e => {
                                    const newItems = [...(formData[field.name] || [])]
                                    newItems[idx] = { ...newItems[idx], [subField.name]: e.target.value }
                                    setFormData(prev => ({ ...prev, [field.name]: newItems }))
                                  }}
                                />
                              )}

                              {subField.type === 'image' && (
                                <div>
                                  {item[subField.name] && (
                                    <div className="mb-2 relative inline-block">
                                      <img src={item[subField.name]} alt="Preview" className="w-24 h-24 object-cover rounded-lg border border-border" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newItems = [...(formData[field.name] || [])]
                                          newItems[idx] = { ...newItems[idx], [subField.name]: '' }
                                          setFormData(prev => ({ ...prev, [field.name]: newItems }))
                                        }}
                                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white"
                                      >
                                        <X size={10} />
                                      </button>
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => getFileRef(refKey).current?.click()}
                                    className="btn-outline text-sm flex items-center gap-2 py-2"
                                    disabled={uploading[uploadKey]}
                                  >
                                    <Upload size={14} />
                                    {uploading[uploadKey] ? 'Uploading...' : item[subField.name] ? 'Replace' : 'Upload Image'}
                                  </button>
                                  <input
                                    ref={el => { getFileRef(refKey).current = el }}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => handleArrayImageUpload(field.name, idx, subField.name, e.target.files[0])}
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => handleArrayAdd(field.name, field.itemTemplate)}
                      className="btn-outline text-sm py-2 w-full flex items-center justify-center gap-2"
                    >
                      <Plus size={14} /> Add {field.itemLabel || 'Item'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 p-4 border-t border-border sticky bottom-0 bg-white">
            <button type="button" onClick={saveSection} disabled={saving} className="btn-primary">
              <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => setEditingSection(null)} className="btn-outline">Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="font-display font-bold text-xl mb-2">{pageName}</h3>
        <p className="text-sub text-sm">Click &quot;Edit&quot; on any section to change its content.</p>
      </div>

      <div className="space-y-3">
        {sections.map(section => (
          <div key={section.section_key} className="card p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge text-xs">{section.section_key}</span>
                <span className="font-display font-semibold text-ink">{section.label}</span>
              </div>
              <p className="text-sub text-sm">{section.description}</p>
            </div>
            <button
              type="button"
              onClick={() => startEdit(section)}
              className="px-4 py-2 rounded-xl border border-brand-500 text-brand-500 hover:bg-brand-500 hover:text-white transition-all shrink-0 ml-4"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {renderForm()}
    </div>
  )
}
