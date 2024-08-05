import type React from 'react';
import { useNavigate } from 'react-router-dom';

const Logo: React.FC = () => {
  const navigate = useNavigate();

  return (
    <img
      src="logo.png"
      alt="logo"
      height="120px"
      onClick={() => navigate('/')}
    />
  );
};

export default Logo;
