'use client';

import { useEffect } from 'react';

export function useLoadingScreen() {
  useEffect(() => {
    const hideLoader = () => {
      const loader = document.getElementById('initial-loader');
      const content = document.getElementById('app-content');

      if (loader && content) {
        content.style.transition = 'opacity 0.5s ease-in';
        content.style.opacity = '1';

        setTimeout(() => {
          loader.classList.add('hidden');
          setTimeout(() => loader.remove(), 500);
        }, 200);
      }
    };

    const timer = setTimeout(hideLoader, 100);
    return () => clearTimeout(timer);
  }, []);
}
