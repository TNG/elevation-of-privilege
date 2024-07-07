import React, { FC, PropsWithChildren, useState } from 'react';
import { Button, ButtonProps } from 'reactstrap';
import { copyToClipboard } from '../../utils/utils';
import { faCopy, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

type CopyButtonProps = PropsWithChildren<
  Pick<ButtonProps, 'color' | 'active' | 'block' | 'disabled' | 'size'> & {
    text: string;
  }
>;

const CopyButton: FC<CopyButtonProps> = ({
  text,
  color: initialColor,
  children,
  ...props
}) => {
  const [color, setColor] = useState(initialColor);
  const [icon, setIcon] = useState(faCopy);

  const handleClick = async () => {
    try {
      await copyToClipboard(text);
      setColor('success');
      setIcon(faCheck);
    } catch {
      //If the copy fails, maybe alert the user somehow
      setColor('danger');
      setIcon(faTimes);
    } finally {
      setTimeout(() => {
        setColor(initialColor);
        setIcon(faCopy);
      }, 500);
    }
  };

  return (
    <Button color={color} onClick={handleClick} {...props}>
      <FontAwesomeIcon icon={icon} fixedWidth /> {children}
    </Button>
  );
};

export default CopyButton;
