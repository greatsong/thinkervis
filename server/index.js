import express from 'express';
import cors from 'cors';
import { mkdirSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// .env 파일 로드
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=(.+)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
  console.log('.env 로드 완료');
}
import checkpointRouter from './routes/checkpoint.js';
import checkpointsRouter from './routes/checkpoints.js';
import statusRouter from './routes/status.js';
import chatRouter from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 4030;

app.use(cors());
app.use(express.json());

// checkpoints 디렉토리 보장
mkdirSync(resolve(process.cwd(), 'checkpoints'), { recursive: true });

// 라우트
app.use('/api/checkpoint', checkpointRouter);
app.use('/api/checkpoints', checkpointsRouter);
app.use('/api/status', statusRouter);
app.use('/api/chat', chatRouter);

// 리포트 파일 다운로드
app.get('/api/report/:id', (req, res) => {
  const reportPath = resolve(
    process.cwd(),
    'checkpoints',
    req.params.id,
    'report.md'
  );
  res.download(reportPath);
});

app.listen(PORT, () => {
  console.log(`MetaCognition Coach 서버 실행 중: http://localhost:${PORT}`);
});
