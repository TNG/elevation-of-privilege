import { FC } from 'react';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';

export type ConfirmModalProps = {
  onClose: (result: boolean) => void;
  isOpen: boolean;
  className?: string;
};

const ConfirmModal: FC<ConfirmModalProps> = ({
  onClose,
  isOpen,
  className,
}) => {
  return (
    <Modal isOpen={isOpen} toggle={() => onClose(false)} className={className}>
      <ModalHeader toggle={() => onClose(false)}>Warning!</ModalHeader>
      <ModalBody>{'Are you sure?'}</ModalBody>
      <ModalFooter>
        <Button color={''} onClick={() => onClose(false)}>
          Cancel
        </Button>
        <Button color="primary" onClick={() => onClose(true)}>
          Ok
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ConfirmModal;
