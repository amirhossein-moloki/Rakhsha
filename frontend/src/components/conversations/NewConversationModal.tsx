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
import { encryptConversationMetadata, ConversationMetadata } from '@/lib/crypto';
import { generateConversationKey, storeConversationKey } from '@/lib/key-manager';
import { Conversation } from '@/types/conversation';

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
  const { control, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) return;
    try {
      // Step 1: Create the conversation with a placeholder name
      const createResponse = await api.post('/conversations', {
        participants: data.participants,
        type: data.participants.length > 1 ? 'group' : 'private',
        name: 'Creating...', // Placeholder
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const newConvo: Conversation = createResponse.data;

      // Step 2: Generate and store a key for the new conversation
      const key = await generateConversationKey();
      await storeConversationKey(newConvo._id, key);

      // Step 3: Encrypt the actual metadata
      const conversationName = data.participants.length > 1 ? data.name : (users.find(u => u._id === data.participants[0])?.username || 'Private Chat');
      const metadata: ConversationMetadata = {
        name: conversationName!,
        participants: data.participants,
      };
      const encryptedMetadata = await encryptConversationMetadata(metadata, key);

      // Step 4: Update the conversation with the encrypted metadata
      const updateResponse = await api.put(`/conversations/${newConvo._id}`, {
        encryptedMetadata,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      addConversation(updateResponse.data);
      reset();
      onClose();
    } catch (error) {
      console.error('Failed to create conversation:', error);
      // TODO: Display an error to the user
    }
  };

  const userOptions = users.map(u => ({ value: u._id, label: u.username }));

  const selectStyles = {
    control: (styles) => ({ ...styles, backgroundColor: '#1f2937', border: '1px solid #4b5563', color: 'white' }),
    menu: (styles) => ({ ...styles, backgroundColor: '#1f2937' }),
    option: (styles, { isFocused, isSelected }) => ({
      ...styles,
      backgroundColor: isSelected ? '#860d0d' : isFocused ? '#374151' : '#1f2937',
      color: 'white',
    }),
    multiValue: (styles) => ({
      ...styles,
      backgroundColor: '#374151',
    }),
    multiValueLabel: (styles) => ({
      ...styles,
      color: 'white',
    }),
    multiValueRemove: (styles) => ({
      ...styles,
      color: 'white',
      ':hover': {
        backgroundColor: '#860d0d',
        color: 'white',
      },
    }),
    input: (styles) => ({...styles, color: 'white'}),
    singleValue: (styles) => ({...styles, color: 'white'})
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-bold">New Conversation</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">Conversation Name (required for groups)</label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <input {...field} className="w-full px-3 py-2 mt-1 border rounded-md bg-gray-800 border-gray-700 text-white" />
            )}
          />
          {errors.name && <p className="text-royal-red">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Participants</label>
          <Controller
            name="participants"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                styles={selectStyles}
                isMulti
                options={userOptions}
                className="mt-1"
                value={userOptions.filter(o => field.value?.includes(o.value))}
                onChange={e => field.onChange(e.map(o => o.value))}
              />
            )}
          />
          {errors.participants && <p className="text-royal-red">{errors.participants.message}</p>}
        </div>
        <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-royal-red rounded-md">
          Create Conversation
        </button>
      </form>
    </Modal>
  );
}
