import axios from 'axios';

export const swapHairProxy = async (req, res) => {
  try {
    const response = await axios.post(
      'http://hairgain-lb-242445726.us-east-1.elb.amazonaws.com/swap_hair_file',
      req.body,
      {
        headers: {
          'Content-Type': req.headers['content-type'],
          'Accept': 'image/png',
        },
        responseType: 'arraybuffer',
      }
    );

    res.set('Content-Type', 'image/png');
    res.send(Buffer.from(response.data, 'binary'));
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'Proxy failed' });
  }
};