import axios from 'axios';
// Using AsyncStorage later via a helper if needed, or passing token directly
// But better to use AsyncStorage for persistence
import AsyncStorage from '@react-native-async-storage/async-storage';

// const baseURL = 'http://10.0.2.2:8000/api';
// export const serverURL = 'http://10.0.2.2:8000/api';

const baseURL = 'http://65.1.85.105/api';
export const serverURL = 'http://65.1.85.105/api';

const api = axios.create({
  baseURL: baseURL,
});

api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('vendorToken');
    console.log('API Interceptor - Retrieved Token is:', token);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('API Interceptor - Attached Authorization Header');
    } else {
      console.log('API Interceptor - No Token Found');
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

export default api;
