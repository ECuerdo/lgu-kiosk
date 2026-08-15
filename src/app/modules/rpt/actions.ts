"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { uploadFile } from "@/lib/storage";

function sanitizeString(value: unknown): string {
  if (typeof value !== "string") return String(value || "");
  return value
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeObject(input: any): any {
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeObject(item));
  }
  if (input && typeof input === "object") {
    const output: Record<string, any> = {};
    for (const [key, value] of Object.entries(input as Record<string, any>)) {
      output[key] = sanitizeObject(value);
    }
    return output;
  }
  return typeof input === "string" ? sanitizeString(input) : input;
}

export async function cleanupPastDueRptAppointments(userId?: string) {
    try {
        const manilaDateString = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date());
        const [month, day, year] = manilaDateString.split("/");
        const startOfTodayManila = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

        const whereClause: any = {
            appointmentDate: {
                lt: startOfTodayManila
            },
            status: {
                notIn: ["RELEASED", "DELIVERED", "REJECTED", "PAID", "COMPLETED"]
            },
            isCancelled: false,
            type: {
                category: "RPT"
            }
        };

        if (userId) {
            whereClause.userId = userId;
        }

        const pastDueTxs = await prisma.transaction.findMany({
            where: whereClause,
            include: { type: true }
        });

        if (pastDueTxs.length > 0) {
            const pastDueIds = pastDueTxs.map(t => t.id);

            await prisma.transaction.updateMany({
                where: { id: { in: pastDueIds } },
                data: {
                    isCancelled: true,
                    status: "REJECTED",
                    rejectionRemarks: "Appointment schedule expired / missed"
                }
            });
        }
    } catch (error) {
        console.error("Error cleaning up past-due RPT appointments:", error);
    }
}

export async function fetchPropertyByTdnOrPin(query: string) {
    if (!query || query.trim().length < 2) return null;
    const q = query.trim().toUpperCase();

    try {
        // 1. Search in realPropertyTax table if model exists
        if ((prisma as any).realPropertyTax) {
            try {
                const existingRpt = await (prisma as any).realPropertyTax.findFirst({
                    where: {
                        OR: [
                            { tdn: { contains: q, mode: "insensitive" } },
                            { pin: { contains: q, mode: "insensitive" } }
                        ]
                    },
                    orderBy: { createdAt: "desc" }
                });

                if (existingRpt) {
                    return {
                        found: true,
                        tdn: existingRpt.tdn,
                        pin: existingRpt.pin || "",
                        ownerName: existingRpt.ownerName,
                        propertyAddress: existingRpt.propertyAddress,
                        barangay: existingRpt.barangay,
                        propertyType: existingRpt.propertyType,
                        assessedValue: existingRpt.assessedValue
                    };
                }
            } catch (tblErr) {
                console.warn("realPropertyTax table query fallback to additionalData:", tblErr);
            }
        }

        // 2. Search in Transaction additionalData (JSON)
        const transactions = await prisma.transaction.findMany({
            where: {
                OR: [
                    { type: { category: "RPT" } },
                    { type: { code: { startsWith: "RPT_" } } }
                ],
                isCancelled: false
            },
            include: {
                user: { include: { residentProfile: true } }
            },
            orderBy: { createdAt: "desc" },
            take: 200
        });

        for (const tx of transactions) {
            const addData = (typeof tx.additionalData === "string"
                ? JSON.parse(tx.additionalData || "{}")
                : tx.additionalData) || {};
            const tdnVal = (addData.tdn || "").toString().trim().toUpperCase();
            const pinVal = (addData.pin || "").toString().trim().toUpperCase();

            if ((tdnVal && tdnVal.includes(q)) || (pinVal && pinVal.includes(q))) {
                const resName = tx.user?.residentProfile
                    ? `${tx.user.residentProfile.firstName || ""} ${tx.user.residentProfile.lastName || ""}`.trim()
                    : tx.user?.name || "";

                return {
                    found: true,
                    tdn: addData.tdn || "",
                    pin: addData.pin || "",
                    ownerName: addData.ownerName || resName || "",
                    propertyAddress: addData.propertyAddress || "",
                    barangay: addData.barangay || "",
                    propertyType: addData.propertyType || "RESIDENTIAL",
                    assessedValue: addData.assessedValue || 0
                };
            }
        }

        return null;
    } catch (err) {
        console.error("Error searching property metadata:", err);
        return null;
    }
}

export async function submitRptAppointment(formData: FormData, userId: string) {
    try {
        if (!userId) {
            return { success: false, error: "Unauthorized. Please log in." };
        }

        const ownerName = sanitizeString(formData.get("ownerName") as string);

        // Resolve user ID logic (similar to building-permit)
        let targetUserId = userId;
        const residentForUser = await prisma.resident.findUnique({
            where: { id: userId },
            include: { user: true }
        });

        let activeUserName = ownerName;
        let activeUserEmail = "";

        if (residentForUser) {
            if (residentForUser.userId) {
                targetUserId = residentForUser.userId;
            } else {
                const fullNameTemp = [residentForUser.firstName, residentForUser.middleName, residentForUser.lastName].filter(Boolean).join(" ");
                const newUser = await prisma.user.create({
                    data: {
                        name: fullNameTemp,
                        email: residentForUser.email || null,
                        rfid: residentForUser.rfid || null,
                        role: "USER"
                    }
                });
                await prisma.resident.update({
                    where: { id: residentForUser.id },
                    data: { userId: newUser.id }
                });
                targetUserId = newUser.id;
            }
            activeUserName = [residentForUser.firstName, residentForUser.middleName, residentForUser.lastName].filter(Boolean).join(" ") || ownerName;
            activeUserEmail = residentForUser.email || "";
        }

        await cleanupPastDueRptAppointments(targetUserId);

        const categoryCode = sanitizeString(formData.get("categoryCode") as string);
        const tdn = sanitizeString(formData.get("tdn") as string);
        const pin = sanitizeString(formData.get("pin") as string);
        const propertyAddress = sanitizeString(formData.get("propertyAddress") as string);
        const barangay = sanitizeString(formData.get("barangay") as string);
        const propertyType = sanitizeString(formData.get("propertyType") as string) || "RESIDENTIAL";
        const assessedValueStr = formData.get("assessedValue") as string;
        const assessedValue = parseFloat(assessedValueStr || "0");

        const appointmentDateStr = formData.get("appointmentDate") as string;
        const appointmentSlot = sanitizeString(formData.get("appointmentSlot") as string);

        if (!categoryCode || !tdn || !ownerName || !barangay || assessedValue <= 0) {
            return { success: false, error: "Missing required property details or valid assessed value." };
        }

        if (!appointmentDateStr || !appointmentSlot) {
            return { success: false, error: "Please select a valid appointment date and time slot." };
        }

        const validIdUrl = sanitizeString(formData.get("validIdUrl") as string);
        if (!validIdUrl) {
            return { success: false, error: "Valid Government-Issued ID is required." };
        }

        const previousOrUrl = sanitizeString(formData.get("previousOrUrl") as string);
        const buildingPermitUrl = sanitizeString(formData.get("buildingPermitUrl") as string);
        const deedOfSaleUrl = sanitizeString(formData.get("deedOfSaleUrl") as string);
        const titleUrl = sanitizeString(formData.get("titleUrl") as string);
        const birEcarUrl = sanitizeString(formData.get("birEcarUrl") as string);

        // Find or create TransactionType for RPT
        let txType = await prisma.transactionType.findUnique({
            where: { code: categoryCode }
        });

        if (!txType) {
            const categoryNames: Record<string, string> = {
                RPT_CAT1: "Category 1: Routine Annual Tax Payment & Tax Clearance",
                RPT_CAT2: "Category 2: New Property Declaration & Assessment",
                RPT_CAT3: "Category 3: Transfer of Property Ownership",
            };
            txType = await prisma.transactionType.create({
                data: {
                    code: categoryCode,
                    name: categoryNames[categoryCode] || "Real Property Tax",
                    category: "RPT",
                    processorRole: (categoryCode === "RPT_CAT1" ? "TREASURY_STAFF" : "ASSESSOR") as any,
                    baseFee: 0,
                    isActive: true,
                }
            });
        }

        const basicTax = Math.round(assessedValue * 0.01 * 100) / 100;
        const sefTax = Math.round(assessedValue * 0.01 * 100) / 100;
        const totalTaxDue = basicTax + sefTax;

        const apptDate = new Date(appointmentDateStr);

        let customQueueNum = "";
        const shiftPrefix = appointmentSlot === "MORNING" ? "AM" : "PM";
        const ticketPrefix = categoryCode === "RPT_CAT1" ? "T" : "A";
        const mm = String(apptDate.getMonth() + 1).padStart(2, '0');
        const dd = String(apptDate.getDate()).padStart(2, '0');
        const yyyy = apptDate.getFullYear();
        customQueueNum = `${mm}${dd}${yyyy}-${shiftPrefix}-${ticketPrefix}001`;

        const initialStatus = categoryCode === "RPT_CAT1" ? "UNPAID" : "FOR_REQUESTING";

        const newTransaction = await prisma.transaction.create({
            data: {
                userId: targetUserId,
                typeId: txType.id,
                status: initialStatus as any,
                appointmentDate: apptDate,
                appointmentSlot: appointmentSlot,
                queueNumber: customQueueNum,
                totalAmount: totalTaxDue,
                isPaid: false,
                residentSnapshot: sanitizeObject({
                    name: activeUserName,
                    email: activeUserEmail,
                }),
                additionalData: sanitizeObject({
                    categoryCode,
                    tdn,
                    pin,
                    ownerName,
                    propertyAddress,
                    barangay,
                    propertyType,
                    assessedValue,
                    basicTax,
                    sefTax,
                    totalTaxDue,
                    appointmentSlot,
                    validIdUrl,
                    previousOrUrl,
                    buildingPermitUrl,
                    deedOfSaleUrl,
                    titleUrl,
                    birEcarUrl,
                    assessorStatus: categoryCode === "RPT_CAT1" ? "NOT_REQUIRED" : "PENDING",
                    treasuryStatus: "PENDING",
                    checkedIn: false,
                    checkedInAt: null,
                    soaReferenceCode: `SOA-RPT-${Date.now().toString().slice(-6)}`
                })
            }
        });

        revalidatePath("/modules/rpt");
        revalidatePath("/admin/treasury");
        revalidatePath("/admin/assessor");

        return {
            success: true,
            transactionId: newTransaction.id,
            queueNumber: customQueueNum,
            soaReferenceCode: (newTransaction.additionalData as any)?.soaReferenceCode,
            totalTaxDue
        };

    } catch (error: any) {
        console.error("Error submitting RPT appointment:", error);
        return { success: false, error: error?.message || "Failed to submit RPT appointment. Please try again." };
    }
}
