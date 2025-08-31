import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import useAuthStore from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const schema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof schema>;

export default function Register() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuthStore();
  const [successMessage, setSuccessMessage] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setSuccessMessage('');
      await registerUser(data.username, data.email, data.password);
      setSuccessMessage('Registration successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
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
          {successMessage && <p className="text-sm text-center text-green-500">{successMessage}</p>}
          <div>
            <label htmlFor="username" className="block text-sm font-medium">Username</label>
            <input id="username" {...register('username')} className="w-full px-3 py-2 mt-1 border rounded-md" />
            {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>}
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <input id="email" type="email" {...register('email')} className="w-full px-3 py-2 mt-1 border rounded-md" />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">Password</label>
            <input id="password" type="password" {...register('password')} className="w-full px-3 py-2 mt-1 border rounded-md" />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !!successMessage}
            className="w-full px-4 py-2 font-bold text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}
