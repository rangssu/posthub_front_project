# 프론트-백엔드 로컬 통합: 연결과 인증 흐름 설계

작성일: 2026-07-31

## 배경

**두 앱을 한 번도 붙여본 적이 없다.** 프론트 `.env`가 `https://api.boxblognote.link/api`를
가리키는데 이 도메인은 DNS에 없다(NXDOMAIN). 로컬에서 통합 상태를 확인할 방법 자체가
없었다는 뜻이다.

붙여보기 전에 코드만 봐도 확실한 어긋남이 나왔다. 백엔드는 리프레시 토큰 인프라를
완비했다 — Redis 계열 저장, 회전, 재사용 감지, TTL 갱신. 그런데 **프론트가 그걸 전혀
쓰지 않는다.** access 토큰이 15분이라 지금 상태로 띄우면 15분마다 강제 로그아웃된다.

**백엔드는 수정하지 않는다.** 필요한 API가 전부 준비돼 있다.

## 확인된 어긋남

| 지점 | 현재 | 근거 |
|---|---|---|
| 쿠키 전송 | `withCredentials` 없음 | `src/api/axios.ts` |
| 토큰 갱신 | `/auth/refresh` 호출 자체가 없음. 401이면 즉시 로그아웃 | 프론트 API 호출 전수 조사 |
| 로그아웃 | `/auth/logout` 호출 없음. localStorage만 비움 | `src/pages/BoardPage.tsx` |
| API 주소 | 존재하지 않는 도메인 | `.env` |

백엔드 쪽 사실:

- `SecurityConfig.corsConfigurationSource` — `allowCredentials(true)`, 허용 origin에
  `http://localhost:5173` 포함
- `RefreshCookieFactory` — `httpOnly`, `Path=/api/auth`, `SameSite=Lax`, 로컬은 `Secure=false`
- `AuthController` — `/api/auth/login`·`/refresh`가 `Set-Cookie`로 리프레시 토큰을 회전시키고,
  `/logout`은 쿠키가 없어도 204를 주는 멱등 설계

## 이 문서가 다루는 범위

전체 간극은 서로 독립적인 덩어리 셋이다. 이 문서는 **A만** 다룬다.

| 덩어리 | 내용 |
|---|---|
| **A. 연결 + 인증 흐름** | 이 문서 |
| B. 마이페이지 | `GET`/`PUT`/`DELETE /api/users/{id}`가 프론트에 전혀 노출돼 있지 않다. 후속 spec |
| C. 대댓글 | `POST /api/comments/{parentId}/replies`와 `CommentResponse.replies` 중첩. 후속 spec |

A가 먼저인 이유는 단순하다. 지금은 15분마다 로그아웃되므로 B·C를 손으로 검증하는 것
자체가 괴롭다.

## 설계

### 1. API 주소는 `.env.local`로 덮는다

`.env`는 **git에 추적 중**이고 배포용 값을 담고 있다. 로컬 값으로 덮으면 배포 설정이
사라진다.

Vite는 `.env.local`을 `.env`보다 우선 적용하고, `.gitignore`의 `*.local`에 걸려 커밋되지
않는다. 개발자마다 다른 값을 가질 수 있다.

```
VITE_API_URL=http://localhost:8080/api
```

**`/api`로 끝나야 한다.** 리프레시 쿠키가 `Path=/api/auth`라, 경로가 어긋나면 브라우저가
쿠키를 아예 실어 보내지 않는다.

### 2. `withCredentials: true`

백엔드가 이미 `allowCredentials(true)`이고, 로컬은 `Secure=false`에 `SameSite=Lax`다.
5173과 8080은 포트만 다른 same-site라 이 한 줄이면 쿠키가 오간다.

### 3. 리프레시는 단일 비행(single-flight)이어야 한다

`RedisRefreshTokenStore.rotate`는 **재사용을 감지하면 계열 전체를 폐기한다**(`revokeFamily`).
회전식 토큰의 표준적인 방어인데, 프론트가 리프레시를 동시에 두 번 보내면 두 번째가
재사용으로 판정돼 **로그인 세션이 통째로 날아간다.**

목록·상세·좋아요가 한 화면에서 동시에 요청을 쏘는 구조라 이건 이론적 위험이 아니다.
토큰이 만료된 순간 여러 요청이 한꺼번에 401을 받는다.

그래서 진행 중인 리프레시를 하나만 두고, 나머지 401 요청은 그 결과를 기다렸다가
재시도한다.

```
refreshAccessToken(): Promise<string>
  진행 중인 Promise가 있으면 그것을 반환
  없으면 POST /auth/refresh
  성공: accessToken/userId/role 저장 후 토큰 반환
  finally: 진행 중 Promise 해제
```

**별도 파일(`src/api/refreshClient.ts`)로 분리한다.** 이유는 둘이다.

- 기존 테스트가 `vi.mock('../api/axios')`로 모듈 전체를 목킹한다. 인터셉터 안에 인라인으로
  두면 그 코드가 테스트에서 아예 돌지 않는다.
- 단일 비행은 경합을 재현해 검증해야 하는 로직이라, 테스트 가능한 단위로 떼어내는 편이 낫다.

**리프레시 요청 자체는 기본 axios로 보낸다.** 우리 인스턴스를 쓰면 그 응답의 401이
다시 인터셉터를 타고 자기 자신을 부른다.

### 4. 401 처리

| 조건 | 동작 |
|---|---|
| 401, 재시도 안 한 요청, `/auth/*` 아님 | 리프레시를 기다렸다가 헤더 갱신 후 **1회** 재시도 |
| 리프레시 실패 | localStorage 정리 + `/login` 이동 (기존 동작) |
| 이미 재시도한 요청 | 그대로 실패 |
| `/auth/*` 요청의 401 | 재시도하지 않음 |
| 403 | 그대로 통과 (기존 동작 유지) |

`/auth/*` 제외와 재시도 플래그가 둘 다 필요하다. 전자가 없으면 리프레시가 자기 자신을
무한히 호출하고, 후자가 없으면 갱신된 토큰으로도 401이 나는 경우(권한 자체가 없는
리소스)에 무한 루프가 된다.

403을 건드리지 않는 것도 중요하다. 401과 403을 같이 처리하면 "남의 글을 수정하려 했다"
같은 정상적인 거부에서도 멀쩡히 로그인된 사용자가 튕겨나간다. 기존 코드가 이미
그 이유를 주석으로 남겨두었다.

### 5. 로그아웃

`POST /auth/logout`을 먼저 부르고 localStorage를 정리한다. 서버가 리프레시 계열을
폐기해야 로그아웃이 실제로 끝난다.

**실패해도 localStorage는 비운다.** 서버가 죽었다고 로그아웃이 막히면 안 된다. 백엔드가
쿠키 없이도 204를 주는 멱등 설계라 재시도에 안전하다.

## 검증

자동 테스트로 덮는 핵심은 하나다 — **동시에 여러 요청이 401을 받아도 리프레시가 정확히
1회만 나가는가.** 이게 깨지면 재사용 감지가 세션을 통째로 날린다.

나머지는 실제로 띄워서 확인한다. access 만료는 15분을 기다리지 않고 백엔드를
`JWT_EXPIRATION_MILLIS=10000`으로 띄워 강제한다. 프로덕션 코드에 테스트 토글을 넣지
않는다는 원칙과 일치한다 — 환경변수만 쓴다.

## 범위 밖

- 백엔드 수정 일체
- 배포와 `git push` (배포는 계속 보류 상태)
- 마이페이지(B), 대댓글(C)
- 마크다운 에디터 — 계획 문서만 있고 미착수, 이번 작업과 무관

## 관련 문서

- 좋아요·검색 설계: `docs/superpowers/specs/2026-07-28-front-likes-search-design.md`
- 마크다운 에디터 설계: `docs/superpowers/specs/2026-07-28-markdown-editor-design.md`
