"use server";

import { prisma } from "@/lib/prisma";
import { generateQueueNumber } from "@/lib/queue";
import { revalidatePath } from "next/cache";

export async function getCurrentUserResident(userId: string) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };
    const resident = await prisma.resident.findFirst({
      where: { userId: userId },
      include: { user: true }
    });
    return { success: true, data: resident };
  } catch (error) {
    console.error("Get current resident error:", error);
    return { success: false, error: "Failed to fetch resident profile" };
  }
}

export async function getTransactionTypes() {
  try {
    const types = await prisma.transactionType.findMany({
      where: {
        isActive: true,
        code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] }
      }
    });
    return { success: true, data: types };
  } catch (error) {
    console.error("Get transaction types error:", error);
    return { success: false, error: "Failed to fetch transaction types" };
  }
}

export async function getAppointmentConfig() {
  try {
    let bploConfig = await prisma.appointmentConfig.findUnique({
      where: { department: "BPLO" }
    });

    if (!bploConfig) {
      bploConfig = await prisma.appointmentConfig.create({
        data: {
          department: "BPLO",
          maxSlots: 50,
          blockedDates: [],
          activeDays: [1, 2, 3, 4, 5]
        }
      });
    }
    return { success: true, data: bploConfig };
  } catch (error) {
    console.error("Get appointment config error:", error);
    return { success: false, error: "Failed to fetch BPLO slot configurations" };
  }
}

export async function getBookedSlots() {
  try {
    const booked = await prisma.transaction.findMany({
      where: {
        appointmentDate: { not: null },
        isCancelled: false,
        type: { code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] } }
      },
      select: {
        appointmentDate: true,
        appointmentSlot: true
      }
    });
    return { success: true, data: booked };
  } catch (error) {
    console.error("Get booked slots error:", error);
    return { success: false, error: "Failed to fetch booked slots" };
  }
}

export async function getPreviousPermits(userId: string) {
  try {
    const permits = await prisma.transaction.findMany({
      where: {
        userId,
        status: "RELEASED",
        type: {
          code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] }
        }
      },
      include: {
        businessPermit: true
      } as any,
      orderBy: {
        createdAt: "desc"
      }
    });
    return { success: true, data: permits };
  } catch (error) {
    console.error("Get previous permits error:", error);
    return { success: false, error: "Failed to fetch previous permits" };
  }
}

export async function cleanupPastDueBusinessAppointments(userId?: string) {
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
        notIn: ["RELEASED", "DELIVERED", "REJECTED"]
      },
      isCancelled: false,
      type: {
        code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] }
      }
    };

    if (userId) {
      whereClause.userId = userId;
    }

    await prisma.transaction.updateMany({
      where: whereClause,
      data: {
        isCancelled: true,
        status: "REJECTED",
        rejectionRemarks: "Appointment slot expired / missed"
      }
    });
  } catch (error) {
    console.error("Error cleaning up past-due business appointments:", error);
  }
}

export async function submitBusinessAppointment(formData: FormData, userId: string) {
  try {
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    await cleanupPastDueBusinessAppointments(userId);

    const typeId = formData.get("typeId") as string;
    const appointmentSlot = formData.get("appointmentSlot") as string;
    const appointmentDate = new Date(formData.get("appointmentDate") as string);

    const txType = await prisma.transactionType.findUnique({
      where: { id: typeId }
    });
    if (!txType) {
      return { success: false, error: "Invalid transaction type." };
    }

    const activeTx = await prisma.transaction.findFirst({
      where: {
        userId: userId,
        type: {
          code: txType.code
        },
        status: {
          notIn: ["RELEASED", "DELIVERED", "REJECTED"]
        },
        isCancelled: false
      }
    });
    if (activeTx) {
      return {
        success: false,
        error: `You currently have an ongoing request for "${txType.name}". Please wait for it to be completed or cancelled before requesting another one.`
      };
    }

    const residentSnapshot = JSON.parse(formData.get("residentSnapshot") as string);
    const additionalData = JSON.parse(formData.get("additionalData") as string);

    // Kiosk handles file upload URLs via handoff/session.
    const idUrl = formData.get("existingIdUrl") as string || null;
    const brgyUrl = formData.get("existingBrgyUrl") as string || null;
    const dtiSecUrl = formData.get("existingDtiSecUrl") as string || null;
    const ctcUrl = formData.get("existingCtcUrl") as string || null;
    const sanitaryPermitUrl = formData.get("existingSanitaryPermitUrl") as string || null;
    const fireSafetyUrl = formData.get("existingFireSafetyUrl") as string || null;
    const previousPermitUrl = formData.get("existingPreviousPermitUrl") as string || null;
    const birCorUrl = formData.get("existingBirCorUrl") as string || null;
    const locationPhotoUrl = formData.get("existingLocationPhotoUrl") as string || null;

    const updatedAdditionalData = {
      ...additionalData,
      ownerIdUrl: idUrl,
      brgyClearanceUrl: brgyUrl,
      dtiSecUrl: dtiSecUrl,
      ctcUrl: ctcUrl,
      sanitaryPermitUrl: sanitaryPermitUrl,
      fireSafetyUrl: fireSafetyUrl,
      previousPermitUrl: previousPermitUrl,
      birCorUrl: birCorUrl,
      locationPhotoUrl: locationPhotoUrl,
    };

    // Check if the slot is still available
    const config = await prisma.appointmentConfig.findUnique({
      where: { department: "BPLO" }
    }) as any;
    const maxSlotsAM = config?.maxSlotsAM ?? 25;
    const maxSlotsPM = config?.maxSlotsPM ?? 25;

    const startOfDay = new Date(appointmentDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const bookedCount = await prisma.transaction.count({
      where: {
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        appointmentSlot: appointmentSlot,
        isCancelled: false,
        type: {
          code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] }
        }
      }
    });

    const isAM = appointmentSlot.includes("AM") || appointmentSlot.toUpperCase().includes("08:00 AM");
    const maxLimit = isAM ? maxSlotsAM : maxSlotsPM;

    if (bookedCount >= maxLimit) {
      return { success: false, error: "This appointment slot is already fully booked. Please select another slot." };
    }

    const isPriority = additionalData.isPriorityLane === true || additionalData.isPriorityLane === "true";

    const queueNumber = await generateQueueNumber({
      source: "kiosk",
      isPriority,
      appointmentDate: startOfDay,
      appointmentSlot,
    });

    const transaction = await prisma.$transaction(async (tx) => {
      const newTx = await tx.transaction.create({
        data: {
          userId: userId,
          typeId,
          status: "FOR_INSPECTION",
          residentSnapshot,
          additionalData: {
            ...updatedAdditionalData,
            isPriorityLane: isPriority
          },
          totalAmount: 0,
          appointmentDate,
          appointmentSlot,
          queueNumber,
          isPriority,
          businessName: additionalData.businessName || null,
        } as any
      });

      await tx.resident.update({
        where: { userId: userId },
        data: {
          firstName: residentSnapshot.firstName,
          middleName: residentSnapshot.middleName,
          lastName: residentSnapshot.lastName,
          suffix: residentSnapshot.suffix,
          dateOfBirth: residentSnapshot.dateOfBirth ? new Date(residentSnapshot.dateOfBirth) : undefined,
          civilStatus: residentSnapshot.civilStatus,
          citizenship: residentSnapshot.citizenship,
          houseNumber: residentSnapshot.houseNumber,
          street: residentSnapshot.street,
          barangay: residentSnapshot.barangay,
          municipality: residentSnapshot.municipality,
          province: residentSnapshot.province,
          contactNumber: residentSnapshot.contactNumber,
          email: residentSnapshot.email,
        }
      });

      return newTx;
    });

    revalidatePath("/dashboard/appointment");
    return { success: true, data: transaction };
  } catch (error) {
    console.error("Submit business appointment error:", error);
    return { success: false, error: "Failed to book business permit appointment" };
  }
}
