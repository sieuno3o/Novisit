// server/src/config/firebase.ts
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 서비스 계정 키 파일 경로 (프로젝트 루트 기준)
// 실제 키 파일은 .gitignore에 추가하여 버전 관리에서 제외해야 합니다.
const serviceAccountPath = path.resolve(__dirname, 'firebase-admin-key.json');

try {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  console.error('Please ensure firebase-admin-key.json exists and is valid.');
  // 초기화 실패 시 앱이 시작되지 않도록 프로세스 종료 또는 적절한 오류 처리
  // process.exit(1);
}

export default admin;
