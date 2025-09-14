// app/profile/hooks/useIsDesktop.ts
import { useState, useEffect } from 'react';

export function useIsDesktop(minWidth = 1024) {
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const mq = window.matchMedia(`(min-width:${minWidth}px)`);
    const update = () => setIsDesktop(mq.matches);
    
    update();
    mq.addEventListener("change", update);
    
    return () => mq.removeEventListener("change", update);
  }, [minWidth]);
  
  return isDesktop;
}
