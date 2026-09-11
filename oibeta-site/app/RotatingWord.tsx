'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const WORDS = [
  'Aprimora',
  'Impulsiona',
  'Fortalece',
  'Otimiza',
  'Potencializa',
  'Agiliza',
] as const;

const CHANGE_INTERVAL = 2400;

export default function RotatingWord() {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  const word = WORDS[index];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % WORDS.length);
    }, CHANGE_INTERVAL);

    return () => window.clearInterval(timer);
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;

    if (!container || !measure) return;

    const updateWidth = () => {
      const width = Math.ceil(measure.getBoundingClientRect().width);
      container.style.setProperty('--rotating-word-width', `${width}px`);
    };

    updateWidth();

    if (document.fonts?.ready) {
      void document.fonts.ready.then(updateWidth);
    }
  }, [word]);

  return (
    <span ref={containerRef} className="rotating-word" aria-live="polite">
      <span key={word} className="rotating-word-visible">
        {word}
      </span>
      <span ref={measureRef} className="rotating-word-measure" aria-hidden="true">
        {word}
      </span>
    </span>
  );
}
