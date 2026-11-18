
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, UserRoundPlus } from 'lucide-react';

import { Button, Field, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { getSignupDepartments } from '../../api/departmentsApi';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { isMockMode } from '../../api/mode';

const schema = z.object({
  full_name: z.string()
    .trim()
    .min(2, 'Enter your full name.')
    .max(100, 'Use at most 100 characters.'),

  email: z.string()
    .trim()
    .email('Enter a valid email address.'),

  password: z.string()
    .min(8, 'Use at least 8 characters.')
    .max(128, 'Use at most 128 characters.'),

  confirm_password: z.string(),

  department_id: z.coerce.number()
    .int()
    .positive('Please select a department.'),

  terms: z.boolean().refine(
    value => value,
    'Please agree to the university communication guidelines.'
  ),
}).refine(
  values => values.password === values.confirm_password,
  {
    path: ['confirm_password'],
    message: 'Your passwords do not match.',
  }
);

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departmentsError, setDepartmentsError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      confirm_password: '',
      department_id: '',
      terms: false,
    },
  });

  // Load departments when the Signup page opens.
  useEffect(() => {
    let active = true;

    async function loadDepartments() {
      setDepartmentsLoading(true);
      setDepartmentsError('');

      try {
        const result = await getSignupDepartments();

        if (!active) return;

        setDepartments(result);

        if (!result.length) {
          setDepartmentsError(
            'No departments are available for registration.'
          );
        }
      } catch (failure) {
        if (!active) return;

        setDepartmentsError(
          'Unable to load departments. Please refresh and try again.'
        );

        console.error('Failed to load departments:', failure);
      } finally {
        if (active) {
          setDepartmentsLoading(false);
        }
      }
    }

    loadDepartments();

    return () => {
      active = false;
    };
  }, []);

  async function submit({
    full_name,
    email,
    password,
    department_id,
  }) {
    setError('');

    if (!departments.some(
      department => Number(department.id) === department_id
    )) {
      setError('Please select a valid department.');
      return;
    }

    try {
      await signup({
        full_name,
        email,
        password,
        department_id,
      });

      navigate('/pending-approval', {
        replace: true,
      });
    } catch (failure) {
      setError(getApiErrorMessage(failure));
    }
  }

  return (
    <div className="auth-form-content">
      <span className="auth-form-icon">
        <UserRoundPlus size={23} />
      </span>

      <p className="eyebrow">JOIN YOUR CAMPUS</p>

      <h2>Create your account</h2>

      <p className="auth-description">
        Get started with a more connected university experience.
        {isMockMode && ' Local demo account; administrator approval is required.'}
      </p>

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

        <Field
          label="Full name"
          htmlFor="signup-name"
          error={errors.full_name?.message}
        >
          <Input
            id="signup-name"
            autoComplete="name"
            placeholder="Your full name"
            aria-invalid={Boolean(errors.full_name)}
            {...register('full_name')}
          />
        </Field>

        <Field
          label="Email address"
          htmlFor="signup-email"
          error={errors.email?.message}
        >
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </Field>

        <Field
          label="Select department"
          htmlFor="signup-department"
          error={
            errors.department_id?.message ||
            departmentsError
          }
        >
          <select
            id="signup-department"
            className="input"
            aria-invalid={Boolean(
              errors.department_id || departmentsError
            )}
            disabled={departmentsLoading || !departments.length}
            {...register('department_id')}
          >
            <option value="">
              {departmentsLoading
                ? 'Loading departments...'
                : 'Select your department'}
            </option>

            {departments.map(department => (
              <option
                key={department.id}
                value={department.id}
              >
                {department.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="form-grid">
          <Field
            label="Password"
            htmlFor="signup-password"
            error={errors.password?.message}
          >
            <Input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
          </Field>

          <Field
            label="Confirm password"
            htmlFor="signup-confirm"
            error={errors.confirm_password?.message}
          >
            <Input
              id="signup-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              aria-invalid={Boolean(errors.confirm_password)}
              {...register('confirm_password')}
            />
          </Field>
        </div>

        <div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              {...register('terms')}
            />
            <span>
              I agree to follow university communication guidelines.
            </span>
          </label>

          {errors.terms && (
            <p className="field-error" role="alert">
              {errors.terms.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          loading={isSubmitting}
          disabled={departmentsLoading || !departments.length}
          className="auth-submit"
        >
          Create account
          <ArrowRight size={17} />
        </Button>
      </form>

      <p className="auth-switch">
        Already have an account?{' '}
        <Link to="/login">Sign in</Link>
      </p>

      <div className="auth-note">
        New accounts are reviewed by a university administrator
        before access is granted.
      </div>
    </div>
  );
}
