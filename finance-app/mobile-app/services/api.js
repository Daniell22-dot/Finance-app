import axios from 'axios';
import { Platform } from 'react-native';



/**
 * CONFIGURATION
 * For Web: Uses localhost (127.0.0.1)
 * For Mobile: Use your computer's local IP address
 */
const YOUR_COMPUTER_IP = '172.16.75.42';

const API_BASE_URL = Platform.OS === 'web'
  ? 'http://127.0.0.1:5000'
  : `http://${YOUR_COMPUTER_IP}:5000`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000 // 30 seconds
});

// --- INTERCEPTORS ---

// Request Interceptor: Attach Auth Token if available
api.interceptors.request.use(async (config) => {
  try {
    // Note: Once you implement storage, uncomment the lines below
    // import AsyncStorage from '@react-native-async-storage/async-storage';
    // const token = await AsyncStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  } catch (error) {
    return config;
  }
}, (error) => {
  return Promise.reject(error);
});

// Response Interceptor: Global Error Handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log detailed error to console for debugging in Chrome (F12)
    console.error('Network Error Details:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    if (error.code === 'ECONNABORTED') {
      error.message = 'Connection timeout. Please try again.';
    } else if (!error.response) {
      error.message = `Cannot connect to server at ${API_BASE_URL}. Ensure Flask is running and CORS is enabled.`;
    } else if (error.response.status === 401) {
      error.message = 'Authentication failed or session expired.';
    }
    return Promise.reject(error);
  }
);

// --- SERVICE MODULES ---

export const authAPI = {
  login: async (email, password) => {
    try {
      // Ensure Flask route is @app.route('/api/login', ...)
      const response = await api.post('/api/login', { email, password });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post('/api/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  testConnection: async () => {
    try {
      const response = await api.get('/api/test');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  resendVerification: async (email) => {
    try {
      const response = await api.post('/api/resend-verification', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  }
};

export const projectsAPI = {
  createProject: async (projectData, token) => {
    try {
      const response = await api.post('/api/projects', projectData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  getUserProjects: async (userId, token) => {
    try {
      const response = await api.get(`/api/projects/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  getAvailableProjects: async () => {
    try {
      const response = await api.get('/api/projects/available');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  investInProject: async (projectId, amount, token) => {
    try {
      const response = await api.post('/api/projects/invest',
        { project_id: projectId, amount },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  updateProject: async (projectId, projectData, token) => {
    try {
      const response = await api.put(`/api/projects/${projectId}`, projectData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  uploadFile: async (fileData, token) => {
    try {
      const formData = new FormData();
      // fileData should be: { uri: '...', name: '...', type: '...' }
      formData.append('file', fileData);

      const response = await axios.post(`${getAPIBaseUrl()}/api/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  }
};

export const mpesaAPI = {
  initiateDeposit: async (phoneNumber, amount, token) => {
    try {
      const response = await api.post('/api/mpesa/initiate-deposit',
        { phone_number: phoneNumber, amount },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  checkTransactionStatus: async (checkoutRequestId, token) => {
    try {
      const response = await api.get(`/api/mpesa/transaction-status/${checkoutRequestId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  }
};

export const dashboardAPI = {
  getDashboard: async (userId, token) => {
    try {
      const response = await api.get(`/api/dashboard/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  }
};

export const profileAPI = {
  updateProfile: async (userId, profileData, token) => {
    try {
      const response = await api.put(`/api/profile/${userId}`, profileData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  getProfile: async (userId, token) => {
    try {
      const response = await api.get(`/api/profile/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  }
};

export const notificationAPI = {
  getNotifications: async (token) => {
    try {
      const response = await api.get('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  markRead: async (token) => {
    try {
      const response = await api.post('/api/notifications/read', {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  }
};

export const getAPIBaseUrl = () => API_BASE_URL;
export default api;