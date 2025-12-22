import { Modal } from 'antd';

export function confirmReset(onConfirm) {
  Modal.confirm({
    title: 'Reset invoice?',
    content: 'This will clear all invoice data. This action cannot be undone.',
    okText: 'Yes, reset',
    okType: 'danger',
    cancelText: 'Cancel',
    onOk() {
      onConfirm();
    },
  });
}