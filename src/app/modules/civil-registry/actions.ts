"use server";

import { prisma } from "@/lib/prisma";

export async function getCivilRegistryStatus() {
  try {
    const types = await prisma.transactionType.findMany({
      select: {
        code: true,
        isActive: true,
      },
    });
    return { success: true, data: types };
  } catch (error) {
    console.error("Get civil registry status error:", error);
    return { success: false, data: [] };
  }
}
