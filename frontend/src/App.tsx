import { useEffect } from 'react';
import Router from './routes/Router';
import { initSocket } from './lib/socket';
import useAuthStore from './store/authStore';
import { getSignalStore } from './lib/crypto';

function App() {
  const { token, privateKeys } = useAuthStore();

  useEffect(() => {
    if (token) {
      initSocket();
    }
  }, [token]);

  useEffect(() => {
    if (privateKeys) {
      // Initialize the Signal store in the web worker
      getSignalStore(privateKeys)
        .then(() => console.log('Crypto worker initialized successfully.'))
        .catch(err => console.error('Failed to initialize crypto worker:', err));
    }
  }, [privateKeys]);


  return <Router />;
}

export default App;
