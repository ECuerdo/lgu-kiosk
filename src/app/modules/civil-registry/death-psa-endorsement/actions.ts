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

// ─── Ensure Civil Registry Transaction Types Exist ───────────────────────────

export async function ensureCivilRegistryTransactionTypes() {
    const types = [
        { code: "LCR_DEATH_PSA_ENDORSEMENT", name: "Death PSA Endorsement", category: "Civil Registry", baseFee: 150 },
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

        const totalAmount = additionalData.totalAmount ?? transactionType.baseFee ?? 0;

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

// ─── Get Latest Form 2A For Current User ───────────────────────────────────────

export async function getLatestForm2AForCurrentUser(userId: string) {
    try {
        if (!userId) return { success: false, error: "Unauthorized" };

        const transactions = await prisma.transaction.findMany({
            where: {
                userId: userId,
                type: {
                    code: {
                        in: ["LCR_DEATH", "LCR_DEATH_REG"]
                    }
                }
            },
            include: {
                type: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        for (const tx of transactions) {
            const addData = (tx.additionalData as any) || {};
            const hasForm2A = addData.registryBookVerification === "FORM_2A" || 
                              addData.registryBookVerification === "FORM_1A" || 
                              !!addData.form2a || 
                              !!addData.form2A;
            if (hasForm2A) {
                const docUrl = addData.scannedDocUrl || 
                               addData.verificationDocUrl || 
                               addData.form2a || 
                               addData.form2A || 
                               tx.eCopyUrl;
                if (docUrl) {
                    const snap = (tx.residentSnapshot as any) || {};
                    return {
                        success: true,
                        data: {
                            transactionId: tx.id,
                            docUrl: docUrl,
                            subjectName: addData.subjectName || addData.fullName || addData.deceasedFullName || addData.deceasedName || (snap.firstName ? `${snap.firstName} ${snap.lastName}` : null),
                            dateOfDeath: addData.dateOfDeath || addData.deceasedDateOfDeath || addData.dateOfEvent || null,
                            mothersMaidenName: addData.mothersMaidenName || addData.mothersName || addData.motherName || addData.deceasedMotherName || null,
                            fathersName: addData.fathersName || addData.fatherName || addData.deceasedFatherName || null,
                            placeOfDeath: addData.placeOfDeath || addData.deceasedPlaceOfDeath || addData.placeOfEvent || null,
                            causeOfDeath: addData.causeOfDeath || addData.deceasedCauseOfDeath || null
                        }
                    };
                }
            }
        }

        return { success: false, error: "No issued Form 2A found for the user" };
    } catch (error) {
        console.error("getLatestForm2AForCurrentUser error:", error);
        return { success: false, error: "Failed to fetch latest Form 2A" };
    }
}

// ─── Get Existing PSA Endorsement Requests ───────────────────────────────────

export async function getExistingPsaEndorsements(userId: string) {
    try {
        if (!userId) return { success: false, data: [] };

        const type = await prisma.transactionType.findFirst({
            where: { code: "LCR_DEATH_PSA_ENDORSEMENT" }
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
        console.error("Error fetching existing PSA endorsements:", error);
        return { success: false, data: [] };
    }
}
