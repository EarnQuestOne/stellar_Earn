import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuestDifficulty, QuestStatus, type Quest } from '@/lib/types/quest';
import { QuestCard } from './QuestCard';

vi.mock('@/components/ui/OptimizedImage', () => ({
  default: ({
    alt,
    src,
    width,
    height,
    className,
  }: {
    alt?: string;
    src?: string;
    width?: number;
    height?: number;
    className?: string;
  }) => (
    <img
      data-testid="mock-opt-image"
      alt={alt}
      src={src}
      width={width}
      height={height}
      className={className}
    />
  ),
}));

const baseQuest = (overrides: Partial<Quest> = {}): Quest => ({
  id: 'quest-1',
  contractQuestId: 'quest-1',
  title: 'Deploy a smart contract',
  description: 'Ship a Soroban contract to testnet.',
  category: 'Backend',
  difficulty: QuestDifficulty.MEDIUM,
  rewardAmount: '100',
  rewardAsset: 'XLM',
  xpReward: 50,
  status: QuestStatus.ACTIVE,
  verifierAddress: 'GTEST000000000000000000000000000000000000',
  requirements: [],
  maxParticipants: 5,
  currentParticipants: 1,
  totalClaims: 0,
  totalSubmissions: 0,
  approvedSubmissions: 0,
  rejectedSubmissions: 0,
  creator: { id: 'creator', name: 'Satoshi' },
  skills: ['Rust'],
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
  ...overrides,
});

describe('QuestCard image alt text (alt text on quest images)', () => {
  it('renders the creator avatar with descriptive, non-empty alt text', () => {
    render(
      <QuestCard
        quest={baseQuest({
          creator: {
            id: 'creator',
            name: 'Satoshi',
            avatarUrl: 'https://example.com/satoshi.png',
          },
        })}
      />
    );

    const avatar = screen.getByTestId('mock-opt-image');
    expect(avatar).toHaveAttribute('alt', 'Satoshi avatar');
    expect(avatar.getAttribute('alt')).not.toBe('');
    expect(avatar).not.toHaveAttribute('aria-hidden');
  });

  it('does not render empty alt text anywhere in the card', () => {
    const { container } = render(
      <QuestCard
        quest={baseQuest({
          creator: {
            id: 'creator',
            name: 'Satoshi',
            avatarUrl: 'https://example.com/satoshi.png',
          },
        })}
      />
    );

    const images = Array.from(container.querySelectorAll('[alt]'));
    expect(images.length).toBeGreaterThan(0);
    for (const img of images) {
      expect(img.getAttribute('alt')).not.toBe('');
    }
    expect(container.querySelector('[alt=""]')).toBeNull();
  });

  it('falls back to initials when the creator has no avatar image', () => {
    render(<QuestCard quest={baseQuest()} />);

    expect(
      screen.getAllByText((text) => text.trim() === 'Satoshi').length
    ).toBeGreaterThan(0);
  });
});