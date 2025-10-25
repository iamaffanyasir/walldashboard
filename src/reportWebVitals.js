const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    // Conditional import to avoid error when web-vitals isn't installed
    try {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(onPerfEntry);
        getFID(onPerfEntry);
        getFCP(onPerfEntry);
        getLCP(onPerfEntry);
        getTTFB(onPerfEntry);
      });
    } catch (error) {
      console.warn('web-vitals is not installed. Run: npm install web-vitals');
    }
  }
};

export default reportWebVitals;
