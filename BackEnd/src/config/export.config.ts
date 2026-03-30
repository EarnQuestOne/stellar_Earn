export default () => ({
  export: {
    storageBaseUrl: process.env.EXPORT_STORAGE_BASE_URL || 'https://storage.example.com/exports',
    allowedFormats: ['json', 'csv'],
    downloadExpirySeconds: parseInt(process.env.EXPORT_DOWNLOAD_EXPIRY || '86400', 10),
  },
});
