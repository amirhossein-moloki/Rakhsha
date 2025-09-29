import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/api/axios';
import useAuthStore from '@/store/authStore';

const schema = z.object({
  secondaryPassword: z.string().min(8, { message: "String must contain at least 8 character(s)" }),
});

type FormData = z.infer<typeof schema>;

export default function SettingsPage() {
  const { token } = useAuthStore();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/users/secondary-password', data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Secondary password set successfully!');
    } catch (error) {
      console.error('Failed to set secondary password:', error);
      alert('Failed to set secondary password.');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl">Settings</h1>
      <div className="max-w-md mt-4">
        <h2 className="text-xl">Set Secondary Password</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-4">
          <div>
            <label htmlFor="secondaryPasswordInput" className="block text-sm font-medium">Secondary Password</label>
            <input
              id="secondaryPasswordInput"
              type="password"
              {...register('secondaryPassword')}
              className="w-full px-3 py-2 mt-1 border rounded-md"
            />
            {errors.secondaryPassword && <p className="text-red-500">{errors.secondaryPassword.message}</p>}
          </div>
          <button type="submit" className="px-4 py-2 font-bold text-white bg-blue-500 rounded-md">
            Set Password
          </button>
        </form>
      </div>
    </div>
  );
}