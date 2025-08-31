import { useEffect } from 'react';
import Router from './routes/Router';
import { initSocket } from './lib/socket';
import useAuthStore from './store/authStore';

function App() {
  const { token } = useAuthStore();

  useEffect(() => {
    if (token) {
      initSocket();
    }
  }, [token]);

  return <Router />;
}

export default App;
