import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Links typed in the admin can be internal ("/categoria/capilar") or external
 * ("https://instagram.com/..."): internal ones use the router, external ones open in a new tab.
 */
export function SmartLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  if (/^https?:\/\//i.test(to)) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to.startsWith('/') ? to : `/${to}`} className={className}>
      {children}
    </Link>
  );
}
