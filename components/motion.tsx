'use client';

import React from 'react';

/**
 * No-animation shims so we don't depend on framer-motion.
 * They accept any props (including "initial", "animate", etc.)
 * and simply render plain DOM elements.
 */

type AnyDivProps = React.ComponentProps<'div'> & Record<string, any>;
type AnySpanProps = React.ComponentProps<'span'> & Record<string, any>;

export function MotionDiv({ children, ...rest }: AnyDivProps) {
  return <div {...rest}>{children}</div>;
}

export function MotionSpan({ children, ...rest }: AnySpanProps) {
  return <span {...rest}>{children}</span>;
}

export default { MotionDiv, MotionSpan };
