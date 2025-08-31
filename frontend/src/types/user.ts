export interface User {
  _id: string;
  username: string;
  email: string;
  profilePictureUrl?: string;
  settings: {
    readReceiptsEnabled: boolean;
    secretPriceInterval: number;
  };
}
