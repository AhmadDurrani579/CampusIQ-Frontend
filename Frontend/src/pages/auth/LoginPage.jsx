
import {
  useEffect,
  useRef,
  useState
} from 'react';

import {
  Link,
  useNavigate
} from 'react-router-dom';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Route
} from 'lucide-react';

import {
  Button,
  Field,
  Input
} from '../../components/ui';

import { useAuth } from '../../context/AuthContext';

import {
  getRoleHome,
  ROLES
} from '../../utils/roles';

import {
  getApiErrorMessage
} from '../../utils/apiErrors';

import { isMockMode } from '../../api/mode';

import {
  resetDemo
} from '../../api/demoApi';

import './LoginPage.css';

// ==========================================
// 1. Login form validation
// ==========================================
const schema = z.object({
  email: z
    .string()
    .trim()
    .email('Enter a valid university email address.'),

  password: z
    .string()
    .min(1, 'Enter your password.')
});

// ==========================================
// 2. Login page
// ==========================================
export default function LoginPage() {
  const {
    login,
    loginWithGoogle
  } = useAuth();

  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  const busy = useRef(false);
  const googleButtonRef = useRef(null);
  const googleLoginRef = useRef(loginWithGoogle);
  const navigateRef = useRef(navigate);

  googleLoginRef.current = loginWithGoogle;
  navigateRef.current = navigate;

  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting
    }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // ==========================================
  // 3. Check account approval and role
  // ==========================================
  function validateAccount(user) {
    if (!user) {
      throw new Error(
        'Unable to retrieve your account information.'
      );
    }

    if (
      user.approval_status &&
      user.approval_status !== 'APPROVED'
    ) {
      throw new Error(
        'Your account is pending administrator approval.'
      );
    }

    if (!ROLES.includes(user.role)) {
      throw new Error(
        'The server returned an unsupported account role.'
      );
    }

    return user;
  }

  // ==========================================
  // 4. Normal email/password login
  // ==========================================
  async function submit(values) {
    if (busy.current) return;

    busy.current = true;
    setError('');

    try {
      const user = await login(values);

      validateAccount(user);

      navigate(getRoleHome(user.role), {
        replace: true
      });

    } catch (failure) {
      setError(getApiErrorMessage(failure));

    } finally {
      busy.current = false;
    }
  }

  // ==========================================
  // 5. Initialise Google Sign-In
  // ==========================================
  useEffect(() => {
    if (isMockMode) return;

    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      setError(
        'Google Client ID is missing from frontend configuration.'
      );
      return;
    }

    let active = true;

    let initialized = false;

    // Callback receives an actual Google ID token.
    async function handleGoogleCredential(response) {
      if (!active || busy.current) return;

      const idToken = response?.credential;

      if (!idToken) {
        setError('Google did not return an ID token.');
        return;
      }

      busy.current = true;
      setGoogleLoading(true);
      setError('');

      try {
        // Calls loginWithGoogle from AuthContext.
        const user = await googleLoginRef.current(idToken);

        if (!active) return;

        validateAccount(user);

        navigateRef.current(getRoleHome(user.role), {
          replace: true
        });

      } catch (failure) {
        if (active) {
          const detail = failure.response?.data?.detail;

          setError(
            typeof detail === 'string'
              ? detail
              : getApiErrorMessage(failure)
          );
        }

      } finally {
        busy.current = false;

        if (active) {
          setGoogleLoading(false);
        }
      }
    }

    // Configure Google's official Sign-In button.
    function initializeGoogle() {
  if (!active || initialized) return;

  if (!window.google?.accounts?.id) {
    return;
  }

  initialized = true;

      if (!window.google?.accounts?.id) {
        setError(
          'Google Sign-In could not be loaded.'
        );
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
        ux_mode: 'popup',
        auto_select: false
      });

      if (googleButtonRef.current) {
        googleButtonRef.current.replaceChildren();

        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 320
          }
        );
      }

      setGoogleReady(true);
    }

    // Load Google Identity Services if needed.
    if (window.google?.accounts?.id) {
      initializeGoogle();

    } else {
      let script = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]'
      );

      let createdScript = false;

      if (!script) {
        script = document.createElement('script');
        script.src =
          'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;

        createdScript = true;
      }

      const onLoad = () => initializeGoogle();

      const onError = () => {
        if (active) {
          setError(
            'Unable to load Google authentication. Check your connection.'
          );
        }
      };

      script.addEventListener('load', onLoad);
      script.addEventListener('error', onError);

      if (createdScript) {
        document.head.appendChild(script);
      }

      // Handles a script that was added earlier
      // and may already be loading or loaded.
      const poll = window.setInterval(() => {
        if (!active) return;

        if (window.google?.accounts?.id) {
          window.clearInterval(poll);
          initializeGoogle();
        }
      }, 250);

      const timeout = window.setTimeout(() => {
        window.clearInterval(poll);

        if (active && !window.google?.accounts?.id) {
          setError(
            'Google Sign-In did not load. Please refresh and try again.'
          );
        }
      }, 10000);

      return () => {
        active = false;
        window.clearInterval(poll);
        window.clearTimeout(timeout);

        script.removeEventListener('load', onLoad);
        script.removeEventListener('error', onError);
      };
    }

    return () => {
      active = false;
    };
  }, []);

  // ==========================================
  // 6. Reset demo
  // ==========================================
  async function recover() {
    if (
      !window.confirm(
        'Delete local demo accounts and queries?'
      )
    ) {
      return;
    }

    setResetting(true);
    setError('');

    try {
      await resetDemo();
      window.location.reload();

    } catch (failure) {
      setError(getApiErrorMessage(failure));
      setResetting(false);
    }
  }

  // ==========================================
  // 7. Login UI
  // ==========================================
  return (
    <div className="auth-form-content login-design-card">

      <span className="auth-form-icon">
        <Route size={26} aria-hidden="true" />
      </span>

      <p className="eyebrow">
        YOUR CAMPUS, CONNECTED
      </p>

      <h2>Welcome back</h2>

      <p className="auth-description">
        Sign in to your university workspace.
      </p>

      {/* Normal login form */}
      <form
        onSubmit={handleSubmit(submit)}
        className="auth-form"
        noValidate
      >
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        {/* Email */}
        <Field
          label="Email address"
          htmlFor="login-email"
          error={errors.email?.message}
        >
          <div className="login-input-field">
            <Mail
              className="login-input-icon"
              size={16}
              aria-hidden="true"
            />

            <Input
              id="login-email"
              type="email"
              autoComplete="username"
              placeholder="you@university.edu"
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
          </div>
        </Field>

        {/* Password */}
        <Field
          label="Password"
          htmlFor="login-password"
          error={errors.password?.message}
        >
          <div className="password-field login-input-field">
            <LockKeyhole
              className="login-input-icon"
              size={16}
              aria-hidden="true"
            />

            <Input
              id="login-password"
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />

            <button
              className="password-toggle"
              type="button"
              aria-label={
                showPassword
                  ? 'Hide password'
                  : 'Show password'
              }
              onClick={() =>
                setShowPassword(value => !value)
              }
            >
              {showPassword
                ? <EyeOff size={18} />
                : <Eye size={18} />}
            </button>
          </div>
        </Field>

        <p className="field-hint">
          Forgot your password? Contact your
          university administrator.
        </p>

        <Button
          type="submit"
          loading={isSubmitting}
          disabled={googleLoading}
          className="auth-submit"
        >
          Sign in
          <ArrowRight size={17} />
        </Button>
      </form>

      {/* =====================================
          GOOGLE SIGN-IN
      ===================================== */}
      {!isMockMode && (
        <div className="login-google-section">

          <div
            className="login-google-divider"
            aria-hidden="true"
          >
            <span>or</span>
          </div>

          <div className="login-google-button-container">
            <div ref={googleButtonRef} />
          </div>

          {googleLoading && (
            <p
              className="login-google-note"
              role="status"
            >
              Signing in with Google...
            </p>
          )}

          {!googleReady && !googleLoading && (
            <p
              className="login-google-note"
              role="status"
            >
              Loading Google Sign-In...
            </p>
          )}
        </div>
      )}

      {/* Signup */}
      <p className="auth-switch">
        New to CampusIQ?{' '}
        <Link to="/signup">
          Create an account
        </Link>
      </p>

      <div className="auth-note">
        Access is assigned after account approval.
      </div>

      {/* Demo mode */}
      {isMockMode && (
        <div className="auth-note">
          <p>
            If local demo records are damaged,
            reset the demo to recover.
            This deletes local demo accounts
            and queries.
          </p>

          <Button
            variant="danger"
            size="sm"
            disabled={resetting}
            onClick={recover}
          >
            Reset local demo
          </Button>
        </div>
      )}
    </div>
  );
}
