import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { DeferHydration } from './DeferHydration';

type IOEntry = { isIntersecting: boolean; target: Element };

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  private callback: (entries: IOEntry[]) => void;
  private element: Element | null = null;

  constructor(callback: (entries: IOEntry[]) => void) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe(element: Element) {
    this.element = element;
  }

  disconnect() {}

  trigger(isIntersecting: boolean) {
    if (this.element) {
      this.callback([{ isIntersecting, target: this.element }]);
    }
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  MockIntersectionObserver.instances = [];
});

describe('DeferHydration', () => {
  it('shows the placeholder until the widget scrolls into view, then mounts it', () => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    render(
      <DeferHydration placeholder={<div>loading widget</div>}>
        <button>Interactive Widget</button>
      </DeferHydration>
    );

    expect(screen.getByText('loading widget')).toBeInTheDocument();
    expect(screen.queryByText('Interactive Widget')).not.toBeInTheDocument();

    act(() => {
      MockIntersectionObserver.instances[0].trigger(true);
    });

    expect(screen.getByText('Interactive Widget')).toBeInTheDocument();
    expect(screen.queryByText('loading widget')).not.toBeInTheDocument();
  });

  it('falls back to rendering children when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    render(
      <DeferHydration placeholder={<div>loading widget</div>}>
        <button>Interactive Widget</button>
      </DeferHydration>
    );

    expect(screen.getByText('Interactive Widget')).toBeInTheDocument();
  });
});
