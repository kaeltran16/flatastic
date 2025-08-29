import { LoginForm } from '@/components/login-form';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the Supabase client
const mockSignInWithOAuth = jest.fn();
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  })),
}));

// Mock the router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form with Google OAuth button', () => {
    render(<LoginForm />);

    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(
      screen.getByText(/sign in to your account using google/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /continue with google/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/terms of service and privacy policy/i)
    ).toBeInTheDocument();
  });

  it('shows Google OAuth button with correct styling', () => {
    render(<LoginForm />);

    const googleButton = screen.getByRole('button', {
      name: /continue with google/i,
    });
    expect(googleButton).toBeInTheDocument();
    expect(googleButton).toHaveClass(
      'bg-white',
      'hover:bg-gray-50',
      'text-gray-900'
    );
  });

  it('handles Google OAuth login successfully', async () => {
    const user = userEvent.setup();
    mockSignInWithOAuth.mockResolvedValue({ error: null });

    render(<LoginForm />);

    const googleButton = screen.getByRole('button', {
      name: /continue with google/i,
    });
    await user.click(googleButton);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('/auth/callback'),
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
    });
  });

  it('handles Google OAuth login error', async () => {
    const user = userEvent.setup();
    const errorMessage = 'OAuth error occurred';
    mockSignInWithOAuth.mockResolvedValue({ error: { message: errorMessage } });

    render(<LoginForm />);

    const googleButton = screen.getByRole('button', {
      name: /continue with google/i,
    });
    await user.click(googleButton);

    await waitFor(() => {
      expect(screen.getByText(/an error occurred/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during OAuth process', async () => {
    const user = userEvent.setup();
    let resolveOAuth: (value: any) => void;
    const oauthPromise = new Promise((resolve) => {
      resolveOAuth = resolve;
    });
    mockSignInWithOAuth.mockReturnValue(oauthPromise);

    render(<LoginForm />);

    const googleButton = screen.getByRole('button', {
      name: /continue with google/i,
    });
    await user.click(googleButton);

    await waitFor(() => {
      expect(googleButton).toBeDisabled();
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    });

    resolveOAuth!({ error: null });
  });

  it('prevents multiple clicks while loading', async () => {
    const user = userEvent.setup();
    let resolveOAuth: (value: any) => void;
    const oauthPromise = new Promise((resolve) => {
      resolveOAuth = resolve;
    });
    mockSignInWithOAuth.mockReturnValue(oauthPromise);

    render(<LoginForm />);

    const googleButton = screen.getByRole('button', {
      name: /continue with google/i,
    });

    // Click multiple times
    await user.click(googleButton);
    await user.click(googleButton);
    await user.click(googleButton);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
    });

    resolveOAuth!({ error: null });
  });

  it('displays error message when OAuth fails', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Network error';
    mockSignInWithOAuth.mockRejectedValue(new Error(errorMessage));

    render(<LoginForm />);

    const googleButton = screen.getByRole('button', {
      name: /continue with google/i,
    });
    await user.click(googleButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('clears error when starting new OAuth attempt', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Previous error';
    mockSignInWithOAuth
      .mockRejectedValueOnce(new Error(errorMessage))
      .mockResolvedValueOnce({ error: null });

    render(<LoginForm />);

    const googleButton = screen.getByRole('button', {
      name: /continue with google/i,
    });

    // First attempt - should show error
    await user.click(googleButton);
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Second attempt - error should be cleared
    await user.click(googleButton);
    await waitFor(() => {
      expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
    });
  });

  it('shows Google icon in the button', () => {
    render(<LoginForm />);

    const googleButton = screen.getByRole('button', {
      name: /continue with google/i,
    });
    const googleIcon = googleButton.querySelector('svg');
    expect(googleIcon).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<LoginForm />);

    const googleButton = screen.getByRole('button', {
      name: /continue with google/i,
    });
    expect(googleButton).toBeInTheDocument();
    expect(googleButton).toHaveClass('cursor-pointer');
  });

  it('handles generic error messages', async () => {
    const user = userEvent.setup();
    mockSignInWithOAuth.mockRejectedValue('Generic error string');

    render(<LoginForm />);

    const googleButton = screen.getByRole('button', {
      name: /continue with google/i,
    });
    await user.click(googleButton);

    await waitFor(() => {
      expect(screen.getByText(/an error occurred/i)).toBeInTheDocument();
    });
  });

  it('maintains button state during loading', async () => {
    const user = userEvent.setup();
    let resolveOAuth: (value: any) => void;
    const oauthPromise = new Promise((resolve) => {
      resolveOAuth = resolve;
    });
    mockSignInWithOAuth.mockReturnValue(oauthPromise);

    render(<LoginForm />);

    const googleButton = screen.getByRole('button', {
      name: /continue with google/i,
    });
    await user.click(googleButton);

    await waitFor(() => {
      expect(googleButton).toBeDisabled();
      expect(googleButton).toHaveTextContent(/signing in/i);
    });

    resolveOAuth!({ error: null });
  });
});
