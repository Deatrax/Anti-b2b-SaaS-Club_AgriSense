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

  /** OTP verify creates the user before their name is known — onboarding (farm creation)
   * is where a first-time farmer actually gives their name, so it's set here instead. */
  async update(id: string, patch: { name?: string; lang?: string }): Promise<UserRow> {
    const keys = Object.keys(patch) as (keyof typeof patch)[];
    if (keys.length === 0) {
      const existing = await this.get(id);
      if (!existing) throw new Error(`user ${id} not found`);
      return existing;
    }
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = keys.map((k) => patch[k]);
    const [row] = await query<UserRow>(`update users set ${setClause} where id = $1 returning *`, [id, ...values]);
    if (!row) throw new Error(`user ${id} not found`);
    return row;
  },

  /** Cascades through farms → fields → crop_cycles → everything (all FKs are ON DELETE
   * CASCADE, §B.3) — one delete removes the whole account's data, not just the user row. */
  async delete(id: string): Promise<void> {
    await query('delete from users where id = $1', [id]);
  },
};
