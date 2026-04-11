import express from 'express';
import cors from 'cors';
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import checkpointRouter from './routes/checkpoint.js';
import checkpointsRouter from './routes/checkpoints.js';
import statusRouter from './routes/status.js';
import chatRouter from './routes/chat.js';

const app = express();
const PORT = 4024;

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
