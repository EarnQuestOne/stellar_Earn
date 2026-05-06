'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { cn } from '@/lib/utils/cn';

interface OptimizedImageProps extends Omit<ImageProps, 'onLoadingComplete'> {
  containerClassName?: string;
  fallbackSrc?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  containerClassName,
  fallbackSrc = '/placeholder-image.png',
  ...props
}) => {
  const [isLoading, setLoading] = useState(true);
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gray-100 dark:bg-gray-800',
        isLoading ? 'animate-pulse' : '',
        containerClassName
      )}
    >
      <Image
        {...props}
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          'duration-700 ease-in-out',
          isLoading
            ? 'scale-110 blur-2xl grayscale'
            : 'scale-100 blur-0 grayscale-0',
          className
        )}
        onLoad={() => setLoading(false)}
        onError={() => setImgSrc(fallbackSrc)}
        loading={props.priority ? 'eager' : 'lazy'}
      />
    </div>
  );
};

export default OptimizedImage;
