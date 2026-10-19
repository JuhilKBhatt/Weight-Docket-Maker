// frontend/src/components/ocr/OCRProgressModal.jsx

import React from 'react';
import { Modal, Spin, Progress, Steps, Typography } from 'antd';

const { Text } = Typography;

export default function OCRProgressModal({
  open,
  currentStepIndex = 0,
  progressPercent = 25,
  currentStepTitle = 'Reading document...',
  mode = 'docket', // 'docket' | 'id'
}) {
  const stepItems =
    mode === 'id'
      ? [
          { title: 'Upload & Optimize', description: 'Compressing ID card' },
          { title: 'Gemini 4 Argon', description: 'Reading licence fields' },
          { title: 'Ready', description: 'Verifying compliance' },
        ]
      : [
          { title: 'Upload & Optimize', description: 'Compressing pages' },
          { title: 'Gemini 4 Argon', description: 'Reading handwriting' },
          { title: 'Ready', description: 'Opening review workspace' },
        ];

  return (
    <Modal open={open} footer={null} closable={false} centered width={520}>
      <div style={{ textAlign: 'center', padding: '24px 16px' }}>
        <Spin size="large" />
        <h3 style={{ marginTop: 16, marginBottom: 8, color: '#1b5e20' }}>
          {currentStepTitle}
        </h3>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          High-speed AI vision extraction in progress (~1.5–2.5s)
        </Text>
        <Progress
          percent={progressPercent}
          status="active"
          strokeColor="#1b5e20"
        />
        <Steps
          size="small"
          current={currentStepIndex}
          style={{ marginTop: 24, textAlign: 'left' }}
          items={stepItems}
        />
      </div>
    </Modal>
  );
}

