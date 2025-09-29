import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from './SettingsPage';
import useAuthStore from '@/store/authStore';
import api from '@/api/axios';

// Mock dependencies
vi.mock('@/store/authStore');
vi.mock('@/api/axios');

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      token: 'fake-token',
    });
    window.alert = vi.fn(); // Mock window.alert
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );
  };

  it('should render the settings form correctly', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /set secondary password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/secondary password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /set password/i })).toBeInTheDocument();
  });

  it('should show validation error for short password', async () => {
    renderComponent();
    const passwordInput = screen.getByLabelText(/secondary password/i);
    const submitButton = screen.getByRole('button', { name: /set password/i });

    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Zod's default message might be "String must contain at least 8 character(s)"
      expect(screen.getByText(/must contain at least 8/i)).toBeInTheDocument();
    });

    expect(api.post).not.toHaveBeenCalled();
  });

  it('should call api on successful form submission', async () => {
    const mockApiPost = vi.mocked(api.post).mockResolvedValue({});
    renderComponent();

    const passwordInput = screen.getByLabelText(/secondary password/i);
    const submitButton = screen.getByRole('button', { name: /set password/i });
    const validPassword = 'password123';

    fireEvent.change(passwordInput, { target: { value: validPassword } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        '/users/secondary-password',
        { secondaryPassword: validPassword },
        { headers: { Authorization: `Bearer fake-token` } }
      );
      expect(window.alert).toHaveBeenCalledWith('Secondary password set successfully!');
    });
  });

  it('should show alert on api failure', async () => {
    const mockApiPost = vi.mocked(api.post).mockRejectedValue(new Error('API Error'));
    renderComponent();

    const passwordInput = screen.getByLabelText(/secondary password/i);
    const submitButton = screen.getByRole('button', { name: /set password/i });
    const validPassword = 'password123';

    fireEvent.change(passwordInput, { target: { value: validPassword } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith('Failed to set secondary password.');
    });
  });
});