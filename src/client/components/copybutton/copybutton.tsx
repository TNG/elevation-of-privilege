import { faCheck, faCopy, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState } from 'react';
import { Button } from 'reactstrap';
import { copyToClipboard } from '../../utils/utils';


interface CopyButtonProps {
  textToCopy: string;
  color?: string;
  active?: boolean;
  block?: boolean;
  disabled?: boolean;
  outline?: boolean;
  size?: string;
  children?: JSX.Element | string;
}

type ButtonState = 'failed' | 'ready' | 'done';

const CopyButton: React.FC<CopyButtonProps> = (props: CopyButtonProps) => {
  const [buttonState, setButtonState] = useState<ButtonState>('ready');

  const renderConfig = toRenderConfig(buttonState);

  const handleClick = async () => {
    try {
      await copyToClipboard(props.textToCopy);
      setButtonState('done');
    } catch (err) {
      setButtonState('failed');
    } finally {
      setTimeout(() => setButtonState('ready'), 500);
    }
  };

  return (
    <Button
      color={renderConfig.color ?? props.color}
      onClick={handleClick}
      active={props.active}
      block={props.block}
      disabled={props.disabled}
      size={props.size}
    >
      <FontAwesomeIcon icon={renderConfig.icon} fixedWidth/>{' '}
      {props.children}
    </Button>
  );
};

export default CopyButton;

function toRenderConfig(state: ButtonState) {
  switch (state) {
    case 'done':
      return { color: 'success', icon: faCheck };
    case 'ready':
      return { icon: faCopy };
    case 'failed':
      return { color: 'danger', icon: faXmark };
  }
}

