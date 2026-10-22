import { Link } from 'react-router-dom';
import { Clock3 } from 'lucide-react';
import { Badge, Card } from '../../components/ui';
import { isMockMode } from '../../api/mode';

export default function PendingApprovalPage() {
  return <div className="auth-form-content">
    <span className="auth-form-icon"><Clock3 size={25} /></span>
    <Badge tone="warning">Pending administrator approval</Badge>
    <h2>Your next chapter is almost here</h2>
    <p className="auth-description">Your account has been created successfully and is awaiting administrator approval. You will be able to log in after your account is approved.</p>
    <Card className="pending-steps"><div><strong>Registration received</strong><p>Your account remains inactive until an administrator approves it.</p></div><div><strong>Administrator review</strong><p>Your requested role is reviewed before access is assigned.</p></div><div><strong>Sign in after approval</strong><p>Return with your own email and password once approved.</p></div></Card>
    {isMockMode && <p className="auth-note">To continue the local demo, sign in as admin@demo.campusiq.edu with Demo@12345, open Admin → Approvals, approve your request, sign out, then sign in with your own email and password.</p>}
    <Link to="/login" className="button button-primary auth-submit">Back to sign in</Link>
  </div>;
}
