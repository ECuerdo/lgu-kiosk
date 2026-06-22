"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ─── Get Current Resident ────────────────────────────────────────────────────

export async function getCurrentUserResident(userId: string) {
    try {
        if (!userId) return { success: false, error: "Unauthorized" };

        const resident = await prisma.resident.findFirst({
            where: { userId },
            include: { user: true }
        });
        return { success: true, data: resident };
    } catch (error) {
        console.error("Get current resident error:", error);
        return { success: false, error: "Failed to fetch resident profile" };
    }
}

// ─── Get System Setting ──────────────────────────────────────────────────────

export async function getSystemSettingAction(key: string, defaultValue?: string) {
    try {
        const setting = await (prisma as any).systemSetting?.findUnique({
            where: { key }
        });
        return { success: true, data: setting?.value ?? defaultValue ?? null };
    } catch {
        return { success: true, data: defaultValue ?? null };
    }
}

// ─── Get Transaction Types ───────────────────────────────────────────────────

export async function getTransactionTypes() {
    try {
        const types = await prisma.transactionType.findMany({
            orderBy: { name: "asc" }
        });
        return { success: true, data: types };
    } catch (error) {
        console.error("Get transaction types error:", error);
        return { success: false, data: [] };
    }
}

// ─── Get Transaction By ID ───────────────────────────────────────────────────

export async function getTransactionById(id: string, userId: string) {
    try {
        if (!userId) return { success: false, error: "Unauthorized" };

        const tx = await prisma.transaction.findUnique({
            where: { id },
        });
        if (!tx || tx.userId !== userId) return { success: false, error: "Transaction not found" };
        return { success: true, data: tx };
    } catch (error) {
        console.error("Get transaction by id error:", error);
        return { success: false, error: "Failed to fetch transaction" };
    }
}

// ─── Ensure Civil Registry Transaction Types Exist ───────────────────────────

export async function ensureCivilRegistryTransactionTypes() {
    const types = [
        { code: "LCR_MARRIAGE", name: "Marriage Certificate Request", category: "Civil Registry", baseFee: 150 },
    ];

    for (const t of types) {
        await prisma.transactionType.upsert({
            where: { code: t.code },
            create: { ...t },
            update: { name: t.name, category: t.category }
        });
    }
}

// ─── Submit Civil Registry Transaction ───────────────────────────────────────

export async function submitCivilRegistryTransaction(formData: FormData, userId: string) {
    try {
        if (!userId) return { success: false, error: "Unauthorized" };

        const typeId = formData.get("typeId") as string;
        const residentSnapshotRaw = formData.get("residentSnapshot") as string;
        const additionalDataRaw = formData.get("additionalData") as string;
        const revisionId = formData.get("revisionId") as string | null;

        if (!typeId) return { success: false, error: "Transaction type not specified" };

        const residentSnapshot = residentSnapshotRaw ? JSON.parse(residentSnapshotRaw) : {};
        const additionalData = additionalDataRaw ? JSON.parse(additionalDataRaw) : {};

        const transactionType = await prisma.transactionType.findUnique({ where: { id: typeId } });
        if (!transactionType) return { success: false, error: "Transaction type not found" };

        const totalAmount = additionalData.totalAmount ?? transactionType.baseFee ?? 150;

        if (revisionId) {
            const existing = await prisma.transaction.findUnique({ where: { id: revisionId } });
            if (!existing || existing.userId !== userId) {
                return { success: false, error: "Transaction not found or unauthorized" };
            }

            await prisma.transaction.update({
                where: { id: revisionId },
                data: {
                    status: "FOR_INSPECTION",
                    isCancelled: false,
                    additionalData: additionalData,
                    residentSnapshot: residentSnapshot,
                    totalAmount: totalAmount,
                }
            });

            revalidatePath("/dashboard");
            return { success: true, data: { id: revisionId } };
        }

        const tx = await prisma.transaction.create({
            data: {
                userId,
                typeId,
                status: "FOR_INSPECTION",
                residentSnapshot,
                additionalData,
                totalAmount,
            }
        });

        revalidatePath("/dashboard");
        return { success: true, data: { id: tx.id } };

    } catch (error) {
        console.error("Submit civil registry transaction error:", error);
        return { success: false, error: "Failed to submit application. Please try again." };
    }
}

// ─── Get Secure Upload URL ───────────────────────────────────────────────────

export async function getSecureUploadUrlAction(fieldName: string, folder: string, fileExt: string, userId: string) {
    try {
        if (!userId) return { success: false as const, error: "Unauthorized" };

        const sanitizedField = fieldName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const timestamp = Date.now();
        const path = `${folder}/${userId}/${sanitizedField}-${timestamp}.${fileExt}`;
        const bucket = "system-assets";

        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .createSignedUploadUrl(path);

        if (error || !data?.signedUrl) {
            return { success: false as const, error: error?.message || "Failed to create signed URL" };
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(path);

        return { success: true as const, signedUrl: data.signedUrl, publicUrl };
    } catch (error) {
        console.error("Get secure upload URL error:", error);
        return { success: false as const, error: "Upload service unavailable" };
    }
}

// ─── Search Residents Action ─────────────────────────────────────────────────

export async function searchResidentsAction(query: string) {
    try {
        if (!query || query.trim().length < 2) return { success: true, data: [] };

        const normalizedQuery = query.trim();

        const residents = await prisma.resident.findMany({
            where: {
                OR: [
                    { firstName: { contains: normalizedQuery, mode: "insensitive" } },
                    { middleName: { contains: normalizedQuery, mode: "insensitive" } },
                    { lastName: { contains: normalizedQuery, mode: "insensitive" } },
                ]
            },
            take: 10
        });

        return { success: true, data: residents };
    } catch (error) {
        console.error("Search residents error:", error);
        return { success: false, error: "Failed to search residents" };
    }
}

// ─── Get Resident Data By ID Action ─────────────────────────────────────────

export async function getResidentDataByIdAction(id: string) {
    try {
        const resident = await prisma.resident.findUnique({
            where: { id }
        });
        return { success: true, data: resident };
    } catch (error) {
        console.error("Get resident by id error:", error);
        return { success: false, error: "Failed to fetch resident details" };
    }
}

// ─── Get Existing Marriage Certificate Requests ──────────────────────────────

export async function getExistingMarriageCertificateRequests(userId: string) {
    try {
        if (!userId) return { success: false, data: [] };

        const type = await prisma.transactionType.findFirst({
            where: { code: "LCR_MARRIAGE" }
        });

        if (!type) return { success: false, data: [] };

        const transactions = await prisma.transaction.findMany({
            where: {
                userId: userId,
                typeId: type.id
            },
            orderBy: { createdAt: "desc" }
        });

        return { success: true, data: transactions };
    } catch (error) {
        console.error("Error fetching existing marriage cert requests:", error);
        return { success: false, data: [] };
    }
}
