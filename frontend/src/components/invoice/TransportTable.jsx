import { Table, InputNumber, Typography } from 'antd';
import { audFormatter, audParser, audFormatterFixed } from '../../scripts/utilities/AUDformatters';

export default function TransportTable({
  invoiceType,
  transportItems,
  handleTransportChange,
}) {
  // Determine unit label and row labels based on invoice type
  const isContainer = invoiceType === 'Container';
  const unitLabel = isContainer ? 'CTR' : 'Trip';

  // Map transport items row names based on invoice type
  const mappedItems = transportItems.map((item, index) => {
    // Default row name from item.name
    let name = item.name;

    if (isContainer) {
      // Row labels for Container invoices
      name = index === 0 ? 'Containers' : index === 1 ? 'Overweight' : item.name;
    } else {
      // Row labels for Pickup invoices
      name = index === 0 ? 'Pickup' : index === 1 ? 'Overweight' : item.name;
    }

    return { ...item, name };
  });

  const columns = [
    {
      title: 'Item',
      dataIndex: 'name',
    },
    {
      title: `Number of ${unitLabel}s`,
      dataIndex: 'NumOfCTR',
      render: (_, record) => (
        <InputNumber
          addonAfter={unitLabel}
          style={{ width: '100%' }}
          value={record.NumOfCTR}
          onChange={(val) =>
            handleTransportChange(record.key, 'NumOfCTR', val)
          }
        />
      ),
    },
    {
      title: `Price / ${unitLabel}`,
      dataIndex: 'PricePreCTR',
      render: (_, record) => (
        <InputNumber
          addonBefore="$"
          style={{ width: '100%' }}
          value={record.PricePreCTR}
          formatter={audFormatter}
          parser={audParser}
          onChange={(val) =>
            handleTransportChange(record.key, 'PricePreCTR', val)
          }
        />
      ),
    },
    {
      title: 'Total',
      render: (_, record) => {
        const total =
          (Number(record.NumOfCTR) || 0) *
          (Number(record.PricePreCTR) || 0);

        return (
          <InputNumber
            addonBefore="$"
            style={{ width: '100%' }}
            value={total}
            formatter={audFormatterFixed}
            precision={2}
            disabled
          />
        );
      },
    },
  ];

  if (!transportItems.length) return null;

  return (
    <>
      <Typography.Title level={5} style={{ marginTop: 20 }}>
        Transport Charges
      </Typography.Title>

      <Table
        columns={columns}
        dataSource={mappedItems}
        pagination={false}
        bordered
      />
    </>
  );
}