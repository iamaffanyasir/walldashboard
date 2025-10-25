import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://wallpresentation.theautochef.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// User authentication
export async function login(email, password) {
  return axios.post(`${API_URL}/users/login`, { email, password });
}

export async function register(name, email, password) {
  return axios.post(`${API_URL}/users/register`, { name, email, password });
}

// Presentation endpoints
export const getPresentations = (userId) => api.get('/presentations', { params: { user_id: userId } });
export const getPresentation = (id) => api.get(`/presentations/${id}`);
export const createPresentation = (data) => api.post('/presentations', data);
export const updatePresentation = (id, data) => api.put(`/presentations/${id}`, data);
export const deletePresentation = (id) => api.delete(`/presentations/${id}`);

export const addSection = (presentationId, data) => api.post(`/presentations/${presentationId}/sections`, data);
export const updateSection = (sectionId, data) => api.put(`/sections/${sectionId}`, data);
export const deleteSection = (sectionId) => api.delete(`/sections/${sectionId}`);

export const addItem = (sectionId, data) => {
  const formData = new FormData();
  
  // If there's a file, append it to form data
  if (data.file) {
    formData.append('file', data.file);
  }
  
  // If there's a URL (for maps, etc.)
  if (data.url) {
    formData.append('url', data.url);
  }
  
  // Append other fields
  formData.append('seq', data.seq);
  if (data.meta) {
    formData.append('meta', JSON.stringify(data.meta));
  }
  
  return axios.post(`${API_URL}/sections/${sectionId}/items`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const updateItem = (sectionId, itemId, data) => {
  const formData = new FormData();
  
  // If there's a file, append it to form data
  if (data.file) {
    formData.append('file', data.file);
  }
  
  // If there's a URL (for maps, etc.)
  if (data.url) {
    formData.append('url', data.url);
  }
  
  // Append other fields
  if (data.seq !== undefined) {
    formData.append('seq', data.seq);
  }
  if (data.meta !== undefined) {
    formData.append('meta', JSON.stringify(data.meta));
  }
  
  return axios.put(`${API_URL}/sections/${sectionId}/items/${itemId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const deleteItem = (sectionId, itemId) => api.delete(`/sections/${sectionId}/items/${itemId}`);

// Client endpoints
export const getClients = (presentationId) => api.get(`/presentations/${presentationId}/clients`);
export const addClient = (presentationId, data) => api.post(`/presentations/${presentationId}/clients`, data);

// Analytics endpoints
export const getAnalytics = (presentationId, clientId) => {
  const params = clientId ? { client_id: clientId } : {};
  return api.get(`/analytics/${presentationId}`, { params });
};

export const recordAnalyticsEvent = (data) => {
  console.log('📊 Recording analytics event:', data);
  // Ensure required fields are present
  const eventData = {
    presentation_id: data.presentation_id,
    client_id: data.client_id,
    section_id: data.section_id,
    item_id: data.item_id || null,
    event_type: data.event_type,
    ts: data.ts || Date.now(),
    duration_ms: data.duration_ms || null,
    extra: data.extra || null
  };
  return api.post('/analytics/events', eventData);
};

// Add method for beacon API (more reliable for page unload)
export const recordAnalyticsBeacon = (data) => {
  const url = `${API_URL}/analytics/events/beacon`;
  // Add timestamp if not already present
  if (!data.data || !data.data.timestamp) {
    data.data = {
      ...data.data,
      timestamp: Date.now()
    };
  }
  
  // Use sendBeacon for better reliability during page unload
  if (navigator.sendBeacon) {
    return navigator.sendBeacon(url, JSON.stringify(data));
  } else {
    // Fall back to sync XHR for older browsers
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, false); // false makes it synchronous
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
    return xhr.status === 200;
  }
};

export default api;
