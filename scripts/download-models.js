const fs = require('fs');
const path = require('path');
const https = require('https');

const FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_tiny_model-weights_manifest.json',
  'face_landmark_68_tiny_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

const BASE_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/';
const DEST_DIR = path.join(__dirname, '..', 'public', 'models');

if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
}

function downloadFile(fileName) {
  return new Promise((resolve, reject) => {
    const fileUrl = `${BASE_URL}${fileName}`;
    const destPath = path.join(DEST_DIR, fileName);
    const file = fs.createWriteStream(destPath);

    console.log(`Downloading ${fileName}...`);
    https.get(fileUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${fileName}: Status Code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Successfully downloaded ${fileName}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function main() {
  try {
    for (const file of FILES) {
      await downloadFile(file);
    }
    console.log('All model files downloaded successfully!');
  } catch (error) {
    console.error('Error downloading files:', error);
    process.exit(1);
  }
}

main();
