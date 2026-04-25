'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { Quest } from '@/lib/types/quest';
import { QuestCard } from '@/components/quest/QuestCard';

interface QuestCarouselProps {
  quests: Quest[];
  onQuestClick?: (quest: Quest) => void;
}

export function QuestCarousel({ quests, onQuestClick }: QuestCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeDot, setActiveDot] = useState(0);

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);

  const syncState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < maxScroll - 2);

    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth + 16 
      : 300;
    setActiveDot(Math.round(el.scrollLeft / cardWidth));
  }, []);

  useEffect(() => {
    syncState();
    window.addEventListener('resize', syncState);
    return () => window.removeEventListener('resize', syncState);
  }, [quests, syncState]);

  const scrollBy = (dir: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth =
      (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 300;
    el.scrollBy({ left: dir === 'right' ? cardWidth + 16 : -(cardWidth + 16), behavior: 'smooth' });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.pageX - (trackRef.current?.offsetLeft ?? 0);
    dragScrollLeft.current = trackRef.current?.scrollLeft ?? 0;
    trackRef.current?.classList.add('carousel-track--grabbing');
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !trackRef.current) return;
    e.preventDefault();
    const x = e.pageX - trackRef.current.offsetLeft;
    trackRef.current.scrollLeft = dragScrollLeft.current - (x - dragStartX.current);
  };

  const stopDrag = () => {
    isDragging.current = false;
    trackRef.current?.classList.remove('carousel-track--grabbing');
  };

 
  const touchStartX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) scrollBy(delta > 0 ? 'right' : 'left');
  };

  if (quests.length === 0) {
    return (
      <div className="carousel-empty">
        <p>No quests match this filter.</p>
      </div>
    );
  }

  return (
    <div className="carousel-root">
      <button
        aria-label="Scroll left"
        disabled={!canScrollLeft}
        onClick={() => scrollBy('left')}
        className="carousel-arrow carousel-arrow--left"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        ref={trackRef}
        className="carousel-track"
        onScroll={syncState}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {quests.map((quest) => (
          <div key={quest.id} className="carousel-item">
            <QuestCard quest={quest} onClick={onQuestClick} />
          </div>
        ))}
      </div>

      <button
        aria-label="Scroll right"
        disabled={!canScrollRight}
        onClick={() => scrollBy('right')}
        className="carousel-arrow carousel-arrow--right"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="carousel-dots" aria-hidden="true">
        {quests.map((_, i) => (
          <span
            key={i}
            className={`carousel-dot ${i === activeDot ? 'carousel-dot--active' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}