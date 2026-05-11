import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'

const sections = [
  { key: 'complaint_types', label: 'Complaint Types', icon: 'fa-tools', color: '#ED2939' },
  { key: 'pre_delivery_checklist', label: 'Pre-Delivery Checklist', icon: 'fa-clipboard-check', color: '#002395' },
  { key: 'brands', label: 'Mobile Brands', icon: 'fa-mobile-alt', color: '#16a34a' },
  { key: 'accessories', label: 'Accessories List', icon: 'fa-box', color: '#f97316' },
  { key: 'ram_options', label: 'RAM Options', icon: 'fa-memory', color: '#0891b2' },
  { key: 'rom_options', label: 'ROM / Storage Options', icon: 'fa-hdd', color: '#7c3aed' }
]

const SettingsPage = () => {
  const navigate = useNavigate()
  const { currentUser, userRole } = useAuth()
  const { settings, updateSetting, clearCache } = useSettings()
  const [newItemText, setNewItemText] = useState({})
  const [editModal, setEditModal] = useState({ open: false, key: '', index: -1, value: '' })
  const [selectedModelBrand, setSelectedModelBrand] = useState('')
  const [newModelText, setNewModelText] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  if (userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const handleAddItem = async (key) => {
    const text = newItemText[key]?.trim()
    if (!text) return
    const currentItems = settings[key]?.items || []
    await updateSetting(key, [...currentItems, text])
    setNewItemText(prev => ({ ...prev, [key]: '' }))
  }

  const handleDeleteItem = async (key, index) => {
    const currentItems = [...(settings[key]?.items || [])]
    currentItems.splice(index, 1)
    await updateSetting(key, currentItems)
  }

  const handleEditItem = (key, index, value) => {
    setEditModal({ open: true, key, index, value })
  }

  const handleAddModel = async () => {
    const text = newModelText.trim()
    if (!text || !selectedModelBrand) return
    const currentModels = { ...(settings.models || {}) }
    const brandModels = [...(currentModels[selectedModelBrand] || [])]
    brandModels.push(text)
    currentModels[selectedModelBrand] = brandModels
    await updateSetting('models', currentModels)
    setNewModelText('')
  }

  const handleDeleteModel = async (brand, index) => {
    const currentModels = { ...(settings.models || {}) }
    const brandModels = [...(currentModels[brand] || [])]
    brandModels.splice(index, 1)
    currentModels[brand] = brandModels
    await updateSetting('models', currentModels)
  }

  const handleEditModel = (brand, index, value) => {
    setEditModal({ open: true, key: 'models', brand, index, value })
  }

  const handleSaveEdit = async () => {
    const trimmed = editModal.value?.trim()
    if (!trimmed) return
    if (editModal.key === 'models') {
      const currentModels = { ...(settings.models || {}) }
      const brandModels = [...(currentModels[editModal.brand] || [])]
      brandModels[editModal.index] = trimmed
      currentModels[editModal.brand] = brandModels
      await updateSetting('models', currentModels)
    } else {
      const currentItems = [...(settings[editModal.key]?.items || [])]
      currentItems[editModal.index] = trimmed
      await updateSetting(editModal.key, currentItems)
    }
    setEditModal({ open: false, key: '', index: -1, value: '' })
  }

  const handleRefreshCache = async () => {
    setRefreshing(true)
    try {
      await clearCache()
      // Success feedback
      setTimeout(() => {
        setRefreshing(false)
      }, 800)
    } catch (error) {
      console.error(error)
      setRefreshing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
        <button onClick={() => navigate(-1)} className="text-[#002395] p-1">
          <i className="fas fa-arrow-left text-lg"></i>
        </button>
        <h1 className="text-lg font-bold text-[#0f172a] flex-1">Settings</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {sections.map(section => (
          <div key={section.key} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wide border-l-4 pl-3" style={{ color: section.color, borderColor: section.color }}>
                <i className={`fas ${section.icon} mr-2`}></i>
                {section.label}
              </p>
              <span className="text-xs text-gray-400">{settings[section.key]?.items?.length || 0} items</span>
            </div>

            <div className="space-y-2 mb-3">
              {settings[section.key]?.items?.map((item, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <span className="flex-1 text-sm text-[#0f172a]">{item}</span>
                  <button onClick={() => handleEditItem(section.key, index, item)} className="text-[#002395] p-1">
                    <i className="fas fa-edit text-xs"></i>
                  </button>
                  <button onClick={() => handleDeleteItem(section.key, index)} className="text-[#ED2939] p-1">
                    <i className="fas fa-times text-xs"></i>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={`Add new ${section.label.toLowerCase()} item...`}
                value={newItemText[section.key] || ''}
                onChange={e => setNewItemText(prev => ({ ...prev, [section.key]: e.target.value }))}
                onKeyPress={e => e.key === 'Enter' && handleAddItem(section.key)}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#002395]"
              />
              <button onClick={() => handleAddItem(section.key)} className="bg-[#002395] text-white rounded-xl px-4 py-2 text-sm font-semibold">
                Add
              </button>
            </div>
          </div>
        ))}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-3 border-l-4 border-purple-700 pl-3">
            <i className="fas fa-list mr-2"></i>Mobile Models
          </p>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Brand</label>
            <select
              value={selectedModelBrand}
              onChange={e => setSelectedModelBrand(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#002395] bg-white"
            >
              <option value="">Select brand to manage models</option>
              {(settings.brands?.items || []).map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {selectedModelBrand && (
            <>
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {(settings.models?.[selectedModelBrand] || []).map((model, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                    <span className="flex-1 text-sm text-[#0f172a]">{model}</span>
                    <button
                      onClick={() => handleEditModel(selectedModelBrand, index, model)}
                      className="text-[#002395] p-1"
                    >
                      <i className="fas fa-edit text-xs"></i>
                    </button>
                    <button
                      onClick={() => handleDeleteModel(selectedModelBrand, index)}
                      className="text-[#ED2939] p-1"
                    >
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  </div>
                ))}
                {(settings.models?.[selectedModelBrand] || []).length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-3">No models added yet</p>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Add model for ${selectedModelBrand}...`}
                  value={newModelText}
                  onChange={e => setNewModelText(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddModel()}
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#002395]"
                />
                <button
                  onClick={handleAddModel}
                  className="bg-[#002395] text-white rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Add
                </button>
              </div>
            </>
          )}
        </div>

        <button 
          onClick={handleRefreshCache} 
          disabled={refreshing}
          className={`w-full bg-white border border-gray-200 text-gray-500 rounded-2xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${refreshing ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
        >
          <i className={`fas ${refreshing ? 'fa-sync animate-spin text-[#002395]' : 'fa-sync'}`}></i>
          {refreshing ? 'Refreshing Cache...' : 'Refresh Settings Cache'}
        </button>
      </div>

      {editModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center">
          <div className="bg-white w-full md:max-w-lg md:mx-auto rounded-t-3xl md:rounded-2xl flex flex-col max-h-[90vh]">
            <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>
            <div className="flex-shrink-0 px-4 pt-3 pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#0f172a]">Edit Item</h2>
                <button onClick={() => setEditModal({ open: false })} className="text-gray-400 p-1">
                  <i className="fas fa-times text-lg"></i>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <input
                type="text"
                value={editModal.value}
                onChange={e => setEditModal(prev => ({ ...prev, value: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#002395]"
              />
            </div>
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 flex gap-3">
              <button onClick={() => setEditModal({ open: false })} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-semibold">
                Cancel
              </button>
              <button onClick={handleSaveEdit} className="flex-1 bg-[#002395] text-white rounded-xl py-2.5 text-sm font-semibold">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsPage
