import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatWidget from './ChatWidget';
import { chatWithPortfolio, getSuggestions } from '../../services/chatApi';

vi.mock('../../services/chatApi', () => ({
  chatWithPortfolio: vi.fn(),
  getSuggestions: vi.fn(),
}));

describe('ChatWidget accessibility interactions', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    getSuggestions.mockResolvedValue({ suggestions: [] });
    chatWithPortfolio.mockResolvedValue({ reply: 'Here is the answer.' });
  });

  it('moves focus into the message input when opened', () => {
    render(<ChatWidget />);

    fireEvent.click(screen.getByRole('button', { name: /ask ai assistant/i }));

    expect(screen.getByLabelText(/message portfolio assistant/i)).toHaveFocus();
  });

  it('closes with Escape and returns focus to the trigger', () => {
    render(<ChatWidget />);
    const trigger = screen.getByRole('button', { name: /ask ai assistant/i });

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('region', { name: /portfolio assistant chat panel/i }), {
      key: 'Escape',
    });

    expect(screen.queryByRole('region', { name: /portfolio assistant chat panel/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask ai assistant/i })).toHaveFocus();
  });

  it('scrolls to the latest message when new messages are added', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(<ChatWidget />);

    fireEvent.click(screen.getByRole('button', { name: /ask ai assistant/i }));
    fireEvent.change(screen.getByLabelText(/message portfolio assistant/i), {
      target: { value: 'What projects stand out?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await screen.findByText('Here is the answer.');

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled();
    });
  });
});
