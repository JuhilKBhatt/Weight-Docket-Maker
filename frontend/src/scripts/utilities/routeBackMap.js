// ./frontend/src/scripts/utilities/routeBackMap.js

export const routeBackMap = {
  '/new-invoice': '/InvoiceHome',
  '/edit-invoice': '/view-invoice',
  '/view-invoice': '/InvoiceHome',
  '/InvoiceHome': '/',
  '/settings': '/InvoiceHome', 
};

export const getBackRoute = (currentRoute) => {
  if (routeBackMap[currentRoute]) {
    return routeBackMap[currentRoute];
  }
  const baseKey = Object.keys(routeBackMap).find((key) =>
    currentRoute.startsWith(key + '/') || currentRoute === key
  );
  return baseKey ? routeBackMap[baseKey] : '/InvoiceHome';
};