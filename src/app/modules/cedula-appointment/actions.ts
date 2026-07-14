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
        code: { in: ["CEDULA_IND", "CEDULA_JUR", "CEDULA_STUDENT"] }
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
    let treasuryConfig = await prisma.appointmentConfig.findUnique({
      where: { department: "TREASURY" }
    });

    if (!treasuryConfig) {
      treasuryConfig = await prisma.appointmentConfig.create({
        data: {
          department: "TREASURY",
          maxSlots: 50,
          blockedDates: [],
          activeDays: [1, 2, 3, 4, 5]
        }
      });
    }
    return { success: true, data: treasuryConfig };
  } catch (error) {
    console.error("Get appointment config error:", error);
    return { success: false, error: "Failed to fetch Treasury slot configurations" };
  }
}

export async function getBookedSlots() {
  try {
    const booked = await prisma.transaction.findMany({
      where: {
        appointmentDate: { not: null },
        isCancelled: false,
        type: { category: "CEDULA" }
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

export async function getSystemThemeColor() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "theme_color" }
    });
    return { success: true, data: setting?.value || "#059669" };
  } catch (error) {
    console.error("Get system theme color error:", error);
    return { success: false, data: "#059669" };
  }
}

export async function cleanupPastDueCedulaAppointments(userId?: string) {
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
        category: "CEDULA"
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
    console.error("Error cleaning up past-due appointments:", error);
  }
}

export async function submitCedulaAppointment(formData: FormData, userId: string) {
  try {
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Automatically cancel/reject any past-due appointments before verifying active transaction
    await cleanupPastDueCedulaAppointments(userId);

    const typeId = formData.get("typeId") as string;
    const appointmentSlot = formData.get("appointmentSlot") as string;
    const appointmentDate = new Date(formData.get("appointmentDate") as string);

    // Check if there is an existing active request of the same type
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
        error: `You currently have an ongoing request for "${txType.name}". Please wait for it to be completed (Released) or cancelled before requesting another one.`
      };
    }

    // Parse resident snapshot and additional data
    const residentSnapshot = JSON.parse(formData.get("residentSnapshot") as string);
    const additionalData = JSON.parse(formData.get("additionalData") as string);

    // For kiosk, document files can be uploaded or checked from handoff.
    // If there is handoff URLs, we use them.
    const idUrl = formData.get("existingIdUrl") as string || null;
    const proofUrl = formData.get("existingProofUrl") as string || null;

    // Merge file URLs into additionalData
    const updatedAdditionalData = {
      ...additionalData,
      validIdUrl: idUrl,
      proofOfIncomeUrl: proofUrl
    };

    // Check if the slot is still available
    const config = await prisma.appointmentConfig.findUnique({
      where: { department: "TREASURY" }
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
        type: { category: "CEDULA" }
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
      category: "CEDULA"
    });

    // Create transaction and update resident details in database
    const transaction = await prisma.$transaction(async (tx) => {
      const newTx = await tx.transaction.create({
        data: {
          userId: userId,
          typeId,
          status: "FOR_REQUESTING",
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
    console.error("Submit appointment transaction error:", error);
    return { success: false, error: "Failed to book appointment" };
  }
}
