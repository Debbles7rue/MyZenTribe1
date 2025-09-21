// ADD these changes to your existing lib/eventManager.ts file
// DO NOT REPLACE THE WHOLE FILE - just add/modify these specific parts

// 1. UPDATE the EventForm interface (add these fields to the existing interface):
export interface EventForm {
  // ... all your existing fields stay the same ...
  
  // ADD these new fields:
  pre_event?: {
    title: string;
    time: string;
    location?: string;
  };
  post_event?: {
    title: string;
    time: string;
    location?: string;
  };
  cover_photo?: string;
}

// 2. UPDATE the createEvent function payload (add these lines to the existing payload object):
export async function createEvent(
  event: Partial<EventForm>, 
  userId: string,
  context: 'calendar' | 'business' | 'community' = 'calendar'
): Promise<{ data?: DBEvent; error?: Error }> {
  try {
    // ... existing validation stays the same ...

    const payload: any = {
      // ... all your existing fields stay the same ...
      
      // ADD these new fields to the payload:
      pre_event: event.pre_event && event.pre_event.title ? event.pre_event : null,
      post_event: event.post_event && event.post_event.title ? event.post_event : null,
      cover_photo: event.cover_photo || null,
    };

    // ... rest of the function stays the same ...
  }
}

// 3. UPDATE the updateEvent function (add these fields to the updates processing):
export async function updateEvent(
  eventId: string,
  updates: Partial<EventForm>,
  userId: string
): Promise<{ data?: DBEvent; error?: Error }> {
  try {
    const payload: any = {};
    
    // ... existing field processing stays the same ...
    
    // ADD these new field handlers:
    if ('pre_event' in updates) {
      payload.pre_event = updates.pre_event && updates.pre_event.title ? updates.pre_event : null;
    }
    if ('post_event' in updates) {
      payload.post_event = updates.post_event && updates.post_event.title ? updates.post_event : null;
    }
    if ('cover_photo' in updates) {
      payload.cover_photo = updates.cover_photo || null;
    }
    
    // ... rest of the function stays the same ...
  }
}

// 4. ADD this new helper function for displaying pre/post events:
export function formatPrePostEvent(event: any) {
  const items = [];
  
  if (event.pre_event) {
    items.push({
      type: 'pre',
      title: event.pre_event.title,
      time: new Date(event.pre_event.time),
      location: event.pre_event.location,
      badge: '🍽️ Pre-Event'
    });
  }
  
  items.push({
    type: 'main',
    title: event.title,
    time: new Date(event.start_time),
    endTime: event.end_time ? new Date(event.end_time) : null,
    location: event.location,
    badge: '📅 Main Event'
  });
  
  if (event.post_event) {
    items.push({
      type: 'post', 
      title: event.post_event.title,
      time: new Date(event.post_event.time),
      location: event.post_event.location,
      badge: '🍻 Post-Event'
    });
  }
  
  return items;
}

// 5. UPDATE the DBEvent type in lib/types.ts to include:
export interface DBEvent {
  // ... all existing fields ...
  
  // ADD these:
  pre_event?: {
    title: string;
    time: string;
    location?: string;
  } | null;
  post_event?: {
    title: string;
    time: string;
    location?: string;
  } | null;
  cover_photo?: string | null;
}
