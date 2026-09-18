// Executable packages are installed with the extension, never provided by local JSON.
export const domainPackages = {
  'x.com': { id: 'x-com', archive: 'domain-packages/x-com.zip', controls: 'domain-runtime/x-com/popup.html',
    entries: { 'scripts/popup.html': 'domain-runtime/x-com/popup.html', 'scripts/records.html': 'domain-runtime/x-com/records.html', 'scripts/library.html': 'domain-runtime/x-com/library.html' } },
};
