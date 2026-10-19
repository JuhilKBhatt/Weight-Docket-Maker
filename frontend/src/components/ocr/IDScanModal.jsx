// frontend/src/components/ocr/IDScanModal.jsx

import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  Button,
  Upload,
  Space,
  Typography,
  Alert,
  Tag,
  Row,
  Col,
  Input,
  Descriptions,
  Card,
} from 'antd';
import {
  IdcardOutlined,
  CameraOutlined,
  UploadOutlined,
  RotateRightOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import ocrService from '../../services/ocrService';
import OCRProgressModal from './OCRProgressModal';
import '../../styles/ocr.css';

const { Text } = Typography;
const { Dragger } = Upload;

const ID_FLAG_LABELS = {
  glare_detected: 'Hologram / Flash Glare Detected',
  id_obscured: 'Part of Card Obscured (Finger / Edge)',
  expired_id: 'Expired ID Document',
  ambiguous_character: 'Ambiguous Character',
  digital_license: 'Digital Licence App',
  not_an_id: 'Not a Valid ID Document',
};

export default function IDScanModal({ open, onCancel, onApplyCustomerId }) {
  // Staged flow: 'capture' -> 'inspect' -> 'confirm'
  const [stage, setStage] = useState('capture');
  const [capturedFile, setCapturedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [rotation, setRotation] = useState(0);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [progressPercent, setProgressPercent] = useState(25);
  const [progressTitle, setProgressTitle] = useState('Optimizing ID card image...');
  const [errorMsg, setErrorMsg] = useState(null);

  // Extracted result & editable fields
  const [ocrResponse, setOcrResponse] = useState(null);
  const [editableData, setEditableData] = useState({
    name: '',
    license_number: '',
    dob: '',
    address: '',
    expiry_date: '',
    jurisdiction: '',
    id_type: '',
  });

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
    }
    return () => stopCamera();
  }, [open]);

  const resetModalState = () => {
    stopCamera();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCapturedFile(null);
    setPreviewUrl(null);
    setRotation(0);
    setErrorMsg(null);
    setOcrResponse(null);
    setStage('capture');
  };

  const handleClose = () => {
    resetModalState();
    onCancel();
  };

  const startCamera = async () => {
    setCameraError(null);
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch (err) {
      console.error('Failed to open camera for ID scan:', err);
      setCameraError(
        'Live camera unavailable. Use the upload / mobile camera button below.'
      );
    }
  };

  const handleFileSelected = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setCapturedFile(file);
    setPreviewUrl(url);
    setRotation(0);
    setErrorMsg(null);
    stopCamera();
    setStage('inspect');
  };

  const captureFromVideo = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `id_card_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        handleFileSelected(file);
      },
      'image/jpeg',
      0.92
    );
  };

  const handleSendToOCR = async () => {
    if (!capturedFile) return;
    setErrorMsg(null);
    setIsProcessing(true);
    try {
      const result = await ocrService.scanCustomerId(
        capturedFile,
        rotation,
        (stepIdx, pct, title) => {
          setProgressStep(stepIdx);
          setProgressPercent(pct);
          setProgressTitle(title);
        }
      );

      setOcrResponse(result);
      const d = result.data || {};
      setEditableData({
        name: d.name || '',
        license_number: d.license_number || '',
        dob: d.dob || '',
        address: d.address || '',
        expiry_date: d.expiry_date || '',
        jurisdiction: d.jurisdiction || 'OTHER',
        id_type: d.id_type || 'driver_license',
      });
      setStage('confirm');
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        'OCR service temporarily unavailable. Please enter customer details manually.';
      setErrorMsg(detail);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePopulateForm = () => {
    onApplyCustomerId({
      name: editableData.name.trim(),
      license_number: editableData.license_number.trim(),
      dob: editableData.dob.trim(),
      address: editableData.address.trim(),
      expiry_date: editableData.expiry_date.trim(),
      jurisdiction: editableData.jurisdiction,
    });
    handleClose();
  };

  const extractedData = ocrResponse?.data || {};
  const isLowConfidence = extractedData.confidence === 'low';

  return (
    <>
      <Modal
        open={open}
        onCancel={handleClose}
        width={680}
        title={
          <Space>
            <IdcardOutlined style={{ color: '#1677ff', fontSize: 22 }} />
            <span style={{ fontSize: 20, fontWeight: 700 }}>
              Scan Customer ID / Driver&apos;s Licence
            </span>
          </Space>
        }
        footer={
          stage === 'capture' ? (
            <Button onClick={handleClose}>Cancel</Button>
          ) : stage === 'inspect' ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setStage('capture');
                    setErrorMsg(null);
                  }}
                >
                  Retake Photo
                </Button>
                <Button
                  icon={<RotateRightOutlined />}
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                >
                  Rotate 90°
                </Button>
              </Space>
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleSendToOCR}
                style={{
                  backgroundColor: '#1b5e20',
                  borderColor: '#1b5e20',
                  fontWeight: 700,
                }}
              >
                Send to OCR
              </Button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setStage('capture');
                  setErrorMsg(null);
                }}
              >
                Scan Different Card
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handlePopulateForm}
                style={{
                  backgroundColor: '#1b5e20',
                  borderColor: '#1b5e20',
                  fontWeight: 700,
                }}
              >
                Populate Customer Fields
              </Button>
            </div>
          )
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 14 }}
          message="Privacy by Design — In-Memory Processing Only"
          description="Supports Australian Driver's Licences (NSW, VIC, QLD, WA, SA, TAS, ACT, NT), Photo Cards, and Passports. ID photos are never saved to disk."
        />

        {errorMsg && (
          <Alert
            type="error"
            showIcon
            closable
            onClose={() => setErrorMsg(null)}
            style={{ marginBottom: 14 }}
            message="ID Extraction Failed"
            description={errorMsg}
          />
        )}

        {cameraError && (
          <Alert
            type="warning"
            showIcon
            closable
            onClose={() => setCameraError(null)}
            style={{ marginBottom: 14 }}
            message={cameraError}
          />
        )}

        {/* STAGE 1: CAPTURE */}
        {stage === 'capture' && (
          <div>
            {cameraActive ? (
              <div>
                <div className="ocr-camera-container">
                  <video ref={videoRef} autoPlay playsInline muted />
                  <div className="ocr-id-card-overlay">
                    <div className="ocr-id-card-guide-box">
                      <span className="ocr-id-card-guide-label">
                        Align Driver&apos;s Licence / ID inside frame (Avoid flash
                        glare)
                      </span>
                    </div>
                  </div>
                </div>
                <Space
                  style={{
                    marginTop: 14,
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  <Button onClick={stopCamera}>Cancel Camera</Button>
                  <Button
                    type="primary"
                    size="large"
                    icon={<CameraOutlined />}
                    onClick={captureFromVideo}
                    style={{
                      backgroundColor: '#1b5e20',
                      borderColor: '#1b5e20',
                    }}
                  >
                    Capture ID Card
                  </Button>
                </Space>
              </div>
            ) : (
              <div>
                <Dragger
                  multiple={false}
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    handleFileSelected(file);
                    return false;
                  }}
                  style={{ padding: '20px 12px', background: '#fafafa' }}
                >
                  <p className="ant-upload-drag-icon">
                    <IdcardOutlined style={{ color: '#1677ff', fontSize: 40 }} />
                  </p>
                  <p
                    className="ant-upload-text"
                    style={{ fontSize: 17, fontWeight: 600 }}
                  >
                    Click or drop Customer ID / Driver&apos;s Licence photo here
                  </p>
                  <p className="ant-upload-hint">
                    Supports physical cards, digital licence screenshots, and passports
                  </p>
                </Dragger>

                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <Button
                    type="primary"
                    ghost
                    icon={<CameraOutlined />}
                    onClick={startCamera}
                  >
                    Open Live Camera with ID Alignment Guide
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STAGE 2: INSPECT */}
        {stage === 'inspect' && previewUrl && (
          <div>
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message="Inspect Image Before Sending"
              description="Check that the Name, Licence Number, Date of Birth, and Address are not covered by a thumb or washed out by flash glare."
            />
            <div
              style={{
                background: '#141414',
                borderRadius: 8,
                padding: 16,
                textAlign: 'center',
                minHeight: 280,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                src={previewUrl}
                alt="Customer ID Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: 340,
                  borderRadius: 6,
                  transform: `rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* STAGE 3: CONFIRM & POPULATE */}
        {stage === 'confirm' && (
          <div>
            {/* Compliance / Expiry / Underage / Low-Confidence Alerts */}
            {extractedData.is_expired && (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 10 }}
                message="⚠️ EXPIRED ID DOCUMENT"
                description={`This document expired on ${
                  extractedData.expiry_date || 'an earlier date'
                }. Verify statutory compliance before payout.`}
              />
            )}

            {extractedData.is_underage && (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 10 }}
                message="⚠️ CUSTOMER UNDER 18 YEARS OLD"
                description="Date of Birth indicates customer is under 18. Scrap metal compliance requires adult identification."
              />
            )}

            {isLowConfidence && (
              <Alert
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                style={{ marginBottom: 10 }}
                message="Low Confidence / Obscured Field Detected"
                description="One or more fields had glare or finger occlusion and were not guessed. Please verify against the card preview below."
              />
            )}

            {extractedData.validation_warnings?.length > 0 && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 10 }}
                message="Compliance Notes"
                description={
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {extractedData.validation_warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                }
              />
            )}

            <Card
              size="small"
              style={{
                marginBottom: 12,
                background: isLowConfidence ? '#fffbe6' : '#f6ffed',
                borderColor: isLowConfidence ? '#ffe58f' : '#b7eb8f',
              }}
            >
              <Space wrap style={{ marginBottom: 8 }}>
                <Tag color="blue">
                  Jurisdiction: {editableData.jurisdiction || 'AUSTRALIA'}
                </Tag>
                <Tag color="purple">
                  Type: {(editableData.id_type || 'driver_license').replace('_', ' ').toUpperCase()}
                </Tag>
                <Tag
                  color={
                    isLowConfidence
                      ? 'warning'
                      : extractedData.confidence === 'medium'
                      ? 'processing'
                      : 'success'
                  }
                >
                  Confidence: {(extractedData.confidence || 'high').toUpperCase()}
                </Tag>
                {ocrResponse?.model_used && (
                  <Tag color="default">
                    {ocrResponse.model_used} ({ocrResponse.execution_time_ms}ms)
                  </Tag>
                )}
                {(extractedData.flags || []).map((f) => (
                  <Tag key={f} color="gold">
                    {ID_FLAG_LABELS[f] || f}
                  </Tag>
                ))}
              </Space>

              <Row gutter={[12, 10]}>
                <Col xs={24} sm={12}>
                  <Text strong style={{ fontSize: 13 }}>
                    Full Name ([Given Names] [SURNAME]):
                  </Text>
                  <Input
                    value={editableData.name}
                    onChange={(e) =>
                      setEditableData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Full Name"
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <Text strong style={{ fontSize: 13 }}>
                    Licence / Permit Number:
                  </Text>
                  <Input
                    value={editableData.license_number}
                    onChange={(e) =>
                      setEditableData((prev) => ({
                        ...prev,
                        license_number: e.target.value,
                      }))
                    }
                    placeholder="Licence No."
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <Text strong style={{ fontSize: 13 }}>
                    Date of Birth (DD/MM/YYYY):
                  </Text>
                  <Input
                    value={editableData.dob}
                    onChange={(e) =>
                      setEditableData((prev) => ({
                        ...prev,
                        dob: e.target.value,
                      }))
                    }
                    placeholder="DD/MM/YYYY"
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <Text strong style={{ fontSize: 13 }}>
                    Expiry Date (DD/MM/YYYY):
                  </Text>
                  <Input
                    value={editableData.expiry_date}
                    onChange={(e) =>
                      setEditableData((prev) => ({
                        ...prev,
                        expiry_date: e.target.value,
                      }))
                    }
                    placeholder="DD/MM/YYYY"
                  />
                </Col>
                <Col xs={24}>
                  <Text strong style={{ fontSize: 13 }}>
                    Residential Address:
                  </Text>
                  <Input
                    value={editableData.address}
                    onChange={(e) =>
                      setEditableData((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    placeholder="Street Address, Suburb STATE Postcode"
                  />
                </Col>
              </Row>
            </Card>
          </div>
        )}
      </Modal>

      <OCRProgressModal
        open={isProcessing}
        currentStepIndex={progressStep}
        progressPercent={progressPercent}
        currentStepTitle={progressTitle}
        mode="id"
      />
    </>
  );
}

