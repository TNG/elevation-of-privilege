import React from 'react';
import type { FC } from 'react';

const Imprint: FC = () => {
  if (
    typeof import.meta.env.VITE_EOP_IMPRINT === 'string' &&
    import.meta.env.VITE_EOP_IMPRINT !== ''
  ) {
    return <a href={import.meta.env.VITE_EOP_IMPRINT}>Imprint</a>;
  }
  return null;
};

export default Imprint;
