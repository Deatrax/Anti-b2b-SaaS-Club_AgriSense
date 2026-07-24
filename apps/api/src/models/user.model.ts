// M — users. Phone is the identity (no OTP — §A.3 "phone as a plain identifier").
import { query } from '../config/db';

export interface UserRow {
  id: string;
  phone: string;
  name: string | null;
  lang: string;
}

export const UserModel = {
  async findByPhone(phone: string): Promise<UserRow | null> {
    const [row] = await query<UserRow>('select * from users where phone = $1', [phone]);
    return row ?? null;
  },

  async get(id: string): Promise<UserRow | null> {
    const [row] = await query<UserRow>('select * from users where id = $1', [id]);
    return row ?? null;
  },

  async create(phone: string, name?: string, lang = 'bn'): Promise<UserRow> {
    const [row] = await query<UserRow>(
      'insert into users (phone, name, lang) values ($1, $2, $3) returning *',
      [phone, name ?? null, lang],
    );
    return row!;
  },
};
