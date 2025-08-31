import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import useAuthStore from '@/store/authStore';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  secondaryPassword: z.string().min(8, 'Secondary password must be at least 8 characters'),
});

type FormData = z.infer<typeof schema>;

export default function SecretLogin() {
  const navigate = useNavigate();
  const { secretLogin } = useAuthStore();
  const { register, handleSubmit, formState: { errors }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await secretLogin(data.username, data.secondaryPassword);
      navigate('/');
    } catch (error) {
      setError('root', { message: 'Login failed. Please check your credentials.' });
      console.error('Secret login failed:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center">Secret Login</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {errors.root && <p className="text-sm text-center text-red-500">{errors.root.message}</p>}
          <div>
            <label className="block text-sm font-medium">Username</label>
            <input {...register('username')} className="w-full px-3 py-2 mt-1 border rounded-md" />
            {errors.username && <p className="text-red-500">{errors.username.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">Secondary Password</label>
            <input type="password" {...register('secondaryPassword')} className="w-full px-3 py-2 mt-1 border rounded-md" />
            {errors.secondaryPassword && <p className="text-red-500">{errors.secondaryPassword.message}</p>}
          </div>
          <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-purple-500 rounded-md">Login to Secret Mode</button>
        </form>
      </div>
    </div>
  );
}
