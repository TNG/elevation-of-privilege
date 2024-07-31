import React from 'react';
import type { FC } from 'react';

const Privacy: FC = () => {
  if (typeof import.meta.env.VITE_EOP_PRIVACY === 'string') {
    return <a href={import.meta.env.VITE_EOP_PRIVACY}>Privacy</a>;
  }
  return null;
};

export default Privacy;
