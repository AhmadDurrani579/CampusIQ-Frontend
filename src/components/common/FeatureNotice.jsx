import { PlugZap, LockKeyhole } from 'lucide-react';
import { Badge } from '../ui';

export default function FeatureNotice({ title = 'Backend integration pending', children, compact = false }) {
  return <div className={`feature-notice ${compact ? 'feature-notice-compact' : ''}`}><span className="notice-icon"><PlugZap size={19} /></span><div><div className="notice-heading"><strong>{title}</strong><Badge tone="amber">Not connected yet</Badge></div><p>{children || 'This workspace is ready for the upcoming backend API. Actions will be available once the service is connected.'}</p></div><LockKeyhole size={17} className="notice-lock" /></div>;
}
