// app/communities/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';

const AddCircleForm = dynamic(() => import('@/components/AddCircleForm'), { ssr: false });

type Community = {
  id: string;
  title: string;
  category: string | null;
  zip: string | null;
  about: string | null;
  created_at: string;
  photo_url: string | null;
};

type Circle = {
  id: string;
  community_id: string | null;
  name: string | null;
  lat: number;
  lng: number;
  address: string | null;
  created_at: string;
};

type Service = {
  id: string;
  circle_id: string;
  category: string;
  schedule_text: string;
};

export default function CommunityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const communityId = params.id;

  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'discussion' | 'happening' | 'about' | 'circles'>('discussion');

  const [showAdd, setShowAdd] = useState(false);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [servicesByCircle, setServicesByCircle] = useState<Record<string, Service[]>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .single();

      if (!alive) return;
      if (error) {
        console.error(error);
        router.push('/communities');
        return;
      }
      setCommunity(data as Community);

      const { data: cData, error: cErr } = await supabase
        .from('community_circles')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });

      if (!alive) return;
      if (cErr) console.error(cErr);

      const list = (cData || []) as Circle[];
      setCircles(list);

      if (list.length) {
        const ids = list.map(c => c.id);
        const { data: sData, error: sErr } = await supabase
          .from('circle_services')
          .select('*')
          .in('circle_id', ids)
          .order('created_at', { ascending: true });

        if (sErr) console.error(sErr);

        const map: Record<string, Service[]> = {};
        (sData || []).forEach((s: any) => {
          (map[s.circle_id] ||= []).push(s as Service);
        });
        setServicesByCircle(map);
      } else {
        setServicesByCircle({});
      }

      setLoading(false);
    })();

    return () => { alive = false; };
  }, [communityId, router]);

  const created = useMemo(
    () => (community ? format(new Date(community.created_at), 'MMM d, yyyy') : ''),
    [community]
  );

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="page">
          <div className="container-app">Loading…</div>
        </div>
      </div>
    );
  }

  if (!community) return null;

  return (
    <div className="page-wrap">
      <div className="page">
        <div className="container-app">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button className="btn" onClick={() => router.push('/communities')}>Back</button>
            <span className="muted">Created {created}</span>
          </div>

          {/* Cover */}
          {community.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={community.photo_url}
              alt=""
              className="w-full h-auto rounded-xl mb-3"
              style={{ maxBlockSize: 360, objectFit: 'cover' }}
            />
          ) : null}

          <h1 className="page-title">{community.title}</h1>
          <div className="muted mb-4">
            {community.category || 'General'} · {community.zip || '—'}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-3">
            <button onClick={() => setTab('discussion')} className={`btn ${tab === 'discussion' ? 'btn-active' : ''}`}>Discussion</button>
            <button onClick={() => setTab('happening')} className={`btn ${tab === 'happening' ? 'btn-active' : ''}`}>What’s happening</button>
            <button onClick={() => setTab('about')} className={`btn ${tab === 'about' ? 'btn-active' : ''}`}>About</button>
            <button onClick={() => setTab('circles')} className={`btn ${tab === 'circles' ? 'btn-active' : ''}`}>Drum Circles</button>
          </div>

          {/* Panels */}
          <section className="card p-4">
            {tab === 'discussion' && (
              <>
                <h3 className="h3 mb-2">Discussion</h3>
                <p className="muted">Threaded discussions coming soon.</p>
              </>
            )}

            {tab === 'happening' && (
              <>
                <h3 className="h3 mb-2">What’s happening</h3>
                <p className="muted">Calendar view will live here.</p>
              </>
            )}

            {tab === 'about' && (
              <>
                <h3 className="h3 mb-2">About</h3>
                <p>{community.about || 'No description yet.'}</p>
              </>
            )}

            {tab === 'circles' && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="h3">Drum Circles</h3>
                  <button className="btn btn-brand" onClick={() => setShowAdd(true)}>Add pin</button>
                </div>

                {circles.length === 0 ? (
                  <p className="muted">No circles yet. Be the first to add one!</p>
                ) : (
                  <ul className="space-y-2">
                    {circles.map((c) => (
                      <li key={c.id} className="border rounded-lg p-3">
                        <div className="font-medium">
                          {c.name || 'Untitled pin'}{' '}
                          <span className="muted">
                            {c.address ? `· ${c.address}` : `(${c.lat.toFixed(4)}, ${c.lng.toFixed(4)})`}
                          </span>
                        </div>
                        <div className="muted">Added {format(new Date(c.created_at), 'MMM d, yyyy')}</div>

                        {(servicesByCircle[c.id] || []).length > 0 && (
                          <div style={{ marginTop: 6 }}>
                            <div className="label" style={{ marginBottom: 4 }}>Services</div>
                            <ul className="muted">
                              {servicesByCircle[c.id].map(s => (
                                <li key={s.id}>• <strong>{s.category}</strong>: {s.schedule_text}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {showAdd && (
        <div className="modal-backdrop">
          <div className="modal-sheet">
            <AddCircleForm
              communityId={community.id}
              zip={community.zip}
              onClose={() => setShowAdd(false)}
              onSaved={async () => {
                // refresh both circles + services
                const { data: cData } = await supabase
                  .from('community_circles')
                  .select('*')
                  .eq('community_id', communityId)
                  .order('created_at', { ascending: false });
                const list = (cData || []) as Circle[];
                setCircles(list);

                if (list.length) {
                  const ids = list.map(c => c.id);
                  const { data: sData } = await supabase
                    .from('circle_services')
                    .select('*')
                    .in('circle_id', ids)
                    .order('created_at', { ascending: true });
                  const map: Record<string, Service[]> = {};
                  (sData || []).forEach((s: any) => (map[s.circle_id] ||= []).push(s as Service));
                  setServicesByCircle(map);
                } else {
                  setServicesByCircle({});
                }

                setShowAdd(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
