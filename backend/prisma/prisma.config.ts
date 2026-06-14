import { defineConfig } from '@prisma/config';

export default defineConfig({
  db: {
    url: 'postgresql://sacco_user:sacco_pass@localhost:5432/jenga_wealth?schema=public',
  },
});
