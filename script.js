import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, updateDoc, getDoc, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// HTMLから認証関連の要素を取得
const authView = document.getElementById('auth-view');
const userInfoView = document.getElementById('user-info-view');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const loginButton = document.getElementById('login-button');
const signupButton = document.getElementById('signup-button');
const logoutButton = document.getElementById('logout-button');
const userEmailDisplay = document.getElementById('user-email-display');
const usernameInput = document.getElementById('username-input');

// ◆ 新規登録ボタンの処理
signupButton.addEventListener('click', async() => {
    const username = usernameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!username) {
        alert("ユーザーネームを入力してください。");
        return;
    }
    try {
        const userCredential = await createUserWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: username });
        
        const userDocRef = doc(window.db, "users", user.uid);
        await setDoc(userDocRef, {
            username: username,
            highScore: 0,
            createdAt: new Date()
        });

        console.log("ユーザー登録とデータ保存に成功！");

    } catch (error) {
        // ★★★ この一行を追加して、エラーの詳細を確認する ★★★
        console.error("新規登録エラーの詳細:", error); 

        let message = "";
        switch (error.code) {
            case "auth/email-already-in-use":
                message = "このメールアドレスは既に登録されています。";
                break;
            case "auth/invalid-email":
                message = "無効なメールアドレス形式です。";
                break;
            case "auth/weak-password":
                message = "パスワードは6文字以上でなければなりません。";
                break;
            default:
                // ★★★ デフォルトのエラーメッセージも、より具体的にする ★★★
                message = "登録中にエラーが発生しました。コンソールで詳細を確認してください。";
                break;
        }
        alert(message);
    }
});

// ◆ ログインボタンの処理
loginButton.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    signInWithEmailAndPassword(window.auth, email, password)
        .then(userCredential => {
            console.log("ログイン成功:", userCredential.user);
        })
        .catch(error => {
            let message = "";

            switch (error.code) {
                case "auth/invalid-email":
                    message = "無効なメールアドレス形式です。";
                    break;
                case "auth/user-not-found":
                    message = "メールアドレスが違います。";
                    break;
                case "auth/wrong-password":
                    message = "パスワードが違います。";
                    break;
                default:
                    message = "不明なエラーが発生しました。";
                    break;
            }
            alert(message);
        });
});

// ◆ ログアウトボタンの処理
logoutButton.addEventListener('click', () => {
    signOut(window.auth).catch(error => console.error("ログアウトエラー", error));
});

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
const backToMapButton = document.getElementById('back-to-map-button');
const startCameraButton = document.getElementById('start-camera-button');
const miniMapContent = document.getElementById('mini-map-container')

//初期化
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(window.auth, (user) => {
        if (user) {
            // ログインしている場合
            authView.classList.add('hidden');          // ログインフォームを隠す
            userInfoView.classList.remove('hidden');   // ユーザー情報とログアウトボタンを表示
            modeSelectionView.classList.remove('hidden'); // モード選択画面を表示
            resultView.classList.add('hidden');        // リザルト画面を隠す
            gameView.classList.add('hidden');          // ゲーム画面を隠す
            userEmailDisplay.textContent = `ログイン中: ${user.email}`;

        } else {
            // ログアウトしている場合
            resultView.classList.add('hidden');
            authView.classList.remove('hidden');       // ログインフォームを表示
            userInfoView.classList.add('hidden');      // ユーザー情報を隠す
            modeSelectionView.classList.add('hidden'); // モード選択画面を隠す
            gameView.classList.add('hidden');          // ゲーム画面を隠す
        }
    });
    realWorldButton.addEventListener('click', () => startGame('real-world'));
    geoguessrButton.addEventListener('click', () => startGame('geoguessr'));

    startCameraButton.addEventListener('click', showCameraView);

    backToMapButton.addEventListener('click',hideCameraView);
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
 * タイマーを生成
 */
function createTimer() {
    timeLeft = roundDuration;
    timerDisplay.textContent = formatTime(timeLeft);
    startTimer();
}

/**
 * タイマーを残り時間から再開する
 */
function startTimer() {
    
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

// --- カメラ表示・非表示 ---
function showCameraView() {
    stopTimer();
    cameraContainer.classList.remove('hidden');
    miniMapContent.classList.add('hidden');
    startCameraButton.classList.add('hidden'); 
    backToMapButton.classList.remove('hidden');
    
    startCamera();

}

function hideCameraView() {
    stopCamera();
    startTimer(); // タイマーを残り時間から再開
    
    gameView.classList.remove('hidden');
    cameraContainer.classList.add('hidden');
    miniMapContent.classList.remove('hidden'); 
    startCameraButton.classList.remove('hidden');
    backToMapButton.classList.add('hidden'); 
}

/**
 * ミニマップ初期化
 */
function initMiniMap() {
    if (miniMap) {
        miniMap.remove();
        miniMap = null;
    }
    miniMapContent.classList.remove('hidden');
    miniMap = L.map('mini-map', { crs: L.CRS.Simple, minZoom: -2 });
    const bounds = [[0, 0], [mapHeight, mapWidth]];
    L.imageOverlay('image/campusMap.png', bounds).addTo(miniMap);
    miniMap.fitBounds(bounds);

    if(currentGameMode==='geoguessr'){
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

    // startTimer();//タイマ
}

/**
 * ゲーム開始画面
 */
function startGame(mode) {
    currentGameMode = mode;
    modeSelectionView.classList.add('hidden');
    gameView.classList.remove('hidden');
    backToMapButton.classList.add('hidden');
    
    shuffleArray(problems);
    
    // GeoGuessrモードの場合
    if (currentGameMode === 'geoguessr') {
        initMiniMap();
        document.querySelector('.game-footer').style.display = 'flex'; // 推測UIを表示
        startCameraButton.classList.add('hidden');
        guessButton.classList.remove('hidden')
    } 
    // 現実探索モードの場合
    else if (currentGameMode === 'real-world') {
        initMiniMap();
        
        startCameraButton.classList.remove('hidden');
        //startCamera();
        document.querySelector('.game-footer').style.display = 'flex'; // 推測UIを非表示
        //gameBackground.style.display = 'block'; // お題画像は表示
    }

    currentRound = 1;
    totalScore = 0;
    setupRound();
    createTimer();
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
        miniMapContent.classList.add('hidden');
        
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
 * 決定ボタン押下時処理(家からつならんモードでの解答処理)
 */
function handleGuess(isTimeUp) { 
    stopTimer();
    
    let score = 0;
    let distance = Infinity; // 距離は無限大としておく
    const answerCoords = L.latLng(currentProblem.coords);

    //後日アラートではなくポップアップで実装
    if (isTimeUp) {
        alert("時間切れ！");
        // スコア0で結果画面へ
        const answerCoords = L.latLng(problems[currentRound - 1].coords);
        showResult(0, Infinity, answerCoords);
        return;
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
    userInfoView.classList.add('hidden');
    stopTimer();
    //stopCamera();
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
async function handleNextRound() {
    currentRound++;

    // ゲーム終了の判定
    if (currentRound > totalRounds) {
        alert(`ゲーム終了！\n合計スコア: ${totalScore}点`);
        
        const user = window.auth.currentUser;
        if (user) {
            try {
                const userDocRef = doc(window.db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);

                // ★★★ ここが重要 ★★★
                // まず .exists() でドキュメントの存在を必ず確認する
                if (userDoc.exists()) {
                    const currentHighScore = userDoc.data().highScore;
                    // 現在のハイスコアより今回のスコアが高ければ更新
                    if (totalScore > currentHighScore) {
                        await updateDoc(userDocRef, {
                            highScore: totalScore
                        });
                        alert(`ハイスコアを更新しました！ \nハイスコア: ${totalScore}点`);
                    }
                } else {
                    // 本来は新規登録時に作成されるはずだが、もし存在しない場合のログ
                    console.warn("このユーザーのドキュメントはまだFirestoreに存在しません。");
                }

            } catch (error) {
                console.error("スコア記録中にエラーが発生しました:", error);
                alert("エラーが発生したため、スコアを記録できませんでした。");
            }
        }
        currentGameMode = null;
        resultView.classList.add('hidden');         // リザルト画面を隠す
        gameView.classList.add('hidden');           // ゲーム画面を隠す
        modeSelectionView.classList.remove('hidden'); // モード選択画面を表示
        userInfoView.classList.remove('hidden');    // ユーザー情報表示も再度表示
        return;
    }

    userInfoView.classList.remove('hidden');

    if (currentGameMode === 'real-world') {
        cameraContainer.classList.add('hidden');
        miniMapContent.classList.remove('hidden');
        startCameraButton.classList.remove('hidden');
        guessButton.classList.add('hidden');
        backToMapButton.classList.add('hidden'); 
    }
    
    // 画面切り替えと次のラウンドの準備
    resultView.classList.add('hidden');
    gameView.classList.remove('hidden');
    document.getElementById('score-bar').style.width = '0%'; // スコアバーをリセット
    setupRound();
    createTimer();
}

/**
 * 配列の中身をシャッフルするアルゴリズム
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function stopCamera() {
    if (cameraFeed.srcObject) {
        cameraFeed.srcObject.getTracks().forEach(track => track.stop());
        cameraFeed.srcObject = null;
    }
}