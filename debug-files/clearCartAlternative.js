// Alternative Clear Cart Implementation (if document deletion is causing issues)
// Replace the clearCart function with this version if needed

export const clearCartAlternative = async (req, res) => {
  const cartIdentifier = getCartIdentifier(req, res);

  try {
    console.log("Clearing cart (alternative method) with identifier:", cartIdentifier);
    
    // Instead of deleting the cart document, just clear the items array
    const cart = await Cart.findOne(cartIdentifier);
    
    if (cart) {
      console.log(`Found cart with ${cart.items.length} items, clearing items...`);
      
      // Clear all items
      cart.items = [];
      
      // Save the updated cart
      await cart.save();
      console.log("Cart items cleared and saved");
      
      // Verify the items are cleared
      const updatedCart = await Cart.findOne(cartIdentifier);
      console.log(`Items after clear: ${updatedCart.items.length}`);
    } else {
      console.log("No cart found to clear");
    }
    
    res.status(200).json({
      items: [],
      summary: {
        subtotal: 0,
        totalMRP: 0,
        discount: 0,
        tax: 0,
        shipping: 0,
        total: 0,
        itemCount: 0,
        freeShippingThreshold: 500,
        remainingForFreeShipping: 500,
      },
      message: "Cart cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing cart (alternative method):", error);
    res.status(500).json({ message: error.message });
  }
};
