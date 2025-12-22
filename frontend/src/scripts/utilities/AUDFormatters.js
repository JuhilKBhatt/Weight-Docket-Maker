// ./frontend/src/scripts/utilities/AUDformatters.js

export const audFormatter = (value) => {
  if (value === undefined || value === null || value === '') return '';
  const [integer, decimal] = String(value).split('.');
  const formattedInt = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // While typing, DO NOT force decimals
  return decimal !== undefined
    ? `${formattedInt}.${decimal}`
    : formattedInt;
};

export const audParser = (value) => {
  if (!value) return '';
  return value.replace(/,/g, '');
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