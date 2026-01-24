// ./frontend/src/scripts/utilities/AUDFormatters.js

export const audFormatter = (value) => {
  if (value === undefined || value === null || value === '') return '';
  
  const valStr = String(value);
  const [integer, decimal] = valStr.split('.');
  const formattedInt = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return decimal !== undefined
    ? `${formattedInt}.${decimal}`
    : formattedInt;
};

export const audParser = (value) => {
  if (!value) return '';
  return String(value).replace(/,/g, '');
};

export const isValidInput = (value, precision = 2) => {
  if (value === '' || value === '-') return true; 
  
  const regex = new RegExp(`^\\d*(\\.\\d{0,${precision}})?$`);
  return regex.test(value);
};

export const audFormatterFixed = (value) => {
  if (value === undefined || value === null || value === '') return '';

  const number = Number(value);
  if (Number.isNaN(number)) return '';

  return number.toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};