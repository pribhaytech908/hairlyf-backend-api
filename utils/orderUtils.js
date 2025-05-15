/**
 * Calculate the total amount for an order
 * @param {Object} order - The order object with populated product details
 * @returns {Number} - The total amount
 */
export const calculateOrderAmount = (order) => {
    let total = 0;

    // Calculate subtotal from items
    for (const item of order.items) {
        const price = item.product.price;
        const quantity = item.quantity;
        total += price * quantity;
    }

    // Add shipping cost if present
    if (order.shippingCost) {
        total += order.shippingCost;
    }

    // Apply discount if present
    if (order.discount) {
        if (order.discount.type === 'percentage') {
            total = total * (1 - order.discount.value / 100);
        } else if (order.discount.type === 'fixed') {
            total = total - order.discount.value;
        }
    }

    // Add tax if present
    if (order.tax) {
        total += (total * order.tax) / 100;
    }

    // Round to 2 decimal places
    return Math.round(total * 100) / 100;
}; 