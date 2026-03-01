/**
 * @file script.js — 지출 차트 컴포넌트 자바스크립트
 *
 * @description
 * data.json에서 요일별 지출 데이터를 불러와 막대 차트 DOM을 동적으로 생성한다.
 * fetch 실패 시(로컬 file:// 환경 등) 내장된 FALLBACK_DATA로 차트를 렌더링한다.
 *
 * 실행 흐름:
 *  1. loadChartData() — data.json fetch 시도 (성공 시 data, 실패 시 FALLBACK_DATA 전달)
 *  2. renderChart(data) — 전달받은 데이터 배열로 막대 DOM을 생성하고 .chart에 주입
 *
 * 파일 의존성:
 *  - index.html : .chart 컨테이너가 반드시 존재해야 한다.
 *  - style.css  : --bar-max-height CSS 변수를 읽어 막대 최대 높이를 동기화한다.
 *  - data.json  : { day: string, amount: number }[] 형태의 지출 데이터
 */


/* -----------------------------------------------------------------
   1단계: 오늘 요일 감지 (Today Detection)

   Why: 사용자가 접속한 요일의 막대를 자동으로 강조하려면
        현재 요일을 data.json의 day 필드 형식("mon", "tue" ...)과 맞춰야 한다.

   Date.getDay()는 0(일)~6(토)의 정수를 반환한다.
   DAY_NAMES 배열의 인덱스를 getDay() 반환값과 1:1 대응시켜
   todayName ("mon", "wed" 등)을 단 한 줄로 추출한다.
   ----------------------------------------------------------------- */
const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
//                   0      1      2      3      4      5      6   ← getDay() 반환값

const todayName = DAY_NAMES[new Date().getDay()];


/* -----------------------------------------------------------------
   Fallback Data — fetch 실패 대비 내장 비상용 데이터

   Why: 브라우저는 보안 정책(CORS)상 file:// 프로토콜에서 fetch()를 차단한다.
        개발자가 로컬에서 index.html을 단순히 더블클릭해 열 경우가 이에 해당한다.
        이때 catch 블록이 FALLBACK_DATA를 renderChart()에 전달해
        서버 없이도 차트가 정상 렌더링되도록 보장한다.
        (npx serve, VSCode Live Server 등 로컬 서버 사용 시엔 fetch가 정상 동작)
   ----------------------------------------------------------------- */
const FALLBACK_DATA = [
    { "day": "mon", "amount": 17.45 },
    { "day": "tue", "amount": 34.91 },
    { "day": "wed", "amount": 52.36 },
    { "day": "thu", "amount": 31.07 },
    { "day": "fri", "amount": 23.39 },
    { "day": "sat", "amount": 43.28 },
    { "day": "sun", "amount": 25.48 }
];


/**
 * 데이터 배열을 기반으로 막대 차트 DOM을 생성해 .chart 컨테이너에 주입한다.
 *
 * @param {Array<{day: string, amount: number}>} data
 *   data.json(또는 FALLBACK_DATA)에서 전달된 요일별 지출 배열.
 *   예: [{ day: "mon", amount: 17.45 }, ...]
 * @returns {void}
 */
function renderChart(data) {
    const chartContainer = document.querySelector(".chart");

    // 방어 코드: HTML에 .chart가 없으면 appendChild가 런타임 에러를 발생시키므로 조기 종료
    if (!chartContainer) {
        console.error("❌ .chart 요소를 찾을 수 없어요! HTML을 확인해 주세요.");
        return;
    }


    /* -----------------------------------------------------------------
       2단계: 최대 지출액(maxAmount) 도출 및 막대 높이 계산

       Why: 막대 높이를 amount 값 그대로 px로 쓰면 금액 단위에 의존하게 된다.
            대신 "가장 큰 막대가 차트 최대 높이를 꽉 채우도록" 비율로 환산해야
            어떤 데이터셋에서도 차트가 동일한 공간을 일관되게 채운다.

       공식:
         heightPx = (개별 지출 / 최대 지출) × availableHeight
         → 최댓값 막대: (maxAmount / maxAmount) × availableHeight = 100% 높이
         → 나머지 막대: 최댓값 대비 상대 비율로 높이 결정
       ----------------------------------------------------------------- */

    // 데이터 중 가장 큰 지출액 — 비율 계산의 분모이자 기준값
    const maxAmount = Math.max(...data.map((item) => item.amount));

    /*
      CSS 변수 --bar-max-height 를 JS에서 직접 읽는 이유:
      style.css와 script.js가 동일한 수치를 독립적으로 하드코딩하면
      한 곳만 수정했을 때 불일치가 발생한다.
      getComputedStyle로 런타임에 읽어 항상 CSS 변수와 동기화한다.
    */
    const rootStyles = getComputedStyle(document.documentElement);
    const BAR_MAX_HEIGHT = parseInt(
        rootStyles.getPropertyValue("--bar-max-height"),
        10 // 10진수 파싱 — "160px" 문자열에서 숫자 160 추출
    );
    // CSS 변수 읽기 실패(NaN) 시 설계 수치 160px를 기본값으로 보장
    const maxHeightPx = isNaN(BAR_MAX_HEIGHT) ? 160 : BAR_MAX_HEIGHT;


    data.forEach((item) => {
        /*
          availableHeight 계산 — 요일 라벨(.chart__day) + gap이 차지하는 공간 제외

          Why: .chart 컨테이너(160px)에는 막대 본체 외에 요일 라벨(12px)과
               막대-라벨 간격(8px, gap)이 포함된다.
               이를 감안하지 않으면 최댓값 막대가 컨테이너를 초과해 레이아웃이 깨진다.

          태블릿(768px 이상)에서 labelSpace가 더 큰 이유:
          요일 라벨 폰트가 12px → 15px로 커져 차지하는 실제 높이가 증가하기 때문.
          (모바일: 24px, 태블릿: 28px)
        */
        const labelSpace = window.matchMedia("(min-width: 768px)").matches ? 28 : 24;
        const availableHeight = maxHeightPx - labelSpace;

        // 비율 공식: 개별 지출을 최대 지출 대비 백분율로 환산 후 가용 높이에 적용
        const heightPx = (item.amount / maxAmount) * availableHeight;


        /* -----------------------------------------------------------------
           3단계: '오늘(Today)' 요일 강조 클래스 부여

           todayName(모듈 상단에서 Date 객체로 추출)과 item.day를 비교.
           일치하면 isToday = true → 막대에 .chart__bar--today 클래스 추가.
           Result: 오늘 막대만 CSS의 --color-blue-300(청록색)으로 표시됨.
           ----------------------------------------------------------------- */
        const isToday = item.day === todayName;


        /* -----------------------------------------------------------------
           4단계: 동적 DOM 생성 및 차트 렌더링

           하나의 막대 단위(barWrapper)는 세 자식으로 구성된다:
             ┌ chart__bar-wrapper (position: relative — 툴팁 기준점)
             │  ├ chart__tooltip   (aria-hidden: 시각 보조, 스크린 리더 제외)
             │  ├ chart__bar       (role="img" + aria-label: 스크린 리더 전달)
             │  └ chart__day span  (aria-hidden: bar aria-label과 중복 방지)
             └──

           접근성(A11y) 설계 근거:
           - 툴팁(.chart__tooltip)은 마우스 호버 시에만 보이는 시각 보조 요소.
             스크린 리더가 읽으면 금액이 두 번 읽혀 사용자가 혼란스러우므로 aria-hidden.
           - 요일 라벨(.chart__day)도 bar의 aria-label에 요일 정보가 포함되어 있어 중복.
             aria-hidden으로 스크린 리더에 한 번만 전달되도록 처리.
           - 막대(.chart__bar)에만 role="img" + aria-label("wed 지출: $52.36")을 부여해
             스크린 리더가 요일+금액 정보를 하나의 단위로 명확하게 읽는다.
           ----------------------------------------------------------------- */

        // [래퍼] 세 자식을 하나의 열(column)로 묶고, 툴팁의 위치 기준점 역할
        const barWrapper = document.createElement("div");
        barWrapper.classList.add("chart__bar-wrapper");

        // [툴팁] 호버 시 표시되는 금액 말풍선 — 스크린 리더 읽기 제외
        const tooltip = document.createElement("div");
        tooltip.classList.add("chart__tooltip");
        tooltip.setAttribute("aria-hidden", "true");
        tooltip.textContent = `$${item.amount.toFixed(2)}`; // 소수점 2자리 고정: "$17.45"

        // [막대] 높이는 % 방식을 쓸 수 없어 px로 직접 지정
        // Why: CSS %는 부모에 명시적 height가 있어야 동작한다.
        //      .chart__bar-wrapper는 height를 명시하지 않으므로 px로 직접 계산해 주입해야 한다.
        const bar = document.createElement("div");
        bar.classList.add("chart__bar");
        bar.style.height = `${heightPx}px`;

        if (isToday) {
            bar.classList.add("chart__bar--today"); // CSS --color-blue-300 색상 적용
        }

        // 스크린 리더에 요일과 금액을 하나의 의미 단위로 전달
        bar.setAttribute("role", "img");
        bar.setAttribute(
            "aria-label",
            `${item.day} 지출: $${item.amount.toFixed(2)}`
        );

        // [요일 라벨] 시각적 표시용 — bar의 aria-label과 중복이므로 스크린 리더 제외
        const dayLabel = document.createElement("span");
        dayLabel.classList.add("chart__day");
        dayLabel.textContent = item.day;
        dayLabel.setAttribute("aria-hidden", "true");

        // 조립 순서: 툴팁(위) → 막대(중간) → 요일 라벨(아래)
        // CSS의 flex-direction: column과 대응하는 DOM 삽입 순서다.
        barWrapper.appendChild(tooltip);
        barWrapper.appendChild(bar);
        barWrapper.appendChild(dayLabel);
        chartContainer.appendChild(barWrapper);
    });
}


/**
 * data.json을 fetch로 불러와 renderChart를 호출한다.
 * fetch 실패 시(file:// 프로토콜 CORS 차단 등) FALLBACK_DATA로 대체 렌더링한다.
 *
 * @async
 * @returns {Promise<void>}
 */
async function loadChartData() {
    try {
        /* -----------------------------------------------------------------
           1단계: Fetch API를 통한 데이터 로드

           await fetch() : 비동기 HTTP 요청으로 data.json 파일을 가져온다.
           response.ok : HTTP 상태 코드가 200~299 범위일 때 true.
           ok가 false이면 강제로 에러를 throw해 catch 블록으로 흐름을 넘긴다.
           ----------------------------------------------------------------- */
        const response = await fetch("./data.json");

        if (!response.ok) {
            throw new Error(`데이터를 불러오지 못했어요. 상태 코드: ${response.status}`);
        }

        // 응답 본문을 JSON으로 파싱 — 완료될 때까지 await로 대기
        const data = await response.json();

        console.log("✅ data.json 로드 성공! fetch() 데이터로 차트를 그립니다.");
        renderChart(data);

    } catch (error) {
        /*
          fetch 또는 .json() 파싱 과정에서 에러 발생 시 실행되는 블록.

          주된 실패 원인:
          1. file:// 프로토콜: 브라우저 보안 정책이 로컬 파일 fetch를 차단 (CORS 에러)
          2. 서버 에러: response.ok가 false여서 위에서 throw된 에러
          3. 네트워크 단절: data.json 파일이 없거나 서버가 응답하지 않는 경우

          Result: 어떤 이유로 fetch가 실패하더라도 FALLBACK_DATA로 차트를 렌더링해
                  사용자가 빈 화면 대신 항상 완성된 차트를 볼 수 있도록 보장한다.
        */
        console.warn("⚠️ fetch() 실패 (file:// 프로토콜 제한):", error.message);
        console.log("📦 내장 데이터(FALLBACK_DATA)로 차트를 대신 그립니다.");

        renderChart(FALLBACK_DATA);
    }
}


/* -----------------------------------------------------------------
   실행 진입점 (Entry Point)

   <script>가 </body> 직전에 위치하므로 이 시점에 DOM은 이미 완성된 상태다.
   따라서 DOMContentLoaded 이벤트 리스너나 defer 속성 없이 바로 호출해도 안전하다.
   ----------------------------------------------------------------- */
loadChartData();
