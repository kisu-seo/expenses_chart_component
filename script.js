/* =====================================================
   script.js — 지출 차트 컴포넌트 자바스크립트
   역할: data.json 데이터를 읽어 차트를 동적으로 그려주는 파일
   흐름: 데이터 불러오기 → 오늘 요일 감지 → 막대 높이 계산 → DOM 생성
   ===================================================== */


/* =================================================================
  [1] 오늘 요일 감지 (Today Detection)

  비유: 달력을 보고 "오늘이 무슨 요일이지?" 하고 확인하는 과정이에요.
  JavaScript의 Date 객체는 날짜/시간 정보를 담은 '시계 앱' 같은 도구예요.
  ================================================================= */

// 요일 인덱스(숫자)를 data.json의 영문 약자와 매칭시키는 배열(Array)이에요.
// getDay()는 0(일요일) ~ 6(토요일) 순서로 숫자를 반환해요.
// 배열의 순서를 그 숫자에 맞게 배치해두면, 인덱스로 바로 꺼낼 수 있어요!
const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
//                  0      1      2      3      4      5      6
//               (일)   (월)   (화)   (수)   (목)   (금)   (토)

// new Date() : 지금 이 순간의 날짜와 시간 정보를 담은 객체를 만들어요.
const today = new Date();

// .getDay() : 오늘이 몇 번째 요일인지 숫자(0~6)로 알려줘요.
// 예를 들어 오늘이 일요일이면 0, 수요일이면 3을 반환해요.
const todayIndex = today.getDay();

// DAY_NAMES 배열에서 오늘의 숫자 인덱스에 해당하는 영문 약자를 꺼내요.
// 예: todayIndex가 0이면 → "sun", 3이면 → "wed"
const todayName = DAY_NAMES[todayIndex];


/* =================================================================
  [2] 차트 생성 함수 (renderChart)

  역할: 받아온 데이터 배열을 가지고 HTML 막대들을 만들어
        .chart 영역 안에 집어넣는 '공장' 같은 함수예요.

  매개변수(Parameter):
    - data : data.json에서 읽어온 [{day, amount}, ...] 형태의 배열
  ================================================================= */
function renderChart(data) {
    // --- 2-1. 차트를 넣을 컨테이너 요소를 HTML에서 찾아요 ---
    // document.querySelector() : CSS 선택자로 요소를 하나 찾아주는 도구예요.
    // 마치 "교실에서 1번 학생 찾아와" 하는 것처럼요.
    const chartContainer = document.querySelector(".chart");

    // 혹시 HTML에 .chart 요소가 없으면 에러를 출력하고 중단해요 (방어 코드)
    if (!chartContainer) {
        console.error("❌ .chart 요소를 찾을 수 없어요! HTML을 확인해 주세요.");
        return; // 함수 실행을 여기서 멈춰요
    }


    // --- 2-2. 최댓값(Max Amount) 계산 ---
    // 비유: 7명의 키를 재서 "이 중에 가장 큰 사람이 누구야?"를 찾는 것처럼요.
    // Math.max() : 여러 숫자 중 가장 큰 값을 반환해요.
    // ...data.map(item => item.amount) : 배열에서 amount 값만 쏙 뽑아서
    //   펼쳐서(spread) Math.max에 넣어줘요.
    const maxAmount = Math.max(...data.map((item) => item.amount));

    // --- CSS 변수에서 차트 최대 높이(px) 읽어오기 ---
    // 비유: "CSS에게 '막대 최대 높이가 몇 px야?' 하고 물어보는 것"이에요.
    // getComputedStyle() : 현재 화면에 실제로 적용된 CSS 값을 읽어줘요.
    // getPropertyValue() : CSS 변수(--bar-max-height)의 값을 꺼내줘요.
    // parseInt() : "160px" 같은 문자열에서 숫자 160만 뽑아줘요.
    const rootStyles = getComputedStyle(document.documentElement);
    const BAR_MAX_HEIGHT = parseInt(
        rootStyles.getPropertyValue("--bar-max-height"),
        10 // 10진수로 변환
    );
    // 만약 CSS 변수 읽기에 실패했을 경우 기본값 160px 사용
    const maxHeightPx = isNaN(BAR_MAX_HEIGHT) ? 160 : BAR_MAX_HEIGHT;


    // --- 2-3. 각 요일 막대 생성 (forEach 반복문) ---
    // forEach : 배열의 항목을 하나씩 꺼내서 같은 작업을 반복해요.
    // 마치 7개의 빵 반죽을 하나씩 꺼내서 모양을 만드는 것처럼요.
    data.forEach((item) => {
        // item = { day: "mon", amount: 17.45 } 처럼 생긴 객체예요.

        // --- 막대 높이 px 계산 ---
        // ✅ 수정: 가장 큰 막대가 차트 컨테이너(.chart: 160px)를 벗어나지 않게 해요.
        // 차트 높이에서 '요일 라벨 높이 + 여백' 공간(약 30px)을 뺀 나머지가 막대가 자랄 수 있는 진짜 높이예요!
        const labelSpace = 24; // 요일 라벨과 간격(gap)이 차지하는 공간
        const availableHeight = maxHeightPx - labelSpace;

        // 공식: (현재 지출 ÷ 최대 지출) × 막대 가용 높이
        const heightPx = (item.amount / maxAmount) * availableHeight;


        // --- '오늘' 요일인지 판별 ---
        // 현재 item의 day가 todayName과 같으면 true, 아니면 false
        const isToday = item.day === todayName;


        // --- DOM 요소 생성 ---
        // document.createElement() : 새로운 HTML 태그를 메모리 안에 만들어요.
        // 마치 "레고 블록 하나 꺼내기"와 같아요. 아직 화면에 붙이진 않았어요.

        // [래퍼 div] : 툴팁 + 막대 + 요일 라벨을 담을 그릇
        const barWrapper = document.createElement("div");
        barWrapper.classList.add("chart__bar-wrapper"); // CSS 클래스 부착


        // [툴팁 div] : 마우스를 올렸을 때 나타날 금액 말풍선
        const tooltip = document.createElement("div");
        tooltip.classList.add("chart__tooltip");
        // aria-hidden="true" : 이 말풍선은 시각적 보조 요소이므로
        //                       스크린 리더가 따로 읽지 않아도 돼요.
        tooltip.setAttribute("aria-hidden", "true");
        // 소수점 둘째 자리까지 고정해서 "$17.45" 형태로 표시해요.
        tooltip.textContent = `$${item.amount.toFixed(2)}`;


        // [막대 div] : 실제로 보이는 색깔 막대 본체
        const bar = document.createElement("div");
        bar.classList.add("chart__bar");

        // 높이 설정: CSS의 height 속성을 직접 px로 지정해요.
        // % 방식은 부모 요소의 명시적 높이가 없으면 0이 돼서, px로 직접 계산해요.
        bar.style.height = `${heightPx}px`;

        // '오늘' 요일이면 파란색 강조 클래스를 추가해요
        if (isToday) {
            bar.classList.add("chart__bar--today");
        }

        // 접근성(A11y): 막대에 role과 aria-label을 달아
        //               스크린 리더가 "수요일 지출: $52.36"처럼 읽을 수 있게 해요.
        bar.setAttribute("role", "img");
        bar.setAttribute(
            "aria-label",
            `${item.day} 지출: $${item.amount.toFixed(2)}`
        );


        // [요일 라벨 span] : 막대 아래에 표시될 "mon", "tue" 등의 텍스트
        const dayLabel = document.createElement("span");
        dayLabel.classList.add("chart__day");
        dayLabel.textContent = item.day;
        // 스크린 리더가 막대(aria-label)에서 이미 요일 정보를 읽어줬으니
        // 라벨 텍스트는 중복 읽기를 방지하려고 숨겨요.
        dayLabel.setAttribute("aria-hidden", "true");


        // --- 조립 순서 ---
        // 비유: 레고 블록을 조립 설명서 순서대로 붙이는 것처럼요!
        // 1. 래퍼에 툴팁 끼우기
        barWrapper.appendChild(tooltip);
        // 2. 래퍼에 막대 끼우기
        barWrapper.appendChild(bar);
        // 3. 래퍼에 요일 라벨 끼우기
        barWrapper.appendChild(dayLabel);
        // 4. 완성된 래퍼를 차트 컨테이너에 붙이기
        chartContainer.appendChild(barWrapper);
    });
}


/* =================================================================
  [3] 비상용 데이터 (Fallback Data)

  역할: fetch()가 실패할 때를 대비한 '보험 데이터'예요.
  비유: 편의점에 재료가 없을 때를 대비해 집에 라면 하나 쟁여두는 것처럼요.

  언제 필요하냐면?
  - 파일을 로컬 서버 없이 index.html 을 더블클릭해서 열 때
  - 브라우저 보안 정책이 file:// 프로토콜에서 fetch() 를 차단할 때
  ================================================================= */
const FALLBACK_DATA = [
    { "day": "mon", "amount": 17.45 },
    { "day": "tue", "amount": 34.91 },
    { "day": "wed", "amount": 52.36 },
    { "day": "thu", "amount": 31.07 },
    { "day": "fri", "amount": 23.39 },
    { "day": "sat", "amount": 43.28 },
    { "day": "sun", "amount": 25.48 }
];


/* =================================================================
  [4] 데이터 불러오기 (Fetch API + 폴백)

  비유: 친구에게 "냉장고에서 재료 꺼내와!" 하고 부탁하는 것처럼요.
  fetch()는 파일(또는 서버)에서 데이터를 가져오는 비동기 함수예요.
  '비동기'란, 데이터가 도착할 때까지 기다리는 동안 다른 일도 할 수 있다는 뜻이에요.

  async/await : "이 작업이 끝날 때까지 기다렸다가 다음으로 넘어가"라는 표시예요.
                요리로 비유하면 "국이 끓을 때까지 기다렸다가 간을 봐"와 같아요.
  ================================================================= */
async function loadChartData() {
    try {
        // --- 4-1. data.json 파일 요청 ---
        // fetch() : 지정한 경로의 파일을 가져오는 요청을 보내요.
        // await : 파일을 완전히 받아올 때까지 기다려요.
        const response = await fetch("./data.json");

        // --- 4-2. 요청 성공 여부 확인 ---
        // response.ok : 파일을 정상적으로 받아오면 true, 실패하면 false예요.
        if (!response.ok) {
            // 에러 메시지를 강제로 발생시켜 catch 블록으로 보내요.
            throw new Error(`데이터를 불러오지 못했어요. 상태 코드: ${response.status}`);
        }

        // --- 4-3. JSON 형식으로 변환 ---
        // 받아온 데이터는 아직 '날 것의 텍스트'예요.
        // .json() 으로 JavaScript가 이해할 수 있는 배열/객체로 변환해요.
        const data = await response.json();

        // --- 4-4. 차트 그리기 ---
        // 이제 데이터가 준비됐으니, 차트를 그리는 함수에 데이터를 건네줘요.
        console.log("✅ data.json 로드 성공! fetch() 데이터로 차트를 그립니다.");
        renderChart(data);

    } catch (error) {
        // fetch()나 .json() 중 어디서든 에러가 나면 여기서 받아줘요.
        // 📌 핵심 변경: 에러가 나도 포기하지 않고 비상용(FALLBACK) 데이터로 차트를 그려요!
        // 비유: 편의점 재고가 없으면 집에 있는 라면으로 요리하는 것처럼요.
        console.warn("⚠️ fetch() 실패 (file:// 프로토콜 제한):", error.message);
        console.log("📦 내장 데이터(FALLBACK_DATA)로 차트를 대신 그립니다.");

        // FALLBACK_DATA를 넘겨서 차트 렌더링을 진행해요.
        renderChart(FALLBACK_DATA);
    }
}


/* =================================================================
  [5] 실행 진입점 (Entry Point)

  역할: 위에서 정의한 함수를 "실제로 시작!"시키는 스위치예요.
  HTML 파일 맨 아래에 <script>를 뒀기 때문에 이 시점엔
  이미 DOM(HTML 노드들)이 전부 준비된 상태예요.
  ================================================================= */
loadChartData();
