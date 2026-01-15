export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
}

export interface UserAuthCredentials {
  email: string;
  password: string;
}
