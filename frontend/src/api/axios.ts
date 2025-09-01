import axios from 'axios';
import { padRequest } from '@/lib/padding';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

// Add a request interceptor to pad POST and PUT requests
instance.interceptors.request.use(
  (config) => {
    if ((config.method === 'post' || config.method === 'put') && config.data) {
      // We only pad if the data is a plain object. We don't want to pad FormData.
      if (config.data.constructor === Object) {
        config.data = padRequest(config.data);
        // The server expects a raw string, so we might need to adjust headers.
        config.headers['Content-Type'] = 'application/json;charset=UTF-8';
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default instance;
