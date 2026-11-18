import { customerAuth } from './lib/auth/customer';

const auth = customerAuth();
if (!auth) throw new Error('Configureer DEFAULTSTACKR_AUTH_DATABASE_URL en DEFAULTSTACKR_AUTH_SECRET voor de migratie.');

export { auth };
