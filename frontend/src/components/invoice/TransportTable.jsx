// ./frontend/src/components/invoice/TransportTable.jsx

import { Table, Input, InputNumber, Typography } from 'antd';
import { audFormatter, audParser, audFormatterFixed, isValidInput } from '../../scripts/utilities/AUDFormatters';

export default function TransportTable({
  invoiceType,
  transportItems,
  handleTransportChange,
  currency = 'AUD',
  currencyOptions = []
}) {
  const isContainer = invoiceType === 'Container';
  const unitLabel = isContainer ? 'CNT' : 'Trip';
  
  const symbolLabel = currencyOptions.find(c => c.code === currency)?.label || `${currency}$`;

  const onInputChange = (key, field, e, maxDecimals = 2) => {
    const rawValue = e.target.value;
    const parsedValue = audParser(rawValue);
    
    if (isValidInput(parsedValue, maxDecimals)) {
      handleTransportChange(key, field, parsedValue);
    }
  };

  const mappedItems = transportItems.map((item, index) => {
    let name = item.name;
    if (isContainer) {
      name = index === 0 ? 'Containers' : index === 1 ? 'Overweight' : item.name;
    } else {
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
      dataIndex: 'numOfCtr',
      render: (_, record) => (
        <InputNumber
          addonAfter={unitLabel}
          style={{ width: '100%' }}
          value={record.numOfCtr}
          min={0}
          step={1}
          precision={2}
          formatter={value => value === '' || value === undefined || value === null ? '' : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={value => value.replace(/\$\s?|(,*)/g, '')}
          onChange={(val) => handleTransportChange(record.key, 'numOfCtr', val)}
        />
      ),
    },
    {
      title: `Price / ${unitLabel}`,
      dataIndex: 'pricePerCtr',
      render: (_, record) => (
        <Input
          addonBefore={symbolLabel}
          style={{ width: '100%' }}
          value={audFormatter(record.pricePerCtr)}
          onChange={(e) => onInputChange(record.key, 'pricePerCtr', e, 2)}
        />
      ),
    },
    {
      title: 'Total',
      render: (_, record) => {
        const total = (Number(record.numOfCtr) || 0) * (Number(record.pricePerCtr) || 0);
        return (
          <InputNumber
            addonBefore={symbolLabel}
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
      <Typography.Title level={5} style={{ marginTop: 20 }}>Transport Charges</Typography.Title>
      <Table columns={columns} dataSource={mappedItems} pagination={false} bordered />
    </>
  );
}