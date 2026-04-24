# StockLens — 해외 ETF 포트폴리오 대시보드

> 3차 해커톤 — 실무 풀스택 웹 서비스 구축 및 클라우드 배포 챌린지
>
> - **참가자**: 주문국
> - **배포 URL**: (배포 후 추가)
> - **GitHub 저장소**: https://github.com/munkukju/stocklensboard/blob/main/README.md

본 보고서는 경영학 전공 후 풀스택 개발을 학습하는 과정에서 수행한 해커톤 결과물을 기술한다. 본 프로젝트의 목표는 수업에서 학습한 프론트엔드·백엔드·데이터베이스·인프라 개념을 실제 서비스 단위로 결합하여, 로그인부터 배포에 이르는 전체 사이클을 완결하는 것이다.

---

## 1. 프로젝트 개요

### 수행 주제

해외 ETF 3종(BOXX, TLT, MAGS)을 대상으로 매수·매도 내역을 기록하고, 시간 흐름에 따른 **포트폴리오 비중 변화를 매입가/평가액 기준 도넛 차트 두 개로 시각화**하는 금융 대시보드 서비스이다.

- 실시간 시세 API를 연동하는 대신, 사전에 설계된 180틱(3분 분량) 더미 시세 시나리오를 클라이언트 시뮬레이터가 재생하는 방식을 채택하였다.
- 매수·매도 기록은 최소한의 검증(음수 차단)만 거쳐 저장되며, 평균단가·수익률·비중 등 파생 값은 서버에서 집계 SQL과 JavaScript 계산으로 산출한다.

### 사용 기술

| 구분 | 기술 |
|---|---|
| 프론트엔드 | React 18, Next.js 14 (App Router), TypeScript, Static CSS (sl- BEM) |
| 상태 관리 | Zustand (세션) |
| 서버 상태 | TanStack Query v5 (React Query) |
| 차트 | Chart.js, react-chartjs-2 |
| 백엔드 | Next.js Route Handlers (`app/api/**/route.ts`) |
| DB | MariaDB, `mysql2/promise` |
| 인증 | JWT, httpOnly 쿠키, bcrypt |
| 배포 | GCP VM, Cloudflare (SSL) |

---

## 2. 백엔드 구성 및 라우팅

### 구현 방식

**Next.js 14 App Router의 Route Handlers** 방식을 선택하였다. 선정 근거는 다음과 같다.

1. 프론트엔드와 동일한 런타임·타입 시스템 공유로 개발 효율 확보
2. 단일 프로세스 배포(PM2 1개)로 해커톤 시간 제약 대응
3. `middleware.ts`를 통한 보호 라우트 일괄 제어 가능

### 주요 API 경로 (총 9개 엔드포인트)

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| POST | `/api/signup` | 회원가입 및 JWT 발급 | 불필요 |
| POST | `/api/login` | 로그인 및 JWT 발급 | 불필요 |
| POST | `/api/logout` | 쿠키 삭제 | 불필요 |
| GET  | `/api/me` | 현재 세션 유저 조회 | 필요 |
| GET  | `/api/stocks` | 종목 마스터 조회 | 필요 |
| GET  | `/api/trades?ticker=` | 매매 내역 조회(종목 필터 옵션) | 필요 |
| POST | `/api/trades` | 매매 등록 | 필요 |
| PUT  | `/api/trades/[id]` | 매매 수정(소유권 검증 포함) | 필요 |
| DELETE | `/api/trades/[id]` | 매매 삭제(소유권 검증 포함) | 필요 |
| GET  | `/api/portfolio?tick=N` | 포트폴리오 집계(요약 + 비중) | 필요 |

### 인증 보호 흐름 (4단 구조)

1. **`lib/auth.ts`** — JWT 발급·검증 함수
2. **`lib/session.ts`** — 쿠키에서 JWT 추출 → 서명 검증 → DB 조회 → 유저 반환
3. **`middleware.ts`** — `/dashboard/:path*` 진입 시 쿠키 부재 시 `/login`으로 리다이렉트
4. **`/login`·`/signup` 서버 가드** — `getSession()`으로 로그인 상태 확인 후 이미 로그인된 사용자는 `/dashboard`로 강제 이동. `export const dynamic = 'force-dynamic'` 지정을 통해 정적 캐시로 인한 가드 우회 방지

---

## 3. 데이터베이스 및 SQL 활용

### 테이블 구조

| 테이블 | 역할 | 주요 컬럼 |
|---|---|---|
| `users` | 유저 계정 | id, email(UNIQUE), password(bcrypt), name |
| `stock_prices` | 종목 마스터 | ticker(PK), name, currency |
| `price_ticks` | 시세 시뮬레이션 데이터 (180틱 × 3종목 = 540행) | (ticker, tick_no) PK, price DECIMAL(12,2) |
| `trades` | 매매 기록 | id, user_id(FK), ticker(FK), type('BUY'/'SELL'), quantity, price, trade_date, note |

파생 값(평균단가, 보유 수량, 수익률, 비중)은 DB에 저장하지 않고 집계 API에서 실시간으로 계산한다. 원본 매매 기록 하나만 일관되게 유지하면 나머지 지표가 항상 정합성을 가지므로, 데이터 중복 및 동기화 이슈를 원천 차단한다.

### 주요 SQL

#### (1) 매매 내역 조회 — JOIN 및 옵션 필터

```sql
SELECT t.*, s.name AS ticker_name
FROM trades t
JOIN stock_prices s ON s.ticker = t.ticker
WHERE t.user_id = ?
  AND (? IS NULL OR t.ticker = ?)
ORDER BY t.trade_date DESC, t.id DESC;
```

- 종목명을 매 조회 시 JOIN하여 프론트엔드 타입 `Trade.ticker_name`과 일관성 유지
- 두 번째 `?` 파라미터가 NULL이면 전체 조회, 값이 있으면 해당 종목만 필터링

#### (2) 포트폴리오 집계 — CASE/SUM/NULLIF 활용

```sql
SELECT
  s.ticker, s.name AS ticker_name, pt.price AS current_price,
  SUM(CASE WHEN t.type='BUY'  THEN t.quantity ELSE 0 END) -
  SUM(CASE WHEN t.type='SELL' THEN t.quantity ELSE 0 END) AS quantity,
  SUM(CASE WHEN t.type='BUY' THEN t.quantity * t.price ELSE 0 END) /
    NULLIF(SUM(CASE WHEN t.type='BUY' THEN t.quantity ELSE 0 END), 0) AS avg_cost
FROM trades t
JOIN stock_prices s ON s.ticker = t.ticker
JOIN price_ticks pt ON pt.ticker = t.ticker AND pt.tick_no = ?
WHERE t.user_id = ?
GROUP BY s.ticker, s.name, pt.price
HAVING quantity > 0;
```

- `CASE WHEN`을 통해 단일 SELECT로 BUY/SELL 수량을 분리 집계하여 쿼리 수 감소
- `NULLIF(..., 0)`으로 매수 수량이 0인 경우의 division-by-zero 예외 차단
- `HAVING quantity > 0`으로 전량 매도된 종목은 결과에서 제외
- 비중 계산(`cost_weight`, `market_weight`)은 쿼리 복잡도를 낮추기 위해 서버 JS의 `reduce`로 분리 수행

#### (3) 소유권 검증 패턴 (PUT/DELETE)

```sql
SELECT user_id FROM trades WHERE id = ?;
-- JS 단에서 session.id와 비교, 불일치 시 403 Forbidden 반환
DELETE FROM trades WHERE id = ?;
```

---

## 4. 프론트엔드 상태 관리 및 데이터 최적화 (가점 반영)

### 상태 관리 전략 — Zustand (세션 전용)

클라이언트 상태와 서버 상태의 책임을 분리하여 관리한다.

- **Zustand 역할**: 로그인 유저 정보(`user`, `setUser`, `clear`) 단일 책임
- **TanStack Query 역할**: 매매 내역, 포트폴리오 집계 등 서버에서 오는 데이터 일체

`stores/authStore.ts`는 세 개 필드만 관리하며, 로그인 성공 시 `setUser`, 로그아웃 시 `clear` 호출로 사이드바 유저 표시를 제어한다. 서버 데이터를 Zustand에 중복 저장하지 않음으로써 동기화 문제를 방지한다.

### 서버 데이터 관리 — TanStack Query v5

#### (1) 전역 401 핸들링 (`components/Providers.tsx`)

```ts
queries: {
  throwOnError: (error) => {
    if (error.message === 'UNAUTHORIZED') {
      window.location.href = '/login';
      return false;
    }
    return true;
  },
}
```

모든 `queryFn` 내부에 `if (res.status === 401) throw new Error('UNAUTHORIZED')` 공통 규칙을 적용하여, 토큰 만료 시 어느 API에서든 자동으로 로그인 페이지로 리다이렉트되도록 하였다.

#### (2) Optimistic Update — 매매 등록 즉시 반영

```ts
onMutate: async (newTrade) => {
  await qc.cancelQueries({ queryKey: ['trades'] });
  const previous = qc.getQueryData<Trade[]>(['trades']);
  const optimistic = makeOptimisticTrade(newTrade);   // id: -Date.now()
  qc.setQueryData<Trade[]>(['trades'], (old) => [optimistic, ...(old ?? [])]);
  return { previous };
},
onError: (_e, _v, ctx) => {
  if (ctx?.previous) qc.setQueryData(['trades'], ctx.previous);
},
onSettled: () => {
  qc.invalidateQueries({ queryKey: ['trades'] });
  qc.invalidateQueries({ queryKey: ['portfolio'] });
},
```

- 임시 ID로 `-Date.now()` 음수 값을 사용하여 DB auto_increment(양수)와의 충돌을 구조적으로 방지
- 실패 시 `onError`에서 이전 스냅샷으로 롤백
- `onSettled`에서 `['trades']`와 `['portfolio']`를 동시 invalidate하여 매매 변경 시 포트폴리오 집계도 즉시 재조회

#### (3) 시뮬레이터 자동 재생 시 렌더링 최적화

`PortfolioView.tsx`는 tick 값을 1초 간격으로 증가시키며 `/api/portfolio?tick=N`을 재요청한다. 이때 tick 변경마다 `queryKey`가 갱신되면서 일시적으로 `data === undefined` 상태가 발생하여 카드·도넛·테이블이 언마운트/리마운트되는 문제가 있었다. 이를 학습 범위 내 도구(`useState`, `useEffect`)로 해결하였다(상세 내용은 §5 사례 3 참조).

---

## 5. 트러블슈팅 (문제 해결 기록)

### 사례 1. DELETE API 구현에도 불구하고 매매 삭제 UI 누락

- **증상**: DB에 직접 DELETE 쿼리 실행 시 정상 동작하나, 화면에서 삭제를 수행할 수단이 부재
- **원인**: 백엔드 엔드포인트(`DELETE /api/trades/[id]`)는 소유권 검증 로직을 포함하여 구현 완료되었으나, 프론트엔드 `TradeList` 컴포넌트에 해당 API를 호출하는 mutation과 버튼이 연결되지 않은 상태였음. 구현 체크리스트가 "API 구현"과 "API 연결 UI 구현"을 분리하지 않아 발생한 누락
- **조치**:
  1. `TradeList.tsx` 함수 컴포넌트 내부에 `useMutation` 훅 선언 (React Hook 호출 규칙 준수)
  2. 각 매매 행에 삭제 버튼 추가
  3. `confirm()` 다이얼로그로 오작동 방지
  4. 요청 진행 중에는 `disabled={isPending}`으로 중복 요청 차단
- **시사점**: 백엔드 API 명세와 프론트엔드 UI 명세를 분리된 체크리스트로 관리할 경우 접점에서 누락이 발생할 수 있으며, 양 측 명세를 교차 검증하는 절차가 필요함

### 사례 2. 삭제 요청 시 "삭제 실패" alert 지속 발생

- **증상**: 신규 추가한 삭제 버튼 클릭 시 "삭제 실패" alert가 표시되며 DB에 변경이 반영되지 않음. curl로 DELETE 요청 직접 전송 시에는 정상 처리됨
- **원인 분석**:
  1. 이전 개발 세션에서 종료한 dev 서버의 부모 프로세스만 종료되고 jest-worker 자식 프로세스가 좀비 상태로 잔존하여 포트 3000을 점유 중
  2. 해당 좀비 프로세스는 `EPIPE` (write after child exit) 예외를 무한 루프로 발생시키며 라우트 재컴파일에 실패하는 상태
  3. 새로 기동한 dev 서버는 포트 3000이 점유되어 3001로 fallback, 반면 브라우저는 여전히 포트 3000(좀비)에 요청을 전송
- **조치**:
  1. `netstat -ano | grep :3000`으로 포트 점유 PID 식별
  2. `taskkill /F /PID <PID>`로 좀비 프로세스 강제 종료
  3. `.next` 폴더 삭제(이전 production 빌드 잔여물과 hot-reload 충돌 방지)
  4. dev 서버를 포트 3000에 재기동
  5. 브라우저 강제 새로고침(`Ctrl+Shift+R`)으로 캐시 무효화
- **시사점**: Windows 환경에서 Node.js 프로세스 트리는 부모 종료 시 자식이 orphan으로 잔존하기 쉬움. 서버 재시작 절차에 포트 점유 프로세스 확인 및 `.next` 캐시 정리 단계를 표준화할 필요가 있음

### 사례 3. 자동 재생 시 차트 렌더링 깜빡임 (학습 범위 내 해결 사례)

- **증상**: 시세 시뮬레이션 자동 재생(`setInterval` 기반 tick 증가) 시 매 요청마다 카드·도넛·테이블이 일순간 사라졌다가 재표시되는 현상 발생. 사용자 경험 저해
- **원인 분석**: tick 변경으로 `queryKey: ['portfolio', tick]`이 갱신되면서 해당 키의 캐시가 비어 `data === undefined` 상태가 한 프레임 노출됨. 이로 인해 가드 분기(`if (!data) return <p>불러오는 중...</p>`)가 발동하며 하위 컴포넌트 전체가 언마운트/리마운트되고, Chart.js는 새 인스턴스로 애니메이션을 재시작하여 깜빡임 발생
- **해결 접근 비교**:

| 후보 | 접근 방식 | 채택 여부 |
|---|---|---|
| A | TanStack Query `placeholderData: keepPreviousData` 옵션 사용 | 기각 — 프로젝트 코드 규칙(학습 범위 내 문법 사용) 위반 |
| B | Chart.js `options.animation` 설정 조정 | 기각 — 동일 사유 |
| C | `useState` + `useEffect`로 직전 응답을 별도 state에 보관 | **채택** — 학습 범위 내 도구만 사용 |

- **채택안 구현**:

```ts
const [lastData, setLastData] = useState<PortfolioData | null>(null);
const { data } = useQuery({ ... });
useEffect(() => { if (data) setLastData(data); }, [data]);
if (!lastData) return <p>불러오는 중...</p>;
const { summary, allocation } = lastData;
```

- **결과**: `data`가 일시적으로 undefined가 되어도 `lastData`가 직전 값을 유지하므로 하위 컴포넌트가 언마운트되지 않음. Chart.js 또한 동일 인스턴스에서 data prop만 변경되어 내부 보간 애니메이션이 자연스럽게 이어짐
- **시사점**: 새로운 라이브러리 옵션 도입에 앞서 기존 학습 범위 내 원시 도구(`useState`, `useEffect`)로 동일 목적을 달성할 수 있는지를 먼저 검토하는 절차를 표준화함. 본 사례를 통해 `useEffect` 의존성 배열의 역할에 대한 이해가 심화됨

### 사례 4. 로그인 상태에서 뒤로가기 시 로그인 폼 재노출

- **증상**: 정상 로그인 후 대시보드 진입까지 문제 없으나, 브라우저 뒤로가기 조작 시 `/login` 페이지가 다시 렌더링됨. 쿠키(`token`)는 유효한 상태이므로 인증 자체는 풀리지 않았으나 UX상 혼란 유발
- **원인**:
  1. `/login` 페이지가 로그인 상태와 무관하게 항상 폼을 반환하는 정적 Server Component로 구현됨
  2. Next.js App Router는 기본적으로 페이지를 정적(prerender) 빌드하여 캐시된 응답을 반환하므로, 요청 시점의 쿠키 검사가 수행되지 않음
- **조치**: `/login`, `/signup` 페이지를 async Server Component로 전환하고 진입 시 `getSession()`으로 세션 확인 후 이미 로그인된 사용자는 `/dashboard`로 리다이렉트하도록 수정

```tsx
export const dynamic = 'force-dynamic';   // 정적 캐시 방지

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect('/dashboard');
  return (<LoginForm />);
}
```

- **시사점**:
  - 인증 가드 배치에는 두 가지 주요 패턴이 존재함. (i) `middleware` 중앙 제어 방식(NextAuth 등 라이브러리 사용 시 주류), (ii) 페이지 단위 Server Component 가드 방식(raw JWT 직접 구현 시 주류). 본 프로젝트는 페이지 수가 적어 후자가 명시성 측면에서 유리
  - `export const dynamic = 'force-dynamic'` 선언 누락 시 정적 캐시로 인해 가드가 우회되므로 반드시 수반되어야 함

### 사례 5. 한글 메모 데이터가 DB에 `????`로 저장되는 charset 경계 문제

- **증상**: 매매 등록 시 메모 필드에 한글(`초단기채`) 입력 후 저장하면 DB에 `????`로 기록됨. 영문(`M7 ETF`)은 정상 저장
- **원인 분석 — 경계별 분리 검증**:

| 경계 | 검증 방법 | 결과 |
|---|---|---|
| DB 자체 | `mysql` 명령어로 직접 INSERT 후 `HEX(note)` 조회 | `EC A7 81 ...` (UTF-8 3바이트) 정상 저장 |
| 서버 ↔ DB 드라이버 | `lib/db.ts`의 `mysql2` 커넥션 설정 확인 | charset 옵션 누락 발견 |
| 클라이언트 ↔ 서버 (curl) | Git Bash에서 curl로 한글 JSON 전송 후 HEX 확인 | `3F 3F 3F` (ASCII `?` literal) — **Windows Git Bash 환경 한정 이슈** |
| 클라이언트 ↔ 서버 (브라우저) | 실제 브라우저 fetch로 전송 | 정상 (fetch는 항상 UTF-8로 직렬화) |

- **조치**: `lib/db.ts`의 mysql2 커넥션에 `charset: 'utf8mb4'` 옵션 추가

```ts
export const pool = mysql.createPool({
  host: ..., user: ..., password: ..., database: ...,
  charset: 'utf8mb4',   // 한글 메모 저장 시 charset 경계 변환 차단
  waitForConnections: true,
  connectionLimit: 10,
});
```

- **시사점**: 동일한 "깨짐" 증상이라도 발생 경계(DB / 드라이버 / 네트워크 / 터미널)에 따라 원인이 상이함. 각 경계에서 실제 바이트 값을 `HEX()`로 확인하여 분리 진단하는 절차가 없었다면 Git Bash 환경 이슈를 서버 측 결함으로 오판할 수 있었음

---

