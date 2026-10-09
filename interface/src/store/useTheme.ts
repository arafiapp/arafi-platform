import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light', // Default theme set to light
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'theme-storage-v2', // Key updated to migrate to light mode default
    }
  )
)