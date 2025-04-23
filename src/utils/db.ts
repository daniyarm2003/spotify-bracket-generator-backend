import { PrismaClient } from '../generated/prisma';

export default function createDatabaseClient() {
    return new PrismaClient();
}