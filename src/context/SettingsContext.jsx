import React, { createContext, useContext, useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/firebase'

const SettingsContext = createContext()

const CACHE_KEY = 'fm_settings_cache'
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

const DEFAULT_SETTINGS = {
  complaint_types: {
    items: [
      'Water locked mobile service',
      'Display replacement',
      'Battery replacement',
      'Battery & coil replacement',
      'Touch glass crack replacement',
      'Charging board replacement',
      'Charging pin fixing',
      'Speaker replacement',
      'Mike replacement service',
      'Motherboard EMMC work',
      'Power IC work',
      'General cleaning',
      'Power button strips replacement inner',
      'Power button strips replacement outer',
      'Volume strip replacement inner',
      'Volume strip replacement outer',
      'Ringer loud speaker replacement',
      'Middle frame replacement',
      'Full body panel Bezel',
      'Back door replacement',
      'Network complaint fix',
      'Tamper glass replacement',
      'Mobile pouch',
      'Watch battery replacement',
      'Watch charging issue or dead',
      'Bluetooth earphone battery replacement',
      'Bluetooth earphone charging issues or dead',
      'Other'
    ]
  },
  pre_delivery_checklist: {
    items: [
      'Front Camera (Clear dust)',
      'Rear Camera (Clear dust)',
      'Earpiece Speaker',
      'Microphone',
      'Loudspeaker',
      'Clean Speaker Filter',
      'Proximity Sensor',
      'Change New Filter if Needed & Possible',
      'Power Button',
      'Volume Buttons',
      'Display Clarity',
      'Mobile Data',
      'Bluetooth',
      'Wi-Fi',
      'Check & Clean Paste and Glue',
      'White Spots on Display',
      'Frame Bent Check (Replace if Needed)',
      'Got Approval from Customer for Additional Services'
    ]
  },
  brands: {
    items: [
      'Samsung', 'Apple', 'Xiaomi', 'Realme', 'OPPO',
      'Vivo', 'OnePlus', 'Nokia', 'Motorola', 'Tecno',
      'Infinix', 'IQOO', 'Nothing', 'Others'
    ]
  },
  accessories: {
    items: [
      'SIM Card',
      'Memory Card',
      'Back Cover',
      'Charger',
      'Earphones',
      'Box',
      'Cable',
      'Adapter',
      'Screen Guard',
      'Other'
    ]
  },
  models: {
    Samsung: ['Galaxy A52', 'Galaxy A53', 'Galaxy A54', 'Galaxy S21', 'Galaxy S22', 'Galaxy S23', 'Galaxy M32', 'Galaxy M33', 'Galaxy F13', 'Galaxy F14'],
    Apple: ['iPhone 11', 'iPhone 12', 'iPhone 12 Mini', 'iPhone 13', 'iPhone 13 Mini', 'iPhone 13 Pro', 'iPhone 14', 'iPhone 14 Pro', 'iPhone 15', 'iPhone 15 Pro'],
    Xiaomi: ['Redmi 10', 'Redmi 11', 'Redmi Note 11', 'Redmi Note 12', 'Poco X4', 'Poco X5', 'Poco M4', 'Poco M5'],
    Realme: ['Realme 9', 'Realme 10', 'Realme 11', 'Realme C30', 'Realme C33', 'Realme C55', 'Realme Narzo 50'],
    OPPO: ['OPPO A17', 'OPPO A57', 'OPPO A77', 'OPPO A96', 'OPPO Reno 8', 'OPPO Reno 10'],
    Vivo: ['Vivo Y16', 'Vivo Y22', 'Vivo Y35', 'Vivo T1', 'Vivo T2', 'Vivo V25', 'Vivo V27'],
    OnePlus: ['OnePlus Nord CE 2', 'OnePlus Nord CE 3', 'OnePlus Nord 3', 'OnePlus 11', 'OnePlus 11R'],
    Nokia: ['Nokia C21', 'Nokia C31', 'Nokia G21', 'Nokia G42'],
    Motorola: ['Moto G32', 'Moto G42', 'Moto G52', 'Moto G62', 'Moto G73', 'Moto Edge 40'],
    Tecno: ['Tecno Spark 10', 'Tecno Spark 20', 'Tecno Pop 7', 'Tecno Camon 20'],
    Infinix: ['Infinix Hot 20', 'Infinix Hot 30', 'Infinix Note 12', 'Infinix Note 30'],
    Others: []
  },
  ram_options: {
    items: ["1GB", "2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"]
  },
  rom_options: {
    items: ["8GB", "16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB"]
  }
}

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        const age = Date.now() - timestamp
        if (age < CACHE_EXPIRY_MS) {
          setSettings(data)
          setLoading(false)
          return
        }
      }

      const keys = ['complaint_types', 'pre_delivery_checklist', 'brands', 'accessories', 'models', 'ram_options', 'rom_options']
      const docs = await Promise.all(
        keys.map(key => getDoc(doc(db, 'settings', key)))
      )

      const newSettings = {}
      const missingKeys = []

      docs.forEach((docSnap, i) => {
        const key = keys[i]
        if (docSnap.exists()) {
          newSettings[key] = docSnap.data()
        } else {
          newSettings[key] = DEFAULT_SETTINGS[key]
          missingKeys.push(key)
        }
      })

      if (missingKeys.length > 0) {
        await Promise.all(
          missingKeys.map(key => setDoc(doc(db, 'settings', key), DEFAULT_SETTINGS[key]))
        )
      }

      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: newSettings,
        timestamp: Date.now()
      }))

      setSettings(newSettings)
    } catch (error) {
      console.error('Failed to load settings:', error)
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (key, items) => {
    try {
      if (key === 'models') {
        await setDoc(doc(db, 'settings', key), items)
      } else {
        await setDoc(doc(db, 'settings', key), { items })
      }
      const newSettings = { ...settings, [key]: key === 'models' ? items : { items } }
      setSettings(newSettings)
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: newSettings,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('Failed to update setting:', error)
      throw error
    }
  }

  const clearCache = async () => {
    localStorage.removeItem(CACHE_KEY)
    await loadSettings()
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        updateSetting,
        clearCache,
        complaintTypes: settings.complaint_types?.items || [],
        preDeliveryChecklist: settings.pre_delivery_checklist?.items || [],
        brands: settings.brands?.items || [],
        accessories: settings.accessories?.items || [],
        models: settings.models || {},
        ramOptions: settings.ram_options?.items || ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"],
        romOptions: settings.rom_options?.items || ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB"]
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
