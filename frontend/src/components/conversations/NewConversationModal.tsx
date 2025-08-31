import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Modal from '@/components/common/Modal';
import useUsers from '@/hooks/useUsers';
import useUserStore from '@/store/userStore';
import useConversationStore from '@/store/conversationStore';
import useAuthStore from '@/store/authStore';
import Select from 'react-select';
import api from '@/api/axios';

const schema = z.object({
  name: z.string().optional(),
  participants: z.array(z.string()).min(1, 'Please select at least one participant.'),
}).refine(data => {
  if (data.participants.length > 1) {
    return data.name && data.name.length > 0;
  }
  return true;
}, {
  message: 'Conversation name is required for group chats.',
  path: ['name'],
});

type FormData = z.infer<typeof schema>;

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewConversationModal({ isOpen, onClose }: NewConversationModalProps) {
  useUsers();
  const { users } = useUserStore();
  const { token } = useAuthStore();
  const { addConversation } = useConversationStore();
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) return;
    try {
      const response = await api.post('/conversations', {
        participants: data.participants,
        type: data.participants.length > 1 ? 'group' : 'private',
        name: data.name,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      addConversation(response.data);
      onClose();
    } catch (error) {
      console.error('Failed to create conversation:', error);
      // You might want to display an error to the user
    }
  };

  const userOptions = users.map(u => ({ value: u._id, label: u.username }));

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-bold">New Conversation</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium">Conversation Name (required for groups)</label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <input {...field} className="w-full px-3 py-2 mt-1 border rounded-md" />
            )}
          />
          {errors.name && <p className="text-red-500">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">Participants</label>
          <Controller
            name="participants"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                isMulti
                options={userOptions}
                className="mt-1"
                value={userOptions.filter(o => field.value?.includes(o.value))}
                onChange={e => field.onChange(e.map(o => o.value))}
              />
            )}
          />
          {errors.participants && <p className="text-red-500">{errors.participants.message}</p>}
        </div>
        <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-blue-500 rounded-md">
          Create Conversation
        </button>
      </form>
    </Modal>
  );
}
