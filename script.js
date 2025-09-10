//フィールド
const mapWidth = 1200;
const mapHeight = 900;
const totalRounds = 5;
const maxScore = 5000; // 1ラウンドの最高得点
const roundDuration = 90; //タイマ秒

// 問題リスト
//後日自分で撮った画像に置き換え
//ランダムは実装がわからないので保留
//仮の座標を設定済み
const problems = [
    { image: "image/West.jpg", coords: [34.755223, 135.648315], info: "西門" },
    { image: "image/JISEDAI.jpg", coords: [34.755223, 135.648315], info: "次世代食堂" },
    { image: "image/Academic.jpg", coords: [34.755223, 135.648315], info: "アカデミックシアター" },
    { image: "image/E_Ground.jpg", coords: [34.755223, 135.648315], info: "Eキャンパス人工芝" },
    { image: "image/E_Kan.jpg", coords: [34.755223, 135.648315], info: "E館" }
];

//変数
let currentRound = 1;
let totalScore = 0;
let currentProblem;
let miniMap, resultMap;
let guessMarker, answerMarker;
let guessCoords;
let timerInterval; //タイマ変数
let timeLeft; //残り時間
let currentGameMode = null; //現実世界or家

const gameView = document.getElementById('game-view');
const resultView = document.getElementById('result-view');
const gameBackground = document.querySelector('.game-background');
const guessButton = document.getElementById('guess-button');
const nextRoundButton = document.getElementById('next-round-button');
const roundTitle = document.getElementById('round-title');
const timerDisplay = document.getElementById('timer-display'); 
const roundCounterMain = document.getElementById('round-counter-main');
const resultRoundCounterMain = document.getElementById('result-round-counter-main');
const modeSelectionView = document.getElementById('mode-selection-view');
const realWorldButton = document.getElementById('real-world-button');
const geoguessrButton = document.getElementById('home-button');
const cameraContainer = document.getElementById('camera-container');
const cameraFeed = document.getElementById('camera-feed');
const shutterButton = document.getElementById('shutter-button');

//初期化
document.addEventListener('DOMContentLoaded', () => {
    initMiniMap();
    setupRound();

    realWorldButton.addEventListener('click', () => startGame('real-world'));
    geoguessrButton.addEventListener('click', () => startGame('home'));

    shutterButton.addEventListener('click', handleRealWorldGuess);
    guessButton.addEventListener('click', () => handleGuess(false));
    nextRoundButton.addEventListener('click', handleNextRound);
});

// 秒を mm:ss 形式の文字列に変換する関数
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

/**
 * タイマーを開始する変数
 */
function startTimer() {
    timeLeft = roundDuration;
    timerDisplay.textContent = formatTime(timeLeft);
    
    // 1秒ごとにタイマーを更新
    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = formatTime(timeLeft);
        if (timeLeft <= 0) {
            handleGuess(true); // 時間切れで推測処理を呼び出す
        }
    }, 1000);
}

/**
 * タイマーを停止
 */
function stopTimer() {
    clearInterval(timerInterval);
}

/**
 * ミニマップ初期化
 */
function initMiniMap() {
    miniMap = L.map('mini-map', { crs: L.CRS.Simple, minZoom: -2 });
    const bounds = [[0, 0], [mapHeight, mapWidth]];
    L.imageOverlay('image/campusMap.png', bounds).addTo(miniMap);
    miniMap.fitBounds(bounds);

    miniMap.on('click', (e) => {
        console.log(e.latlng) 
        if (guessMarker) {
            guessMarker.setLatLng(e.latlng);
        } else {
            guessMarker = L.marker(e.latlng, { draggable: true }).addTo(miniMap);
        }
        guessCoords = e.latlng;
    });
}

/**
 * ラウンド準備
 */
function setupRound() {
    currentProblem = problems[currentRound - 1];
    
    // UIの更新
    gameBackground.style.backgroundImage = `url(${currentProblem.image})`;
    roundCounterMain.textContent = `${currentRound} / ${totalRounds}`;
    
    // 前のラウンドのマーカーを削除
    if (currentGameMode === 'geoguessr') {
        if (guessMarker) guessMarker.remove();
        guessMarker = null;
        guessCoords = null;
    }

    startTimer();//タイマ
}

/**
 * ゲーム開始画面
 */
function startGame(mode) {
    currentGameMode = mode;
    modeSelectionView.style.display = 'none';
    gameView.classList.remove('hidden');
    
    // GeoGuessrモードの場合
    if (currentGameMode === 'geoguessr') {
        initMiniMap();
        document.querySelector('.game-footer').style.display = 'flex'; // 推測UIを表示
    } 
    // 現実探索モードの場合
    else if (currentGameMode === 'real-world') {
        startCamera();
        document.querySelector('.game-footer').style.display = 'none'; // 推測UIを非表示
        gameBackground.style.display = 'block'; // お題画像は表示
    }

    currentRound = 1;
    totalScore = 0;
    setupRound();
}

/**
 * カメラ機能
 */
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } // 背面カメラを優先
        });
        cameraContainer.classList.remove('hidden');
        cameraFeed.srcObject = stream;
    } catch (err) {
        console.error("カメラへのアクセスが拒否されました:", err);
        alert("カメラへのアクセスを許可してください。");
    }
}

/**
 * gps機能
 */
function getGPSLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject("このブラウザはGPS機能に対応していません。");
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true // 高精度な位置情報を要求
        });
    });
}


/**
 * 決定ボタン押下時処理
 */
function handleGuess(isTimeUp) { 
    stopTimer();
    
    let score = 0;
    let distance = Infinity; // 距離は無限大としておく
    const answerCoords = L.latLng(currentProblem.coords);

    //後日アラートではなくポップアップで実装
    if (isTimeUp) {
        alert("時間切れ！");
        // スコアは0のまま
    } else if (!guessCoords) {
        alert("地図をクリックして場所を推測してください！");
        startTimer(); // タイマーを再開
        return;
    } else {
        distance = miniMap.distance(guessCoords, answerCoords);
        score = Math.round(maxScore * Math.exp(-0.01 * distance));
    }
    
    totalScore += score;
    showResult(score, distance, answerCoords);
}

/**
 * 現実世界つならんでの解答処理
 */
async function handleRealWorldGuess() {
    stopTimer();
    try {
        console.log("GPS情報を取得中...");
        const position = await getGPSLocation();
        console.log("GPS情報:", position.coords);
        
        // 緯度経度をLeafletの形式に変換して距離を計算
        const userCoords = L.latLng(position.coords.latitude, position.coords.longitude);
        const answerCoords = L.latLng(currentProblem.coords); // 問題の座標も緯度経度に
        
        const distance = userCoords.distanceTo(answerCoords); // 2点間の距離を計算(メートル)
        
        let score = 0;
        // 20メートル以内なら満点
        if (distance <= 20) {
            score = maxScore;
        } else {
            // 距離に応じてスコアを計算（GeoGuessrモードと同じ式を流用）
            score = Math.round(maxScore * Math.exp(-0.01 * distance));
        }

        totalScore += score;
        showResult(score, distance, answerCoords);

    } catch (err) {
        console.error("GPS情報の取得に失敗しました:", err);
        alert("GPS情報の取得に失敗しました。位置情報サービスがオンになっているか確認してください。");
        startTimer(); // エラーが起きたらタイマーを再開
    }
}

// GeoGuessrモードの解答処理 (旧handleGuess)
function handleGeoguessrGuess(isTimeUp) {
    // ... 以前のhandleGuessのロジックをここに ...
    stopTimer();
    
    let score = 0;
    let distance = Infinity; // 距離は無限大としておく
    const answerCoords = L.latLng(currentProblem.coords[0] / 10000, currentProblem.coords[1] / 10000); //擬似座標

    //後日アラートではなくポップアップで実装
    if (isTimeUp) {
        alert("時間切れ！");
        // スコアは0のまま
    } else if (!guessCoords) {
        alert("地図をクリックして場所を推測してください！");
        startTimer(); // タイマーを再開
        return;
    } else {
        distance = miniMap.distance(guessCoords, answerCoords);
        score = Math.round(maxScore * Math.exp(-0.01 * distance));
    }
    
    totalScore += score;
    showResult(score, distance, answerCoords);
}

/**
 * 結果画面表示
 */
function showResult(score, distance, answerCoords) {
    // 画面切り替え
    gameView.classList.add('hidden');
    resultView.classList.remove('hidden');

    if (cameraFeed.srcObject) { // カメラストリームを停止
        cameraFeed.srcObject.getTracks().forEach(track => track.stop());
        cameraFeed.srcObject = null;
    }

    // 結果UIの更新
    roundTitle.textContent = `Round ${currentRound}`;
    resultRoundCounterMain.textContent = `${currentRound} / ${totalRounds}`;
    document.getElementById('score-display').textContent = `${score} ポイント`;
    document.getElementById('distance-display').textContent = `あなたの推測は正しい場所から ${Math.round(distance)}m でした。`; // 単位をmに
    document.getElementById('spot-info').textContent = currentProblem.info;
   
    if (distance === Infinity) {
        document.getElementById('distance-display').textContent = "時間内に推測できませんでした。";
    } else {
        document.getElementById('distance-display').textContent = `あなたの推測は正しい場所から ${Math.round(distance)}m でした。`;
    }
    
    document.getElementById('spot-info').textContent = currentProblem.info;
    const scoreBar = document.getElementById('score-bar');
    
    setTimeout(() => {
        scoreBar.style.width = `${(score / maxScore) * 100}%`;
    }, 100);

    if (!resultMap) {
        resultMap = L.map('result-map', { crs: L.CRS.Simple, minZoom: -2 });
        const bounds = [[0, 0], [mapHeight, mapWidth]];
        L.imageOverlay('image/campusMap.png', bounds).addTo(resultMap);
        resultMap.fitBounds(bounds);
    } else {
        resultMap.eachLayer(layer => { if (layer instanceof L.Marker || layer instanceof L.Polyline) layer.remove() });
    }

    if (guessCoords) { 
        L.marker(guessCoords).addTo(resultMap).bindPopup("あなたの推測");
        L.polyline([guessCoords, answerCoords], { color: 'white', weight: 2, dashArray: '5, 10' }).addTo(resultMap);
        const resultBounds = L.latLngBounds([guessCoords, answerCoords]);
        resultMap.fitBounds(resultBounds.pad(0.2));
    } else {
        resultMap.setView(answerCoords, -1); // 推測地点がない場合は正解地点を中央に
    }
    L.marker(answerCoords).addTo(resultMap).bindPopup("正解の場所").openPopup();
}

/**
 * 次ラウンドへ
 */
function handleNextRound() {
    currentRound++;
    if (currentRound > totalRounds) {
        alert(`ゲーム終了！\n合計スコア: ${totalScore}点`);
        // ここで最初に戻るなどの処理を追加
        currentRound = 1;
        totalScore = 0;
    }
    
    // 画面切り替えと次のラウンドの準備
    resultView.classList.add('hidden');
    gameView.classList.remove('hidden');
    document.getElementById('score-bar').style.width = '0%'; // スコアバーをリセット
    setupRound();
}