import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '../types/profile';

export function useProfileSave() {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const save = async (userId: string, profile: Profile): Promise<boolean> => {
    setSaving(true);
    setStatus(null);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          ...profile,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      setStatus({
        type: 'success',
        message: 'Profile saved successfully!'
      });
      
      return true;
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setStatus({
        type: 'error',
        message: err.message || 'Failed to save profile'
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file: File, userId: string, bucket: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err: any) {
      console.error('Error uploading image:', err);
      return null;
    }
  };

  return {
    save,
    saving,
    status,
    uploadImage
  };
}
