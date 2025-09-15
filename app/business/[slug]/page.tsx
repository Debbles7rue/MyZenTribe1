// app/business/[slug]/page.tsx (renamed from [handle])
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
// ... rest of the file stays the same

export default function BusinessPublicPage() {
  const params = useParams();
  const slug = params?.slug as string; // Changed from handle to slug
  
  // ... rest stays the same, but use 'slug' variable
  
  useEffect(() => {
    async function load() {
      // Clean the slug (remove @ if present)
      const cleanSlug = slug?.replace('@', '');
      
      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('handle', cleanSlug) // Still querying by 'handle' field in DB
        .eq('visibility', 'public')
        .single();
      
      // ... rest of the code
    }
    load();
  }, [slug]); // Changed dependency
  
  // ... rest of the component
}
