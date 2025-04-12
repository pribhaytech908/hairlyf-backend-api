import cloudinary from '../config/cloudinary.js';
import fs from 'fs';

export const uploadImageToCloudinary = async (filePath, folderName = 'products') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folderName,
      resource_type: 'image',
    });

    fs.unlinkSync(filePath);

    return {
      public_id: result.public_id,
      url: result.secure_url,
    };
  } catch (error) {
    throw new Error('Image upload failed: ' + error.message);
  }
};

export const uploadMultipleImages = async (files, folderName = 'products') => {
  const uploadResults = [];

  for (const file of files) {
    const upload = await uploadImageToCloudinary(file.path, folderName);
    uploadResults.push(upload);
  }

  return uploadResults;
};
