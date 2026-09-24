import type { MouseEvent } from 'react';
import { Link, useNavigate, type LinkProps } from 'react-router-dom';

import { navigateWithTransition } from '@/lib/viewTransition';

/**
 * A router Link that navigates inside a view transition.
 *
 * Still a real <a href>: middle-click, Ctrl/Cmd-click, Shift-click and
 * "open in new tab" do what they always did, because only a plain primary
 * click is intercepted.
 */
export default function TransitionLink({ to, onClick, ...props }: LinkProps & { to: string }) {
  const navigate = useNavigate();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      props.target === '_blank'
    ) {
      return;
    }
    event.preventDefault();
    navigateWithTransition(navigate, to);
  };

  return <Link to={to} onClick={handleClick} {...props} />;
}
