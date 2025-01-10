import type { FC } from 'react';
import './banner.css';

const Banner: FC = () => {
  if (import.meta.env.VITE_EOP_BANNER_TEXT) {
    return <div className="banner">{import.meta.env.VITE_EOP_BANNER_TEXT}</div>;
  }
  return null;
};

export default Banner;
