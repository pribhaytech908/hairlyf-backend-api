export const uploadImage = async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Remove the Base64 prefix
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // You can now store this image or forward it, or save to disk/cloud
    // Example: fs.writeFileSync('image.png', buffer);

    res.status(200).json({ message: 'Image received successfully!' });
  } catch (err) {
    console.error('Image upload failed:', err.message);
    res.status(500).json({ error: 'Image upload failed' });
  }
};