const https = require('https');
const fs = require('fs');
const path = require('path');

const images = [
  { name: 'training-center.jpg', width: 1200, height: 800 },
  { name: 'healthcare.jpg', width: 800, height: 600 },
  { name: 'surveying.jpg', width: 800, height: 600 },
  { name: 'it.jpg', width: 800, height: 600 },
  { name: 'certificate-1.jpg', width: 800, height: 600 },
  { name: 'certificate-2.jpg', width: 800, height: 600 },
  { name: 'certificate-3.jpg', width: 800, height: 600 },
  { name: 'international-recognition.jpg', width: 1200, height: 800 },
  { name: 'team-1.jpg', width: 400, height: 400 },
  { name: 'team-2.jpg', width: 400, height: 400 },
  { name: 'team-3.jpg', width: 400, height: 400 },
  { name: 'facilities-1.jpg', width: 1200, height: 800 },
];

const downloadImage = (image) => {
  const url = `https://placehold.co/${image.width}x${image.height}/2563eb/ffffff.jpg?text=${encodeURIComponent(image.name)}`;
  const filePath = path.join(__dirname, '..', 'public', 'images', image.name);

  https.get(url, (response) => {
    if (response.statusCode === 200) {
      const fileStream = fs.createWriteStream(filePath);
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded ${image.name}`);
      });
    } else {
      console.error(`Failed to download ${image.name}: ${response.statusCode}`);
    }
  }).on('error', (err) => {
    console.error(`Error downloading ${image.name}:`, err.message);
  });
};

// Create images directory if it doesn't exist
const imagesDir = path.join(__dirname, '..', 'public', 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Download all images
images.forEach(downloadImage); 