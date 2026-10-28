
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FileText,
  Paperclip,
  Send,
  Sparkles,
  Globe,
  X,
  ShieldCheck
} from 'lucide-react';

import {
  Card,
  Button,
  Field,
  Input,
  Badge,
  PageHeader
} from '../../components/ui';

import FeatureNotice from '../../components/common/FeatureNotice';
import { QueryTimeline } from '../../components/common/QueryStatus';
import DepartmentSelect from '../../components/forms/DepartmentSelect';

import { isMockMode } from '../../api/mode';
import {
  createQuery,
  capabilities
} from '../../api/queriesApi';

import MockSubmitQueryPage from '../mock/MockSubmitQueryPage';

// --------------------------------------
// Form validation
// --------------------------------------
const schema = z.object({
  subject: z
    .string()
    .trim()
    .min(5, 'Use at least 5 characters.'),

  description: z
    .string()
    .trim()
    .min(
      20,
      'Add at least 20 characters so the team can understand your question.'
    ),

  department: z.string().optional()
});

// --------------------------------------
// Main component
// --------------------------------------
export default function SubmitQueryPage(props) {
  if (isMockMode && !props.preview) {
    return <MockSubmitQueryPage />;
  }

  return <OriginalSubmitQueryPage {...props} />;
}

// --------------------------------------
// Real API submit query page
// --------------------------------------
function OriginalSubmitQueryPage({ preview = false }) {
  const [files, setFiles] = useState([]);
  const [checked, setChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const {
    register,
    trigger,
    watch,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      subject: '',
      description: '',
      department: ''
    }
  });

  const description = watch('description') || '';

  // --------------------------------------
  // Submit query using real API
  // --------------------------------------
  const onSubmit = async (data) => {
    if (isSubmitting || !capabilities.create || preview) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');
    setChecked(false);

    try {
      // Backend accepts only the "message" field.
      // Include the subject in the message.
      const payload = {
        message: `Subject: ${data.subject}\n\n${data.description}`
      };

      const response = await createQuery(payload);

      console.log('Query created successfully:', response);

      setSubmitSuccess(
        'Your query has been submitted successfully.'
      );

      reset();
      setFiles([]);

    } catch (error) {
      console.error('Query submission failed:', error);

      const detail = error.response?.data?.detail;

      if (typeof detail === 'string') {
        setSubmitError(detail);
      } else if (Array.isArray(detail)) {
        setSubmitError(
          detail
            .map((item) => item.msg || 'Validation error')
            .join(', ')
        );
      } else {
        setSubmitError(
          'Unable to submit your query. Please try again.'
        );
      }

    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------
  // Check draft
  // --------------------------------------
  const handleCheckDraft = async () => {
    const isValid = await trigger();
    setChecked(isValid);
  };

  // --------------------------------------
  // Remove selected attachment
  // --------------------------------------
  const handleRemoveFile = (index) => {
    setFiles((previousFiles) =>
      previousFiles.filter((_, i) => i !== index)
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="STUDENT SERVICES"
        title="Submit a query"
        description="Tell us what you need. Your question will reach the right team."
      />

      {!capabilities.create && (
        <FeatureNotice>
          Query submission is not connected yet.
        </FeatureNotice>
      )}

      <div className="form-sidebar-grid">
        {/* Main form */}
        <Card className="padded-card">
          <div className="section-title">
            <span className="section-icon">
              <FileText size={20} />
            </span>

            <div>
              <h2>Your question</h2>
              <p>A little detail helps us give you a better answer.</p>
            </div>

            <Badge tone="blue">
              <Globe size={12} />
              Web
            </Badge>
          </div>

          <form
            className="form-stack"
            onSubmit={handleSubmit(onSubmit)}
          >
            {/* Subject */}
            <Field
              label="Subject"
              htmlFor="query-subject"
              error={errors.subject?.message}
            >
              <Input
                id="query-subject"
                placeholder="e.g. Scholarship application deadline"
                {...register('subject')}
              />
            </Field>

            {/* Query description */}
            <Field
              label="Query description"
              htmlFor="query-description"
              error={errors.description?.message}
            >
              <textarea
                id="query-description"
                rows={6}
                placeholder="Describe your question and any important details..."
                {...register('description')}
              />

              <span className="character-count">
                {description.length} characters
              </span>
            </Field>

            {/* Department selection */}
            <DepartmentSelect
              id="query-department"
              label="Preferred department (optional)"
              preview={preview}
              allowAutomatic
              inputProps={register('department')}
              hint="Your preference is optional. The final assignment comes from the routing service."
            />

            {/* Attachments: UI only until upload API is available */}
            <Field
              label="Attachments (optional)"
              htmlFor="query-files"
              hint="File uploads are not yet supported by the backend. Selected files will not be submitted."
            >
              <label
                className="upload-zone"
                htmlFor="query-files"
              >
                <Paperclip size={23} />

                <strong>Choose supporting documents</strong>

                <span>Click to browse your files</span>

                <input
                  id="query-files"
                  type="file"
                  multiple
                  disabled
                  onChange={(e) =>
                    setFiles(Array.from(e.target.files || []))
                  }
                />
              </label>
            </Field>

            {/* Selected attachments */}
            {files.length > 0 && (
              <div className="file-list">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`}>
                    <FileText size={15} />

                    <span>{file.name}</span>

                    <small>
                      {(file.size / 1024).toFixed(1)} KB
                    </small>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => handleRemoveFile(index)}
                    >
                      <X size={15} />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="form-footer">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCheckDraft}
                disabled={isSubmitting}
              >
                Check draft
              </Button>

              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !capabilities.create ||
                  preview
                }
              >
                <Send size={16} />

                {isSubmitting
                  ? 'Submitting...'
                  : 'Submit query'}
              </Button>
            </div>

            {/* Draft validation result */}
            {checked && (
              <p
                className="draft-feedback"
                role="status"
              >
                Your draft passes frontend validation.
                It has not been submitted.
              </p>
            )}

            {/* API error */}
            {submitError && (
              <p
                className="error-message"
                role="alert"
              >
                {submitError}
              </p>
            )}

            {/* API success */}
            {submitSuccess && (
              <p
                className="success-message"
                role="status"
              >
                {submitSuccess}
              </p>
            )}
          </form>
        </Card>

        {/* Sidebar */}
        <div className="sidebar-card-stack">
          <Card className="padded-card">
            <span className="assistant-icon">
              <Sparkles size={22} />
            </span>

            <h3>One question. The right people.</h3>

            <p className="muted">
              Your query will be sent to the backend
              for classification and routing.
            </p>

            <QueryTimeline available={false} />

            <Badge tone="neutral">
              Proposed status workflow
            </Badge>
          </Card>

          {/* Security information */}
          <Card className="security-note">
            <ShieldCheck size={21} />

            <div>
              <h3>Your conversations stay yours.</h3>

              <p>
                The backend must enforce access to your
                own queries and attachments.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
