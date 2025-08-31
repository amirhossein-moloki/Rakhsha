import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import useAuthStore from '@/store/authStore';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof schema>;

export default function Register() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuthStore();
  const { register, handleSubmit, formState: { errors }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser(data.username, data.email, data.password);
      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (error) {
      setError('root', { message: 'Registration failed. Please try again.' });
      console.error('Registration failed:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center">Register</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {errors.root && <p className="text-sm text-center text-red-500">{errors.root.message}</p>}
          <div>
            <label className="block text-sm font-medium">Username</label>
            <input {...register('username')} className="w-full px-3 py-2 mt-1 border rounded-md" />
            {errors.username && <p className="text-red-500">{errors.username.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input {...register('email')} className="w-full px-3 py-2 mt-1 border rounded-md" />
            {errors.email && <p className="text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input type="password" {...register('password')} className="w-full px-3 py-2 mt-1 border rounded-md" />
            {errors.password && <p className="text-red-500">{errors.password.message}</p>}
          </div>
          <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-blue-500 rounded-md">Register</button>
        </form>
      </div>
    </div>
  );
}
