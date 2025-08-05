// Generate and download invoice for an order
export const downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findOne({
      _id: id,
      user: req.user._id
    })
    .populate('address')
    .populate('items.productId', 'name images')
    .populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Generate invoice HTML content
    const invoiceHTML = generateInvoiceHTML(order);
    
    // For now, return the HTML content
    // In production, you would use a PDF generation library like puppeteer or pdfkit
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderNumber}.html"`);
    res.send(invoiceHTML);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating invoice'
    });
  }
};

// Helper function to generate invoice HTML
const generateInvoiceHTML = (order) => {
  const currentDate = new Date().toLocaleDateString();
  const orderDate = new Date(order.createdAt).toLocaleDateString();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Invoice - ${order.orderNumber}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .customer-details, .invoice-info { width: 48%; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total-row { font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #666; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>INVOICE</h1>
            <h2>Hairlyf</h2>
        </div>
        
        <div class="invoice-details">
            <div class="customer-details">
                <h3>Bill To:</h3>
                <p><strong>${order.address.fullName}</strong></p>
                <p>${order.address.streetAddress}</p>
                <p>${order.address.city}, ${order.address.state} ${order.address.zipCode}</p>
                <p>Phone: ${order.address.mobileNumber}</p>
                <p>Email: ${order.user.email}</p>
            </div>
            
            <div class="invoice-info">
                <h3>Invoice Details:</h3>
                <p><strong>Invoice Number:</strong> INV-${order.orderNumber}</p>
                <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p><strong>Order Date:</strong> ${orderDate}</p>
                <p><strong>Invoice Date:</strong> ${currentDate}</p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${order.items.map(item => `
                    <tr>
                        <td>
                            ${item.name}
                            ${item.size ? `<br><small>Size: ${item.size}</small>` : ''}
                            ${item.color ? `<br><small>Color: ${item.color}</small>` : ''}
                        </td>
                        <td>${item.quantity}</td>
                        <td>₹${item.price.toFixed(2)}</td>
                        <td>₹${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                `).join('')}
                
                <tr class="total-row">
                    <td colspan="3">Subtotal</td>
                    <td>₹${order.totalAmount.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                    <td colspan="3">Tax (18% GST)</td>
                    <td>₹${(order.totalAmount * 0.18).toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                    <td colspan="3">Shipping</td>
                    <td>₹0.00</td>
                </tr>
                <tr class="total-row" style="background-color: #f2f2f2;">
                    <td colspan="3"><strong>Total Amount</strong></td>
                    <td><strong>₹${(order.totalAmount + (order.totalAmount * 0.18)).toFixed(2)}</strong></td>
                </tr>
            </tbody>
        </table>
        
        <div class="footer">
            <p>Thank you for your business!</p>
            <p>For any queries, contact us at support@hairlyf.com</p>
        </div>
    </body>
    </html>
  `;
};