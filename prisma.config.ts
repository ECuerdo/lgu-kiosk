import dotenv from 'dotenv'
import { defineConfig } from 'prisma/config'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    seed: 'node ./prisma/seed-test.js',
  },
  datasource: {
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
  },
})
