"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function getPHTimeISOString() {
    const now = new Date();
    // Add 8 hours for PHT
    return new Date(now.getTime() + (8 * 60 * 60 * 1000)).toISOString();
}

// ─── Log Debug Message ────────────────────────────────────────────────────────

export async function logDebugMessage(message: string) {
    console.log(`[LCR MARRIAGE APPT DEBUG] ${message}`);
}

// ─── Get Current Resident ────────────────────────────────────────────────────

export async function getCurrentUserResident(userId?: string) {
    try {
        if (!userId) return { success: false, error: "Unauthorized" };

        console.log(`[getCurrentUserResident] Querying for userId/id: "${userId}"`);
        const resident = await prisma.resident.findFirst({
            where: {
                OR: [
                    { id: userId },
                    { userId: userId }
                ]
            },
            include: { user: true }
        });
        console.log(`[getCurrentUserResident] Found resident:`, resident ? `${resident.firstName} ${resident.lastName}` : "null");
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
        { code: "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT", name: "Marriage Certified True Copy Appointment", category: "Civil Registry", baseFee: 130 },
    ];

    for (const t of types) {
        await prisma.transactionType.upsert({
            where: { code: t.code },
            create: { ...t },
            update: { name: t.name, category: t.category }
        });
    }
}

// ─── Get Registrar Appointment Config ────────────────────────────────────────

export async function getRegistrarAppointmentConfig() {
    try {
        let config = await prisma.appointmentConfig.findUnique({
            where: { department: "REGISTRAR" }
        });

        if (!config) {
            config = await prisma.appointmentConfig.create({
                data: {
                    department: "REGISTRAR",
                    maxSlots: 50,
                    maxSlotsAM: 25,
                    maxSlotsPM: 25,
                    blockedDates: [],
                    activeDays: [1, 2, 3, 4, 5]
                }
            });
        }

        const bookedSlots = await prisma.transaction.findMany({
            where: {
                appointmentDate: { not: null },
                isCancelled: false,
                type: { category: "Civil Registry" }
            },
            select: {
                appointmentDate: true,
                appointmentSlot: true
            }
        });

        return { success: true, config, bookedSlots };
    } catch (error) {
        console.error("Error fetching registrar appointment config:", error);
        return { success: false, config: null, bookedSlots: [] };
    }
}

// ─── Get Latest Form 3A For Current User ───────────────────────────────────────

export async function getLatestForm3AForCurrentUser(userId: string) {
    try {
        if (!userId) return { success: false, error: "Unauthorized" };

        const transactions = await prisma.transaction.findMany({
            where: {
                userId: userId,
                type: {
                    code: {
                        in: ["LCR_MARRIAGE", "LCR_MARRIAGE_REG"]
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
            const hasForm3A = addData.registryBookVerification === "FORM_3A" || 
                              !!addData.form3a || 
                              !!addData.form3A;
            if (hasForm3A) {
                const docUrl = addData.scannedDocUrl || 
                               addData.verificationDocUrl || 
                               addData.form3a || 
                               addData.form3A || 
                               tx.eCopyUrl;
                if (docUrl) {
                    const snap = (tx.residentSnapshot as any) || {};
                    return {
                        success: true,
                        data: {
                            transactionId: tx.id,
                            docUrl: docUrl,
                            husbandName: addData.husbandName || addData.applicant1?.fullName || addData.husbandFullName || (snap.firstName ? `${snap.firstName} ${snap.lastName}` : null),
                            wifeName: addData.wifeName || addData.applicant2?.fullName || addData.wifeFullName || null,
                            dateOfMarriage: addData.dateOfMarriage || addData.dateOfEvent || null,
                            placeOfMarriage: addData.placeOfMarriage || addData.placeOfEvent || null
                        }
                    };
                }
            }
        }

        return { success: false, error: "No issued Form 3A found for the user" };
    } catch (error) {
        console.error("getLatestForm3AForCurrentUser error:", error);
        return { success: false, error: "Failed to fetch latest Form 3A" };
    }
}

// ─── Submit Civil Registry Transaction ───────────────────────────────────────

export async function submitCivilRegistryTransaction(formData: FormData, userId: string) {
    try {
        if (!userId) return { success: false, error: "Unauthorized" };

        const typeId = formData.get("typeId") as string;
        const registryType = formData.get("registryType") as string;
        const residentSnapshotRaw = formData.get("residentSnapshot") as string;
        const additionalDataRaw = formData.get("additionalData") as string;
        const revisionId = formData.get("revisionId") as string | null;

        if (!typeId || !registryType || !residentSnapshotRaw || !additionalDataRaw) {
            return { success: false, error: "Missing required transaction data" };
        }

        const residentSnapshot = JSON.parse(residentSnapshotRaw);
        const additionalData = JSON.parse(additionalDataRaw);

        let existingTx: any = null;
        if (revisionId) {
            existingTx = await prisma.transaction.findUnique({
                where: { id: revisionId }
            });
            if (!existingTx || existingTx.userId !== userId) {
                return { success: false, error: "Transaction not found or unauthorized" };
            }
        }
        const existingAddData = existingTx?.additionalData as any || {};

        // Calculate fees
        const transType = await prisma.transactionType.findUnique({
            where: { id: typeId }
        });
        if (!transType) return { success: false, error: "Transaction type not found" };

        const miscFee = Number(transType.baseFee) || 130;
        let defaultFeesAmount = 0;
        if (transType.defaultFees) {
            try {
                const parsedDefault = typeof transType.defaultFees === "string"
                    ? JSON.parse(transType.defaultFees)
                    : transType.defaultFees;
                if (Array.isArray(parsedDefault)) {
                    defaultFeesAmount = parsedDefault.reduce((sum: number, fee: any) => sum + (Number(fee.amount) || 0), 0);
                }
            } catch (e) {
                console.error("Error parsing default fees:", e);
            }
        }

        const totalAmount = miscFee + defaultFeesAmount;
        const fiscalSnapshot = {
            basicTax: 0,
            additionalTax: 0,
            penaltyCharge: 0,
            deliveryFee: 0,
            miscFee: miscFee,
            totalAmount: totalAmount
        };

        const updatedAdditionalData = {
            ...existingAddData,
            ...additionalData,
            registryType,
            submittedAt: getPHTimeISOString(),
            miscFee
        };

        const appointmentDateVal = additionalData.appointmentDate ? new Date(additionalData.appointmentDate) : null;
        const appointmentSlotVal = additionalData.appointmentSlot || null;

        if (appointmentDateVal && appointmentSlotVal) {
            const config = await prisma.appointmentConfig.findUnique({
                where: { department: "REGISTRAR" }
            });
            const maxSlotsAM = config?.maxSlotsAM ?? 25;
            const maxSlotsPM = config?.maxSlotsPM ?? 25;

            const startOfDay = new Date(appointmentDateVal);
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(appointmentDateVal);
            endOfDay.setUTCHours(23, 59, 59, 999);

            const bookedCount = await prisma.transaction.count({
                where: {
                    appointmentDate: {
                        gte: startOfDay,
                        lte: endOfDay
                    },
                    appointmentSlot: appointmentSlotVal,
                    isCancelled: false,
                    type: { category: "Civil Registry" },
                    ...(revisionId ? { id: { not: revisionId } } : {})
                }
            });

            const isAM = appointmentSlotVal.includes("AM") || appointmentSlotVal.toUpperCase().includes("08:00 AM");
            const maxLimit = isAM ? maxSlotsAM : maxSlotsPM;

            if (bookedCount >= maxLimit) {
                return { success: false, error: "This appointment slot is already fully booked. Please select another slot." };
            }
        }

        const tx = revisionId
            ? await prisma.transaction.update({
                where: { id: revisionId },
                data: {
                    status: "FOR_INSPECTION",
                    residentSnapshot,
                    additionalData: updatedAdditionalData,
                    totalAmount: totalAmount,
                    rejectionRemarks: null,
                    updatedAt: new Date(),
                    appointmentDate: appointmentDateVal,
                    appointmentSlot: appointmentSlotVal,
                    fiscalSnapshot: fiscalSnapshot
                }
            })
            : await prisma.transaction.create({
                data: {
                    userId,
                    typeId,
                    status: "FOR_INSPECTION",
                    residentSnapshot,
                    additionalData: updatedAdditionalData,
                    totalAmount: totalAmount,
                    appointmentDate: appointmentDateVal,
                    appointmentSlot: appointmentSlotVal,
                    fiscalSnapshot: fiscalSnapshot
                }
            });

        revalidatePath("/dashboard");
        return { success: true, data: { id: tx.id } };

    } catch (error) {
        console.error("Submit civil registry transaction error:", error);
        return { success: false, error: "Failed to submit application. Please try again." };
    }
}
