// ./frontend/src/scripts/utilities/routeBackMap.js

export const routeBackMap = {
  // Invoice Flow
  '/InvoiceHome': '/',
  '/new-invoice': '/InvoiceHome',
  '/view-invoice': '/InvoiceHome',
  '/edit-invoice': '/view-invoice',
  '/sales-invoices': '/InvoiceHome',

  // Docket Flow
  '/DocketHome': '/',
  '/new-docket': '/DocketHome',
  '/view-docket': '/DocketHome',
  '/edit-docket': '/view-docket',
  
  // General
  '/settings': '/', // Default parent for settings if history fails
};

export const getBackRoute = (currentRoute) => {
  // 1. Exact Match
  if (routeBackMap[currentRoute]) {
    return routeBackMap[currentRoute];
  }

  // 2. Dynamic Match (e.g., "/edit-invoice/123" matches "/edit-invoice")
  const keys = Object.keys(routeBackMap).sort((a, b) => b.length - a.length);
  const match = keys.find((key) => currentRoute.startsWith(key));
  
  return match ? routeBackMap[match] : '/'; // Default to Home if unknown
};