export const isValidPhone = (phone) => {
    const regex = /^\+?[1-9]\d{1,14}$/;
    return regex.test(phone);
  };
  
  export const sanitizePhone = (phone) => {
    return phone.replace(/[^\d+]/g, "");
  };
  