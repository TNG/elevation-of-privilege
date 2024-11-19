import type React from 'react';
import { useNavigate } from 'react-router-dom';
import classes from './logo.module.css';

const Logo: React.FC = () => {
  const navigate = useNavigate();

  return (
    <img
      className={classes['logo']}
      src="logo.png"
      alt="logo"
      height="120px"
      onClick={() => navigate('/')}
    />
  );
};

export default Logo;
