// frontend/src/components/ocr/OCRExtractionReview.jsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Row,
  Col,
  Table,
  Input,
  InputNumber,
  Button,
  Space,
  Tag,
  Alert,
  Tabs,
  AutoComplete,
  Typography,
  Tooltip,
  Badge,
} from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  RotateRightOutlined,
  ExpandOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { MATERIAL_WHITELIST } from '../../services/ocrService';
import '../../styles/ocr.css';

const { Text } = Typography;

const FLAG_LABELS = {
  gross_corrected: 'Gross Corrected',
  tare_corrected: 'Tare Corrected',
  material_corrected: 'Material Corrected',
  gross_crossed_out: 'Gross Crossed Out',
  tare_crossed_out: 'Tare Crossed Out',
  material_crossed_out: 'Material Crossed Out',
  tare_hidden: 'Tare Occluded (Finger)',
  material_partial: 'Material Partially Hidden',
  ambiguous_digit: 'Ambiguous Digit / Check Math',
  maybe_voided: 'Possibly Voided Line',
};

export default function OCRExtractionReview({
  open,
  onCancel,
  ocrResult,
  pageImages = [], // Array<{ id, previewUrl, rotation, label }>
  onApplyToForm,
}) {
  const [customerName, setCustomerName] = useState('');
  const [docketDate, setDocketDate] = useState('');
  const [entries, setEntries] = useState([]);
  const [activePageIdx, setActivePageIdx] = useState(0);

  // Image viewer zoom / pan / rotation state
  const [zoom, setZoom] = useState(1);
  const [extraRotation, setExtraRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (ocrResult) {
      setCustomerName(ocrResult.customer || '');
      setDocketDate(ocrResult.date || '');
      setEntries(
        (ocrResult.entries || []).map((entry, idx) => ({
          ...entry,
          _key: `ocr-entry-${idx}-${Date.now()}`,
        }))
      );
      setActivePageIdx(0);
      setZoom(1);
      setExtraRotation(0);
      setPan({ x: 0, y: 0 });
    }
  }, [ocrResult]);

  const resetView = () => {
    setZoom(1);
    setExtraRotation(0);
    setPan({ x: 0, y: 0 });
  };

  const handlePageTabChange = (key) => {
    setActivePageIdx(Number(key));
    resetView();
  };

  const handleEntryChange = (key, field, value) => {
    setEntries((prev) =>
      prev.map((item) => {
        if (item._key !== key) return item;
        return {
          ...item,
          [field]: value,
        };
      })
    );
  };

  const handleConfirmLowConfidenceRow = (key) => {
    setEntries((prev) =>
      prev.map((item) =>
        item._key === key ? { ...item, confidence: 'high' } : item
      )
    );
  };

  const handleDeleteRow = (key) => {
    setEntries((prev) => prev.filter((item) => item._key !== key));
  };

  const handleAddRow = () => {
    setEntries((prev) => [
      ...prev,
      {
        _key: `ocr-manual-${Date.now()}`,
        line: prev.length + 1,
        page: activePageIdx + 1,
        raw_text: '(Manual Entry)',
        gross: null,
        tare: null,
        extra_deduction: null,
        material: '',
        price: null,
        flags: [],
        confidence: 'high',
      },
    ]);
  };

  const lowConfidenceCount = useMemo(
    () => entries.filter((e) => e.confidence === 'low').length,
    [entries]
  );

  const whitelistOptions = useMemo(
    () => MATERIAL_WHITELIST.map((m) => ({ value: m, label: m })),
    []
  );

  const columns = [
    {
      title: '#',
      dataIndex: 'line',
      width: 52,
      align: 'center',
      render: (_, record, index) => (
        <div>
          <Text strong>{index + 1}</Text>
          {pageImages.length > 1 && record.page && (
            <div>
              <Tag
                color="default"
                style={{ fontSize: 10, padding: '0 4px', margin: 0 }}
                onClick={() => handlePageTabChange(record.page - 1)}
              >
                P{record.page}
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Raw Transcription',
      dataIndex: 'raw_text',
      width: 145,
      render: (val) => (
        <Text
          type="secondary"
          style={{ fontSize: 12, fontFamily: 'monospace', display: 'block' }}
        >
          {val || '—'}
        </Text>
      ),
    },
    {
      title: 'Material (Normalized)',
      dataIndex: 'material',
      width: 155,
      render: (val, record) => (
        <AutoComplete
          value={val || ''}
          options={whitelistOptions}
          filterOption={(inputValue, option) =>
            option.value.toLowerCase().includes(inputValue.toLowerCase())
          }
          onChange={(newVal) =>
            handleEntryChange(record._key, 'material', newVal)
          }
          placeholder="Material"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Gross',
      dataIndex: 'gross',
      width: 90,
      render: (val, record) => (
        <InputNumber
          value={val}
          onChange={(v) => handleEntryChange(record._key, 'gross', v)}
          placeholder="Gross"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Tare',
      dataIndex: 'tare',
      width: 90,
      render: (val, record) => (
        <InputNumber
          value={val}
          onChange={(v) => handleEntryChange(record._key, 'tare', v)}
          placeholder="Tare"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Extra Ded.',
      dataIndex: 'extra_deduction',
      width: 85,
      render: (val, record) => (
        <Tooltip title="Automatically merged into Tare (Effective Tare = Tare + Extra Deduction)">
          <InputNumber
            value={val}
            onChange={(v) =>
              handleEntryChange(record._key, 'extra_deduction', v)
            }
            placeholder="0"
            style={{ width: '100%' }}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Eff. Tare / Net',
      key: 'computed',
      width: 115,
      align: 'right',
      render: (_, record) => {
        const effTare =
          (Number(record.tare) || 0) + (Number(record.extra_deduction) || 0);
        const gross = Number(record.gross) || 0;
        const net = gross - effTare;
        return (
          <div style={{ lineHeight: 1.2 }}>
            <Text style={{ fontSize: 12 }} type="secondary">
              Tare: {effTare}
            </Text>
            <div
              style={{
                fontWeight: 700,
                color: net < 0 ? '#cf1322' : '#1b5e20',
                fontSize: 14,
              }}
            >
              Net: {net} kg
            </div>
          </div>
        );
      },
    },
    {
      title: 'Price',
      dataIndex: 'price',
      width: 85,
      render: (val, record) => (
        <InputNumber
          value={val}
          step={0.05}
          precision={2}
          onChange={(v) => handleEntryChange(record._key, 'price', v)}
          placeholder="Auto"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Confidence & Flags',
      key: 'confidence',
      width: 185,
      render: (_, record) => {
        const isLow = record.confidence === 'low';
        const isMed = record.confidence === 'medium';

        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            {isLow ? (
              <Space size={4} wrap>
                <Tag color="warning" style={{ margin: 0, fontWeight: 600 }}>
                  ⚠️ Low Confidence - Check Image
                </Tag>
                <Tooltip title="Mark row as verified">
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<CheckOutlined />}
                    onClick={() => handleConfirmLowConfidenceRow(record._key)}
                    style={{ fontSize: 11, height: 22, padding: '0 6px' }}
                  >
                    Verify
                  </Button>
                </Tooltip>
              </Space>
            ) : isMed ? (
              <Tag color="processing" style={{ margin: 0 }}>
                ⚡ Medium (Resolved)
              </Tag>
            ) : (
              <Tag color="success" style={{ margin: 0 }}>
                ✓ High Confidence
              </Tag>
            )}

            {Array.isArray(record.flags) &&
              record.flags.map((flag) => (
                <Tag
                  key={flag}
                  color={isLow ? 'gold' : 'blue'}
                  style={{ fontSize: 11, margin: 0 }}
                >
                  {FLAG_LABELS[flag] || flag}
                </Tag>
              ))}
          </Space>
        );
      },
    },
    {
      title: '',
      key: 'action',
      width: 40,
      align: 'center',
      render: (_, record) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteRow(record._key)}
        />
      ),
    },
  ];

  const currentPageObj = pageImages[activePageIdx] || pageImages[0] || null;
  const totalRotation =
    ((currentPageObj?.rotation || 0) + extraRotation) % 360;

  const handleApply = () => {
    onApplyToForm({
      customer: customerName.trim() || null,
      date: docketDate.trim() || null,
      entries,
    });
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      width="95vw"
      style={{ top: 16, maxWidth: 1680 }}
      title={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            paddingRight: 28,
          }}
        >
          <Space size="middle" wrap>
            <span style={{ fontSize: 20, fontWeight: 700 }}>
              OCR Review Workspace — Verify & Apply to Docket
            </span>
            {ocrResult?.model_used && (
              <Tag color="green">
                Engine: {ocrResult.model_used} ({ocrResult.execution_time_ms}ms)
              </Tag>
            )}
            {lowConfidenceCount > 0 ? (
              <Badge
                count={`${lowConfidenceCount} Low-Confidence Row${
                  lowConfidenceCount > 1 ? 's' : ''
                } Highlighted in Amber`}
                style={{
                  backgroundColor: '#faad14',
                  color: '#000',
                  fontWeight: 700,
                }}
              />
            ) : (
              <Tag color="success" icon={<CheckCircleOutlined />}>
                All Rows Verified
              </Tag>
            )}
          </Space>
        </div>
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
            <Button onClick={onCancel}>Cancel / Back</Button>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddRow}
            >
              Add Missing Line Item
            </Button>
          </Space>
          <Space>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Note: Any Extra Deduction is automatically summed into Tare (Net =
              Gross − Tare).
            </Text>
            <Button
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              onClick={handleApply}
              style={{
                backgroundColor: '#1b5e20',
                borderColor: '#1b5e20',
                fontWeight: 700,
                minWidth: 240,
              }}
            >
              Apply {entries.length} Item{entries.length === 1 ? '' : 's'} to
              Docket Form
            </Button>
          </Space>
        </div>
      }
    >
      <div className="ocr-review-workspace">
        {/* LEFT PANE (50%): Zoomable, Pannable, Rotatable Multi-Page Image Viewer */}
        <div className="ocr-review-left-pane">
          {pageImages.length > 1 && (
            <div style={{ background: '#1f1f1f', padding: '0 12px' }}>
              <Tabs
                activeKey={String(activePageIdx)}
                onChange={handlePageTabChange}
                size="small"
                items={pageImages.map((p, idx) => ({
                  key: String(idx),
                  label: (
                    <span style={{ color: '#fff' }}>
                      {p.label || `Page ${idx + 1}`}
                    </span>
                  ),
                }))}
              />
            </div>
          )}

          <div className="ocr-image-viewer-toolbar">
            <Text style={{ color: '#d9d9d9', fontSize: 13 }}>
              {currentPageObj?.label || 'Docket Image'} — Drag to pan, use
              controls to zoom
            </Text>
            <Space size="small">
              <Button
                size="small"
                icon={<ZoomOutOutlined />}
                onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
              />
              <Tag color="geekblue" style={{ margin: 0 }}>
                {Math.round(zoom * 100)}%
              </Tag>
              <Button
                size="small"
                icon={<ZoomInOutlined />}
                onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
              />
              <Button
                size="small"
                icon={<RotateRightOutlined />}
                onClick={() => setExtraRotation((r) => (r + 90) % 360)}
              >
                Rotate 90°
              </Button>
              <Button size="small" icon={<ExpandOutlined />} onClick={resetView}>
                Reset
              </Button>
            </Space>
          </div>

          <div
            className="ocr-image-viewport"
            onMouseDown={(e) => {
              setDragging(true);
              setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            }}
            onMouseMove={(e) => {
              if (!dragging) return;
              setPan({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
              });
            }}
            onMouseUp={() => setDragging(false)}
            onMouseLeave={() => setDragging(false)}
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY < 0 ? 0.15 : -0.15;
              setZoom((z) =>
                Math.min(4, Math.max(0.5, +(z + delta).toFixed(2)))
              );
            }}
          >
            {currentPageObj ? (
              <img
                src={currentPageObj.previewUrl}
                alt="Handwritten Docket"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${totalRotation}deg)`,
                }}
              />
            ) : (
              <Text style={{ color: '#888' }}>No preview image available</Text>
            )}
          </div>
        </div>

        {/* RIGHT PANE (50%): Header Fields, Alerts, and Interactive Review Table */}
        <div className="ocr-review-right-pane">
          {/* Header fields extracted from Page 1 */}
          <Row gutter={12} style={{ marginBottom: 12 }}>
            <Col xs={24} sm={14}>
              <Text strong style={{ fontSize: 13 }}>
                Extracted Customer Name (Header):
              </Text>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer Name (if written on docket)"
                style={{ marginTop: 4 }}
              />
            </Col>
            <Col xs={24} sm={10}>
              <Text strong style={{ fontSize: 13 }}>
                Extracted Docket Date (DD/MM/YYYY):
              </Text>
              <Input
                value={docketDate}
                onChange={(e) => setDocketDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                style={{ marginTop: 4 }}
              />
            </Col>
          </Row>

          {/* Low confidence banner */}
          {lowConfidenceCount > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginBottom: 10 }}
              message={`${lowConfidenceCount} row(s) require quick visual check`}
              description="Rows highlighted in amber had smudged ink, crossed-out writing, or a finger covering a number. Check the original image on the left and edit or click 'Verify'."
            />
          )}

          {/* Skipped / Voided lines notice */}
          {ocrResult?.skipped_lines?.length > 0 && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 10 }}
              message={`Voided / Struck-Through Lines Skipped Automatically: Line(s) ${ocrResult.skipped_lines.join(
                ', '
              )}`}
            />
          )}

          {/* Scale chaining warnings */}
          {ocrResult?.chaining_warnings?.length > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 10 }}
              message="Scale Chaining Check"
              description={
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {ocrResult.chaining_warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              }
            />
          )}

          {/* Interactive Review Table */}
          <div className="ocr-review-table">
            <Table
              dataSource={entries}
              columns={columns}
              rowKey="_key"
              pagination={false}
              bordered
              size="small"
              rowClassName={(record) => {
                if (record.confidence === 'low')
                  return 'ocr-row-low-confidence';
                if (record.confidence === 'medium')
                  return 'ocr-row-medium-confidence';
                return '';
              }}
              scroll={{ x: 'max-content' }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

