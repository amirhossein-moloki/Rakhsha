import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Modal from '@/components/common/Modal';
import useUsers from '@/hooks/useUsers';
import useUserStore from '@/store/userStore';
import Select from 'react-select';

const schema = z.object({
  name: z.string().min(3),
  participants: z.array(z.string()).min(1),
});

type FormData = z.infer<typeof schema>;

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewConversationModal({ isOpen, onClose }: NewConversationModalProps) {
  useUsers();
  const { users } = useUserStore();
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    console.log('New conversation data:', data);
    // TODO: Implement the full conversation creation logic
    onClose();
  };

  const userOptions = users.map(u => ({ value: u._id, label: u.username }));

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-bold">New Conversation</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium">Conversation Name</label>
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
