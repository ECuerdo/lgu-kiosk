"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ─── Helpers ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getAuthUserId(): Promise<string | null> {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("next-auth.session-token") || cookieStore.get("__Secure-next-auth.session-token");
        if (!sessionCookie) return null;
        const session = await prisma.session.findUnique({
            where: { sessionToken: sessionCookie.value },
            select: { userId: true }
        });
        return session?.userId ?? null;
    } catch {
        return null;
    }
}

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

export async function getSystemSettingAction(key: string) {
    try {
        const setting = await (prisma as any).systemSetting?.findUnique({
            where: { key }
        });
        return { success: true, data: setting?.value ?? null };
    } catch {
        return { success: true, data: null };
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

// ─── Get Barangays List ──────────────────────────────────────────────────────

export async function getBarangaysList() {
    try {
        const barangays = await prisma.barangayInfo.findMany({
            select: { name: true },
            orderBy: { name: "asc" }
        });
        return { success: true, data: barangays.map((b) => b.name) };
    } catch (error) {
        console.error("Get barangays error:", error);
        return { success: false, data: [] as string[] };
    }
}

export async function ensureCivilRegistryTransactionTypes() {
    const types = [
        { 
            code: "LCR_BIRTH_REG", 
            name: "Birth Registration", 
            category: "Civil Registry", 
            baseFee: 100,
            defaultFees: [
                { "code": "PROCESSING_FEE", "name": "Processing & e-Copy Fee", "amount": 215 },
                { "code": "LATE_FEE_1_10", "name": "Late Fee (1-10 years)", "amount": 315 },
                { "code": "LATE_FEE_10_20", "name": "Late Fee (10-20 years)", "amount": 515 },
                { "code": "LATE_FEE_20_UP", "name": "Late Fee (20+ years)", "amount": 1015 }
            ]
        },
        { code: "LCR_BIRTH", name: "Birth Certificate Request (True Copy)", category: "Civil Registry", baseFee: 100 },
    ];

    for (const t of types) {
        const existing = await prisma.transactionType.findUnique({ where: { code: t.code } });
        const hasDefaultFees = existing && Array.isArray(existing.defaultFees) && (existing.defaultFees as any).length > 0;

        await prisma.transactionType.upsert({
            where: { code: t.code },
            create: { ...t },
            update: { 
                name: t.name, 
                category: t.category,
                ...(!hasDefaultFees && t.defaultFees ? { defaultFees: t.defaultFees } : {})
            }
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

        const totalAmount = additionalData.totalAmount ?? transactionType.baseFee ?? 0;

        if (revisionId) {
            // Update existing transaction for revision
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
            return { success: true, transactionId: revisionId, redirectUrl: "/dashboard" };
        }

        // Create new transaction
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
        return { success: true, transactionId: tx.id, redirectUrl: "/dashboard" };

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

// ─── Get Existing Birth Registrations ────────────────────────────────────────

export async function getExistingBirthRegistrations(userId: string) {
    try {
        if (!userId) return { success: false, data: [] };

        const type = await prisma.transactionType.findFirst({
            where: { code: "LCR_BIRTH_REG" }
        });

        if (!type) return { success: false, data: [] };

        const transactions = await prisma.transaction.findMany({
            where: {
                userId: userId,
                typeId: type.id
            },
            orderBy: { createdAt: 'desc' }
        });

        return { success: true, data: transactions };
    } catch (error) {
        console.error("Error fetching existing birth registrations:", error);
        return { success: false, data: [] };
    }
}

// ─── Cancel Birth Registration ───────────────────────────────────────────────

export async function cancelBirthRegistration(id: string, userId: string) {
    try {
        if (!userId) return { success: false, error: "Unauthorized" };

        const tx = await prisma.transaction.findUnique({
            where: { id }
        });

        if (!tx) return { success: false, error: "Transaction not found" };
        if (tx.userId !== userId) return { success: false, error: "Forbidden" };
        if (tx.isCancelled) return { success: false, error: "This request is already cancelled." };

        const restrictedStatuses = [
            "FOR_PROCESSING",
            "EVALUATED",
            "FOR_CLAIM",
            "FOR_PICKING",
            "IN_ROUTE",
            "DELIVERED",
            "PAID",
            "RELEASED",
            "REJECTED"
        ];
        if (restrictedStatuses.includes(tx.status)) {
            return { success: false, error: "Cannot cancel transaction at this stage. Please contact support." };
        }

        await prisma.transaction.update({
            where: { id },
            data: { isCancelled: true }
        });

        revalidatePath("/modules/civil-registry/birth-registration");
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Cancel transaction error:", error);
        return { success: false, error: "Failed to cancel transaction" };
    }
}

// ─── Search Residents Action ─────────────────────────────────────────────────

export async function searchResidentsAction(query: string, gender?: string) {
    try {
        if (!query || query.trim().length < 2) return { success: true, data: [] };

        const normalizedQuery = query.trim();

        const OR_clause: any[] = [
            { firstName: { contains: normalizedQuery, mode: "insensitive" } },
            { middleName: { contains: normalizedQuery, mode: "insensitive" } },
            { lastName: { contains: normalizedQuery, mode: "insensitive" } },
        ];

        let whereClause: any = { OR: OR_clause };

        if (gender) {
            whereClause = {
                AND: [
                    { OR: OR_clause },
                    { gender: { equals: gender, mode: "insensitive" } }
                ]
            };
        }

        const residents = await prisma.resident.findMany({
            where: whereClause,
            take: 10
        });

        return { success: true, data: residents };
    } catch (error) {
        console.error("Search residents error:", error);
        return { success: false, error: "Failed to search residents" };
    }
}

