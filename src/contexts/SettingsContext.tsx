import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Setting {
  key: string;
  value: string;
  category: string;
  description?: string;
}

interface SettingsContextType {
  settings: Record<string, string>;
  loading: boolean;
  getSetting: (key: string, defaultValue?: string) => string;
  updateSetting: (key: string, value: string) => Promise<void>;
  updateSettings: (settings: Record<string, string>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');

      if (error) {
        console.error('Error loading settings:', error);
        // Use safe defaults instead of crashing
        setSettings({});
        return;
      }

      const settingsMap: Record<string, string> = {};
      data?.forEach((setting: Setting) => {
        settingsMap[setting.key] = setting.value;
      });

      setSettings(settingsMap);
    } catch (error: any) {
      console.error('Error loading settings:', error);
      // Use safe defaults instead of crashing
      setSettings({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // Removed realtime subscription to prevent refresh loops
  }, []);

  const getSetting = (key: string, defaultValue: string = ''): string => {
    return settings[key] || defaultValue;
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const { error } = await supabase
        .from('site_settings')
        .update({ value })
        .eq('key', key);

      if (error) throw error;

      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error: any) {
      console.error('Error updating setting:', error);
      throw error;
    }
  };

  const updateSettings = async (newSettings: Record<string, string>) => {
    try {
      const updates = Object.entries(newSettings).map(([key, value]) => ({
        key,
        value,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('site_settings')
          .update({ value: update.value })
          .eq('key', update.key);

        if (error) throw error;
      }

      setSettings(prev => ({ ...prev, ...newSettings }));
    } catch (error: any) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  const refreshSettings = async () => {
    await loadSettings();
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        getSetting,
        updateSetting,
        updateSettings,
        refreshSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    // Return safe defaults instead of throwing
    return {
      settings: {},
      loading: false,
      getSetting: (key: string, defaultValue: string = '') => defaultValue,
      updateSetting: async () => {},
      updateSettings: async () => {},
      refreshSettings: async () => {},
    };
  }
  return context;
}
