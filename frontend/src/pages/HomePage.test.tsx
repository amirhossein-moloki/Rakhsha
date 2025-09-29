import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';
import useAuthStore from '@/store/authStore';
import useSocket from '@/hooks/useSocket';

// Mock child components and hooks
vi.mock('@/components/layout/MainLayout', () => ({
  default: ({ sidebar, children }) => (
    <div>
      <div data-testid="sidebar">{sidebar}</div>
      <div>{children}</div>
    </div>
  ),
}));
vi.mock('@/components/conversations/ConversationList', () => ({
  default: ({ onSelectConversation }) => (
    <div data-testid="conversation-list">
      <button onClick={() => onSelectConversation('conv1')}>Select Conv1</button>
    </div>
  ),
}));
vi.mock('@/components/conversations/MessageView', () => ({
  default: ({ conversationId }) => <div data-testid="message-view">MessageView for {conversationId}</div>,
}));
vi.mock('@/components/conversations/MessageInput', () => ({
  default: ({ conversationId }) => <div data-testid="message-input">MessageInput for {conversationId}</div>,
}));
vi.mock('@/hooks/useSocket');
vi.mock('@/store/authStore');

describe('HomePage', () => {
  const mockUser = { _id: 'user1', username: 'testuser' };
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
    });
    vi.mocked(useSocket).mockImplementation(() => {});
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
  };

  it('should render welcome message, settings link, and logout button', () => {
    renderComponent();
    expect(screen.getByText(`Welcome, ${mockUser.username}`)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('should show "Select a conversation" message initially', () => {
    renderComponent();
    expect(screen.getByText('Select a conversation to start messaging')).toBeInTheDocument();
    expect(screen.queryByTestId('message-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('message-input')).not.toBeInTheDocument();
  });

  it('should show MessageView and MessageInput when a conversation is selected', () => {
    renderComponent();

    // Simulate selecting a conversation from the list
    const selectButton = screen.getByRole('button', { name: /select conv1/i });
    fireEvent.click(selectButton);

    // Assert that the correct components are now rendered
    expect(screen.getByTestId('message-view')).toHaveTextContent('MessageView for conv1');
    expect(screen.getByTestId('message-input')).toHaveTextContent('MessageInput for conv1');
    expect(screen.queryByText('Select a conversation to start messaging')).not.toBeInTheDocument();
  });

  it('should call logout function when logout button is clicked', () => {
    renderComponent();
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});