export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  ciphertextPayload: any; // This will be the encrypted payload
  timestamp: string;
  // The decrypted content will be added to the object on the fly
  content?: string;
}
