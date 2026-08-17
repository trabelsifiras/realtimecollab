export const environment = {
  production: true,
  apiUrl: `${window.location.origin}/api/v1`,
  wsUrl: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
};
