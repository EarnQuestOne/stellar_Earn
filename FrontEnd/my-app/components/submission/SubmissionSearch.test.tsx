import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SubmissionSearch } from './SubmissionSearch';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SubmissionSearch', () => {
  it('renders the search input with the default placeholder', () => {
    render(<SubmissionSearch onSearch={vi.fn()} />);

    expect(
      screen.getByPlaceholderText(/search by quest or submission id/i)
    ).toBeInTheDocument();
  });

  it('renders a custom placeholder when provided', () => {
    render(
      <SubmissionSearch onSearch={vi.fn()} placeholder="Find quests..." />
    );

    expect(screen.getByPlaceholderText('Find quests...')).toBeInTheDocument();
  });

  it('has an accessible label on the input', () => {
    render(<SubmissionSearch onSearch={vi.fn()} />);

    expect(screen.getByLabelText('Search submissions')).toBeInTheDocument();
  });

  it('debounces the onSearch callback', () => {
    const onSearch = vi.fn();
    render(<SubmissionSearch onSearch={onSearch} debounceMs={300} />);

    const input = screen.getByPlaceholderText(/search by quest/i);
    fireEvent.change(input, { target: { value: 'test' } });

    expect(onSearch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('test');
  });

  it('calls onSearch immediately on form submit', () => {
    const onSearch = vi.fn();
    render(<SubmissionSearch onSearch={onSearch} />);

    const input = screen.getByPlaceholderText(/search by quest/i);
    fireEvent.change(input, { target: { value: 'hello' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    fireEvent.submit(input.closest('form')!);

    expect(onSearch).toHaveBeenCalledWith('hello');
  });

  it('does not show no-results state when resultCount is null', () => {
    render(<SubmissionSearch onSearch={vi.fn()} resultCount={null} />);

    const input = screen.getByPlaceholderText(/search by quest/i);
    fireEvent.change(input, { target: { value: 'zzz' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByText('No submissions found')).not.toBeInTheDocument();
  });

  it('does not show no-results state when resultCount is greater than 0', () => {
    render(<SubmissionSearch onSearch={vi.fn()} resultCount={3} />);

    const input = screen.getByPlaceholderText(/search by quest/i);
    fireEvent.change(input, { target: { value: 'quest' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByText('No submissions found')).not.toBeInTheDocument();
  });

  it('does not show no-results state when isLoading is true', () => {
    render(
      <SubmissionSearch onSearch={vi.fn()} resultCount={0} isLoading={true} />
    );

    const input = screen.getByPlaceholderText(/search by quest/i);
    fireEvent.change(input, { target: { value: 'zzz' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByText('No submissions found')).not.toBeInTheDocument();
  });

  it('does not show no-results state when query is empty', () => {
    render(<SubmissionSearch onSearch={vi.fn()} resultCount={0} />);

    expect(screen.queryByText('No submissions found')).not.toBeInTheDocument();
  });

  it('shows the no-results state when query is non-empty, resultCount is 0, and not loading', () => {
    render(
      <SubmissionSearch onSearch={vi.fn()} resultCount={0} isLoading={false} />
    );

    const input = screen.getByPlaceholderText(/search by quest/i);
    fireEvent.change(input, { target: { value: 'zzz-no-match' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('No submissions found')).toBeInTheDocument();
    expect(
      screen.getByText('Try adjusting your search or filter criteria.')
    ).toBeInTheDocument();
  });

  it('renders custom no-results title and description', () => {
    render(
      <SubmissionSearch
        onSearch={vi.fn()}
        resultCount={0}
        noResultsTitle="Nothing here"
        noResultsDescription="Try something else"
      />
    );

    const input = screen.getByPlaceholderText(/search by quest/i);
    fireEvent.change(input, { target: { value: 'zzz' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Try something else')).toBeInTheDocument();
  });

  it('hides no-results state when query is cleared', () => {
    render(<SubmissionSearch onSearch={vi.fn()} resultCount={0} />);

    const input = screen.getByPlaceholderText(/search by quest/i);
    fireEvent.change(input, { target: { value: 'zzz' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('No submissions found')).toBeInTheDocument();

    // Clear the query
    fireEvent.change(input, { target: { value: '' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByText('No submissions found')).not.toBeInTheDocument();
  });
});
