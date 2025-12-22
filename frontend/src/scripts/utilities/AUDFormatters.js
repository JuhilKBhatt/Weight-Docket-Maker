// ./frontend/src/scripts/utilities/AUDformatters.js

export const audFormatter = (value) =>
  value === undefined
    ? ''
    : `$ ${value}`.replaceAll(/\B(?=(\d{3})+(?!\d))/g, ',');

export const audParser = (value) =>
  value ? value.replaceAll(/\$\s?|(,*)/g, '') : '';