import mysql from 'mysql2/promise';

// MariaDB 커넥션 pool — .env.local 값을 읽어 한 번만 생성
export const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  charset: 'utf8mb4',          // 한글 메모 깨짐 방지
  waitForConnections: true,
  connectionLimit: 10,
});
