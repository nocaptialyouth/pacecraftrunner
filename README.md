# Pacecraft Runner — 무료 공개 대회 일정 수집

- 대회 목록은 `/api/public-races`에서 제공하며, Google AI·네이버 API·Firebase 없이 표시합니다.
- 최초 10건은 **2026-11-11 PLAYATLAS 일정의 최소 사실 데이터**로 만든 명시적 임시 참고 목록입니다. 마라톤온라인 데이터라고 표시하지 않습니다.
- `scripts/sync-marathon-online.js`가 공개 `http://www.marathon.pe.kr/`을 기준으로 일정표 링크를 찾고 대회명·날짜·종목·위치·출처를 추출합니다.
- 2026-11-11 GitHub 서버 확인 결과 마라톤온라인 접속은 Gabia 오류 페이지(errdoc.gabia.io)로 이동했습니다. 원본 연결 실패 시 PLAYATLAS 공개 예정 마라톤 목록에서 **대회명·날짜·종목·직접 링크만** 대체 조회합니다. 출처를 실제 원본대로 표시합니다. 원본 복구 시 원본을 우선합니다.
- GitHub Actions 예약은 UTC 00:00 = 한국시간 오전 9시, 단 GitHub 실행 지연 가능성이 있습니다.
- 원본 접속 불가 시 PLAYATLAS robots.txt가 허용하는 공개 일정만 참고합니다. 두 원본 모두 접근 불가·제한 또는 유효 날짜 0건이면 기존 파일을 보존합니다.
- 성공하면 `data/marathon-online-races.json`을 업데이트해 저장소에 커밋하고, GitHub 연동 Vercel의 다음 배포가 새 데이터를 제공합니다.
- 마라톤 종목(풀·하프·10km)은 실제 GPX 파일이 아닙니다. GPX 지도는 독립된 코스 기능에서 출처를 확인한 자료만 사용해야 합니다.
- Vercel Cron을 이용한 유료 Gemini 검색 예약은 중지합니다. 관리자용 Gemini AI 기능은 별도 유지합니다.
- `workflow_dispatch`로 GitHub Actions를 수동 시험할 수 있습니다. 사이트 이용약관과 재배포 정책을 확인한 뒤 자동수집을 운영하세요.
