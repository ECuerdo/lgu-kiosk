/**
 * Business Permit Calculation Logic
 * Based on the LGU Online Services Portal Documentation
 */

export type BusinessPermitType = "NEW" | "RENEWAL";

export interface BusinessPermitCalculationParams {
    type: BusinessPermitType;
    capitalization: number;
    grossSales?: number;
    fulfillmentType?: "PICK_UP" | "DELIVERY" | "E_COPY" | null;
    deliveryFee?: number;
}

export interface BusinessPermitResult {
    baseFee: number;
    taxAmount: number;
    regulatoryFee: number; // Placeholder for future municipal regulatory inspections (e.g. Sanitary/Zoning)
    deliveryFee: number;
    totalAmount: number;
}

/**
 * Computes the Business Permit assessed tax amount.
 * 
 * Formula from Vertex Tech Corp Spec: 
 * Assessed Tax Bill = (Declared Capitalization * 1%) + Base Mayor's Permit Fee (₱500.00)
 * 
 * Constraint: This computed amount is strictly read-only and cannot be manually overridden.
 */
export function calculateBusinessPermit(params: BusinessPermitCalculationParams): BusinessPermitResult {
    const {
        type,
        capitalization,
        grossSales = 0,
        fulfillmentType = "PICK_UP",
        deliveryFee = 0
    } = params;

    // Mayors Permit Base Fee is strictly ₱500.00
    const baseFee = 500.00;

    // Strict Spec Formula: Declared Capitalization * 1%
    // If it's a renewal, we can fall back to gross sales or capitalization based on what was declared.
    const basisAmount = type === "NEW" ? capitalization : (grossSales || capitalization || 0);
    const taxAmount = basisAmount * 0.01;

    // Regulatory fees placeholder (set to 0 to align exactly with the (Capitalization * 1%) + 500 formula)
    const regulatoryFee = 0.00;

    // Delivery Fee (added external to the tax base)
    const finalDeliveryFee = fulfillmentType === "DELIVERY" ? deliveryFee : 0;

    return {
        baseFee,
        taxAmount,
        regulatoryFee,
        deliveryFee: finalDeliveryFee,
        totalAmount: baseFee + taxAmount + regulatoryFee + finalDeliveryFee
    };
}
