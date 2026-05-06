'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { useIntersectionObserver } from '@/lib/hooks/useIntersectionObserver';

interface LazyLoadProps {
  children: ReactNode;
  placeholder?: ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
}

const LazyLoad: React.FC<LazyLoadProps> = ({
  children,
  placeholder = (
    <div className="min-h-[100px] w-full animate-pulse bg-gray-200 rounded-lg" />
  ),
  threshold = 0.1,
  rootMargin = '50px',
  className = '',
}) => {
  const [setElement, entry] = useIntersectionObserver({
    threshold,
    rootMargin,
    freezeOnceVisible: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const isVisible = !!entry?.isIntersecting;

  useEffect(() => {
    if (isVisible) {
      setIsLoading(false);
    }
  }, [isVisible]);

  return (
    <div ref={setElement} className={className}>
      {!isVisible && isLoading ? placeholder : children}
    </div>
  );
};

export default LazyLoad;
