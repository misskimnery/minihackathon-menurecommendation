# 오늘 뭐 먹지? — AI 메뉴 추천

기분·예산·함께 먹는 사람·날씨를 고르면 Gemini가 메뉴 3가지를 이유와 함께 추천합니다.
기획은 [docs/PRD.md](docs/PRD.md) 참고.

## 실행

```bash
npm install
npm run dev
```

## API 키 넣기

1. [aistudio.google.com](https://aistudio.google.com) → Dashboard → **API 키** → **API 키 만들기**
2. 프로젝트는 `Default Gemini Project` 그대로 두고 생성 → 키 복사
3. `.env.local` 의 `GEMINI_API_KEY=` 뒤에 붙여넣고 저장
4. 개발 서버 재시작 (`Ctrl+C` 후 `npm run dev`)

키는 서버(Route Handler)에서만 읽고 브라우저로 내려가지 않습니다.
`.env.local` 은 `.gitignore` 에 걸려 있어 커밋되지 않습니다.

## Vercel 배포

GitHub 푸시 → Vercel Import → **Environment Variables 에 `GEMINI_API_KEY` 추가** → Deploy.
이 환경변수를 빼먹으면 배포된 사이트에서 "키가 설정되지 않았다"는 안내만 나옵니다.

## 구조

```
src/
  app/
    page.tsx                 입력 폼 ↔ 결과 화면 상태 전환
    layout.tsx               메타데이터 + 폰트
    globals.css              색·타이포 토큰 (라이트/다크)
    api/recommend/route.ts   입력 검증 → Gemini 호출 → JSON 응답
    components/
      MenuForm.tsx           선택형 버튼 입력 폼
      ResultCards.tsx        결과 카드 3장 + 로딩 스켈레톤
  lib/
    menu.ts                  선택지 상수 + 공용 타입
    gemini.ts                프롬프트 조립 · REST 호출 · 응답 파싱 (서버 전용)
```

Gemini는 SDK 없이 REST(`fetch`)로 호출합니다. 추가 의존성이 없습니다.
