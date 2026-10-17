import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: ({
    alt,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { alt?: string }) => (
    <div data-testid="mock-image" data-alt={alt} {...props} />
  ),
}));

import OptimizedImage from './OptimizedImage';

describe('OptimizedImage', () => {
  it('reserves space with an intrinsic aspect ratio when width and height are provided', () => {
    const { container } = render(
      <OptimizedImage
        src="/hero.png"
        alt="Hero image"
        width={400}
        height={300}
      />
    );

    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper.getAttribute('style')).toContain('aspect-ratio: 400 / 300');
    expect(screen.getByTestId('mock-image')).toHaveAttribute(
      'data-alt',
      'Hero image'
    );
  });
});
