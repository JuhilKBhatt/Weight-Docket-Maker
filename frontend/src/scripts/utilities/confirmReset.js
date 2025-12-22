// ./frontend/src/scripts/utilities/confirmReset.js

import { App } from 'antd';

export function useConfirmReset() {
  const { modal } = App.useApp();

  return (onConfirm) => {
    modal.confirm({
      title: 'Reset invoice?',
      content: 'This will clear all invoice data. This action cannot be undone.',
      okText: 'Yes, reset',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: onConfirm,
    });
  };
}