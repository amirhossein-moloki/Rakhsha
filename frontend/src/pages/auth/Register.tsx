import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { generateIdentity } from '@/lib/crypto';
import api from '@/api/axios';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

export default function Register() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const identity = await generateIdentity();
      const publicKeys = {
        identityKey: Buffer.from(identity.identityKey).toString('hex'),
        signedPreKey: {
          keyId: identity.signedPreKey.keyId,
          publicKey: Buffer.from(identity.signedPreKey.publicKey).toString('hex'),
          signature: Buffer.from(identity.signedPreKey.signature).toString('hex'),
        },
        oneTimePreKeys: identity.oneTimePreKeys.map(k => ({
            keyId: k.keyId,
            publicKey: Buffer.from(k.publicKey).toString('hex'),
        })),
      };

      await api.post('/auth/register', {
        ...data,
        ...publicKeys,
      });

      // Store the private keys in the auth store.
      // This is NOT secure and should not be used in production.
      const { setPrivateKeys } = useAuthStore.getState();
      setPrivateKeys(identity._private);

      navigate('/login');
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center">Register</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
