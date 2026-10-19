// frontend/src/components/ocr/OCRScanModal.jsx

import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  Button,
  Upload,
  Space,
  Typography,
  Alert,
  Tag,
  Tooltip,
  Empty,
} from 'antd';
import {
  CameraOutlined,
  UploadOutlined,
  PlusOutlined,
  RotateRightOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ScanOutlined,
} from '@ant-design/icons';
import '../../styles/ocr.css';

const { Text, Title } = Typography;
const { Dragger } = Upload;

export default function OCRScanModal({
  open,
  onCancel,
  onProcessPages,
  errorMessage,
  onClearError,
}) {
  // pages: Array<{ id, file, previewUrl, rotation, label }>
  const [pages, setPages] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraTargetIdx, setCameraTargetIdx] = useState(null); // null = append new page, number = replace page
  const [cameraError, setCameraError] = useState(null);
  const [zoomModalPage, setZoomModalPage] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const replaceInputRef = useRef(null);
  const [replaceTargetIdx, setReplaceTargetIdx] = useState(null);

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

  const getPageLabel = (index) => {
    if (index === 0) return 'Page 1 (Front Side)';
    if (index === 1) return 'Page 2 (Back / Sheet 2)';
    return `Page ${index + 1} (Continuation)`;
  };

  const addFilesToPages = (fileList, targetIndex = null) => {
    if (onClearError) onClearError();
    const validFiles = Array.from(fileList).filter((f) =>
      f.type.startsWith('image/')
    );
    if (validFiles.length === 0) return;

    setPages((prev) => {
      const next = [...prev];
      if (targetIndex !== null && targetIndex >= 0 && targetIndex < next.length) {
        // Replace existing page (Retake)
        const file = validFiles[0];
        if (next[targetIndex].previewUrl) {
          URL.revokeObjectURL(next[targetIndex].previewUrl);
        }
        next[targetIndex] = {
          ...next[targetIndex],
          file,
          previewUrl: URL.createObjectURL(file),
          rotation: 0,
        };
      } else {
        // Append 1 or more new pages
        validFiles.forEach((file) => {
          const newIdx = next.length;
          next.push({
            id: `${Date.now()}-${Math.random()}`,
            file,
            previewUrl: URL.createObjectURL(file),
            rotation: 0,
            label: getPageLabel(newIdx),
          });
        });
      }
      return next.map((p, idx) => ({ ...p, label: getPageLabel(idx) }));
    });
  };

  const startCamera = async (replaceIndex = null) => {
    setCameraError(null);
    setCameraTargetIdx(replaceIndex);
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
      console.error('Camera access failed:', err);
      setCameraError(
        'Could not access live camera in browser. Please use the file upload or mobile camera button below.'
      );
    }
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
        const file = new File([blob], `docket_capture_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        addFilesToPages([file], cameraTargetIdx);
        stopCamera();
      },
      'image/jpeg',
      0.92
    );
  };

  const handleRotatePage = (index) => {
    setPages((prev) =>
      prev.map((p, idx) =>
        idx === index ? { ...p, rotation: ((p.rotation || 0) + 90) % 360 } : p
      )
    );
  };

  const handleRemovePage = (index) => {
    setPages((prev) => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((p, idx) => ({ ...p, label: getPageLabel(idx) }));
    });
  };

  const handleTriggerRetakeFile = (index) => {
    setReplaceTargetIdx(index);
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
      replaceInputRef.current.click();
    }
  };

  const handleResetAll = () => {
    pages.forEach((p) => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    });
    setPages([]);
    if (onClearError) onClearError();
  };

  const handleSubmit = () => {
    if (pages.length === 0) return;
    onProcessPages(pages);
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={() => {
          stopCamera();
          onCancel();
        }}
        width={780}
        title={
          <Space>
            <ScanOutlined style={{ color: '#1b5e20', fontSize: 22 }} />
            <span style={{ fontSize: 20, fontWeight: 700 }}>
              Scan Handwritten Weight Docket (AI OCR)
            </span>
          </Space>
        }
        footer={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <Space>
              <Button onClick={onCancel}>Cancel</Button>
              {pages.length > 0 && (
                <Button danger type="text" onClick={handleResetAll}>
                  Clear All Pages
                </Button>
              )}
            </Space>
            <Button
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              disabled={pages.length === 0 || cameraActive}
              onClick={handleSubmit}
              style={{
                backgroundColor: '#1b5e20',
                borderColor: '#1b5e20',
                fontWeight: 700,
                minWidth: 230,
              }}
            >
              {pages.length <= 1
                ? 'Process Page (OCR)'
                : `Process All ${pages.length} Pages (OCR)`}
            </Button>
          </div>
        }
      >
        {/* Hidden input for replacing a single page */}
        <input
          type="file"
          ref={replaceInputRef}
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.length) {
              addFilesToPages(e.target.files, replaceTargetIdx);
            }
          }}
        />

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Multi-Page & Double-Sided Support"
          description="Take a clear photo of Page 1 (Front). If the docket continues on the back or across multiple sheets, click '+ Add Page' to include them all in one scan."
        />

        {errorMessage && (
          <Alert
            type="error"
            showIcon
            closable
            onClose={onClearError}
            style={{ marginBottom: 16 }}
            message="OCR Extraction Issue"
            description={
              <Space direction="vertical" style={{ width: '100%' }}>
                <span>{errorMessage}</span>
                {pages.length > 0 && (
                  <Button
                    size="small"
                    type="primary"
                    danger
                    icon={<ReloadOutlined />}
                    onClick={handleSubmit}
                  >
                    Retry with Current Page(s)
                  </Button>
                )}
              </Space>
            }
          />
        )}

        {cameraError && (
          <Alert
            type="warning"
            showIcon
            closable
            onClose={() => setCameraError(null)}
            style={{ marginBottom: 16 }}
            message={cameraError}
          />
        )}

        {/* Live Camera Viewfinder Mode */}
        {cameraActive ? (
          <div style={{ marginBottom: 16 }}>
            <div className="ocr-camera-container">
              <video ref={videoRef} autoPlay playsInline muted />
            </div>
            <Space
              style={{
                marginTop: 12,
                width: '100%',
                justifyContent: 'center',
              }}
              size="middle"
            >
              <Button size="large" onClick={stopCamera}>
                Cancel Camera
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<CameraOutlined />}
                onClick={captureFromVideo}
                style={{ backgroundColor: '#1b5e20', borderColor: '#1b5e20' }}
              >
                Snap Photo (
                {cameraTargetIdx !== null
                  ? getPageLabel(cameraTargetIdx)
                  : getPageLabel(pages.length)}
                )
              </Button>
            </Space>
          </div>
        ) : (
          /* Capture / Upload Prompt Box */
          <div style={{ marginBottom: 16 }}>
            <Dragger
              multiple
              accept="image/*"
              showUploadList={false}
              beforeUpload={(file, fileList) => {
                addFilesToPages(fileList);
                return false;
              }}
              style={{ padding: '16px 12px', background: '#fafafa' }}
            >
              <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
                <UploadOutlined style={{ color: '#1b5e20', fontSize: 36 }} />
              </p>
              <p
                className="ant-upload-text"
                style={{ fontSize: 17, fontWeight: 600 }}
              >
                {pages.length === 0
                  ? 'Drop Page 1 (Front Side) photo here, or click to select / snap photo'
                  : `+ Click or drop to add Page ${pages.length + 1} (Back / Continuation Sheet)`}
              </p>
              <p className="ant-upload-hint" style={{ fontSize: 13 }}>
                Supports JPG, PNG, WebP. High-resolution phone photos are automatically optimized.
              </p>
            </Dragger>

            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <Button
                icon={<CameraOutlined />}
                onClick={() => startCamera(null)}
                type="dashed"
              >
                {pages.length === 0
                  ? 'Open Live Webcam / Tablet Camera for Page 1'
                  : `+ Snap Page ${pages.length + 1} with Live Camera`}
              </Button>
            </div>
          </div>
        )}

        {/* Inspection Gallery */}
        {pages.length > 0 ? (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <Title level={5} style={{ margin: 0, color: '#1f1f1f' }}>
                Pre-Flight Page Inspection ({pages.length}{' '}
                {pages.length === 1 ? 'Page' : 'Pages'} Queued)
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Verify handwriting is clear and upright before sending
              </Text>
            </div>

            <div className="ocr-page-gallery">
              {pages.map((page, index) => (
                <div key={page.id} className="ocr-page-card">
                  <div
                    style={{
                      padding: '6px 10px',
                      background: '#f0f0f0',
                      borderBottom: '1px solid #d9d9d9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Tag color={index === 0 ? 'green' : 'blue'}>
                      {page.label}
                    </Tag>
                    {page.rotation > 0 && (
                      <Tag color="orange">{page.rotation}°</Tag>
                    )}
                  </div>

                  <div
                    className="ocr-page-thumb-wrapper"
                    onClick={() => setZoomModalPage(page)}
                    title="Click to inspect full image"
                  >
                    <img
                      src={page.previewUrl}
                      alt={page.label}
                      style={{
                        transform: `rotate(${page.rotation || 0}deg)`,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      padding: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 4,
                    }}
                  >
                    <Tooltip title="Inspect Full Size">
                      <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => setZoomModalPage(page)}
                      >
                        Zoom
                      </Button>
                    </Tooltip>
                    <Tooltip title="Rotate 90° Clockwise">
                      <Button
                        size="small"
                        icon={<RotateRightOutlined />}
                        onClick={() => handleRotatePage(index)}
                      >
                        90°
                      </Button>
                    </Tooltip>
                    <Tooltip title="Retake / Replace Photo">
                      <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={() => handleTriggerRetakeFile(index)}
                      >
                        Retake
                      </Button>
                    </Tooltip>
                    <Tooltip title="Remove Page">
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemovePage(index)}
                      />
                    </Tooltip>
                  </div>
                </div>
              ))}

              {/* Progressive "+ Add Page N" Card */}
              <div
                className="ocr-page-card"
                style={{
                  borderStyle: 'dashed',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 16,
                  minHeight: 250,
                }}
              >
                <Upload
                  accept="image/*"
                  multiple
                  showUploadList={false}
                  beforeUpload={(file, fileList) => {
                    addFilesToPages(fileList);
                    return false;
                  }}
                >
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    style={{ marginBottom: 10 }}
                  >
                    + Add Page {pages.length + 1} (Back / Next Sheet)
                  </Button>
                </Upload>
                <Button
                  size="small"
                  type="link"
                  icon={<CameraOutlined />}
                  onClick={() => startCamera(null)}
                >
                  or Use Camera
                </Button>
              </div>
            </div>
          </div>
        ) : (
          !cameraActive && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No docket pages captured yet. Snap or upload Page 1 above."
            />
          )
        )}
      </Modal>

      {/* Full-Resolution Zoom Inspection Modal */}
      <Modal
        open={!!zoomModalPage}
        onCancel={() => setZoomModalPage(null)}
        footer={[
          <Button key="close" onClick={() => setZoomModalPage(null)}>
            Close Preview
          </Button>,
        ]}
        width={900}
        title={zoomModalPage?.label || 'Page Preview'}
        centered
      >
        {zoomModalPage && (
          <div
            style={{
              background: '#141414',
              padding: 16,
              textAlign: 'center',
              borderRadius: 8,
              maxHeight: '75vh',
              overflow: 'auto',
            }}
          >
            <img
              src={zoomModalPage.previewUrl}
              alt={zoomModalPage.label}
              style={{
                maxWidth: '100%',
                maxHeight: '68vh',
                transform: `rotate(${zoomModalPage.rotation || 0}deg)`,
                transition: 'transform 0.2s ease',
              }}
            />
          </div>
        )}
      </Modal>
    </>
  );
}

