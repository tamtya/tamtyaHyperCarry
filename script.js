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
//後日自分で撮った画像に置き換え(済)
//ランダムは実装がわからないので保留(済)
//仮の座標を設定済み(済)
//座標入力完了済み(9/13)
//絶対この管理方法間違ってるよ。
const problems = [
    { image: "image/West.jpg", coords: [34.6510927, 135.5895220], info: "西門" },
    { image: "image/11_hall2.jpg", coords: [34.6514708, 135.5883653], info: "11月ホール" },
    { image: "image/academic.jpg", coords: [34.6504329, 135.5876499], info: "アカデミックシアター\nちょっと意地悪な写真かも…" },
    { image: "image/bldg_6.jpg", coords: [34.6501224, 135.5877816], info: "6号館" },
    { image: "image/bldg_7.jpg", coords: [34.6503019, 135.5879721], info: "7号館" },
    { image: "image/bldg_10.jpg", coords: [34.6511125, 135.5873568], info: "10号館" },
    { image: "image/bldg_17.jpg", coords: [34.6520199, 135.5873461], info: "17号館" },
    { image: "image/bldg_18_kita.jpg", coords: [34.6513715, 135.5864573], info: "18号館北棟" },
    { image: "image/bldg_18_south.jpg", coords: [34.6506500, 135.5865834], info: "18号館南棟" },
    { image: "image/bldg_19.jpg", coords: [34.6520790, 135.5881575], info: "19号館" },
    { image: "image/bldg_20.jpg", coords: [34.6520770, 135.5875298], info: "20号館" },
    { image: "image/bldg_21.jpg", coords: [34.6520387, 135.5866122], info: "21号館" },
    { image: "image/bldg_22.jpg", coords: [34.6496124, 135.5867550], info: "22号館" },
    { image: "image/bldg_31.jpg", coords: [34.6510555, 135.5876525], info: "31号館" },
    { image: "image/bldg_33.jpg", coords: [34.6520205, 135.5878805], info: "33号館" },
    { image: "image/bldg_38.jpg", coords: [34.6511567, 135.5883596], info: "38号館" },
    { image: "image/bldg_39_1.jpg", coords: [34.6512405, 135.5879345], info: "39号館_正面入り口" },
    { image: "image/bldg_39_2.jpg", coords: [34.6516515, 135.5882514], info: "39号館" },
    { image: "image/bldg_a.jpg", coords: [34.6508141, 135.5902533], info: "A館" },
    { image: "image/bldg_b.jpg", coords: [34.6510996, 135.5903767], info: "B館" },
    { image: "image/bldg_c.jpg", coords: [34.6514667, 135.5899066], info: "C館" },
    { image: "image/bldg_e.jpg", coords: [34.6513958, 135.5911374], info: "E館" },
    { image: "image/bldg_g.jpg", coords: [34.6510643, 135.5912175], info: "G館" },
    { image: "image/Cafe.jpg", coords: [34.6510971, 135.5898044], info: "ブロッサムカフェ" },
    { image: "image/e_3.jpg", coords: [34.6521355, 135.5864965], info: "英語村" },
    { image: "image/E_Ground.jpg", coords: [34.6510097, 135.5918341], info: "Eキャンパスグラウンド" },
    { image: "image/Honkan.jpg", coords: [34.6499839, 135.5867473], info: "大学本館" },
    { image: "image/KUDOS.jpg", coords: [34.6510138, 135.5910871], info: "キューダス" },
    { image: "image/samotorake.jpg", coords: [34.6513746, 135.5906442], info: "B館にあるサモトラケのニケ像" },
    { image: "image/sekou.jpg", coords: [34.6517201, 135.5865679], info: "世耕弘一銅像" },
    { image: "image/senshin_niwa.jpg", coords: [34.6517527, 135.5870621], info: "洗心の庭" }
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

    // 既に初期化済みなら何もしない
    if (miniMap) {
        miniMap.remove();
    }

    // 標準のWeb地図として初期化
    miniMap = L.map('mini-map');

    // 背景にOpenStreetMapを表示
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(miniMap);

    const campusCenter = [34.65132381198825, 135.589292049408]; // 例：近畿大学東大阪キャンパスの中心あたり
    const initialZoom = 17; // ズームレベル（16〜18くらいが丁度よい）
    miniMap.setView(campusCenter, initialZoom);


    // マップをクリックしたときの処理
    miniMap.on('click', (e) => {
        // e.latlng にクリック地点の「現実の緯度・経度」が入ります
        console.log("地図クリック座標:", e.latlng);
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
   console.log("【解答時】あなたの推測座標:", guessCoords);
    console.log("【解答時】正解の座標:", answerCoords);

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
        // distance = miniMap.distance(guessCoords, answerCoords);
        // score = Math.round(maxScore * Math.exp(-0.01 * distance));
        // ▼▼▼ 変更点: クリックされた緯度・経度と、正解の緯度・経度の距離を計算 ▼▼▼
        distance = guessCoords.distanceTo(answerCoords); // 単位はメートル
        
        // メートルに合わせたスコア計算式
        if (distance <= 20) { // 20m以内なら満点
            score = maxScore;
        } else {
            score = Math.round(maxScore * Math.exp(-0.005 * (distance - 20)));
        }
        if (score < 0) score = 0;
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

    if (resultMap) {
        resultMap.remove();
        resultMap = null;
    }

    // マップを初期化
    resultMap = L.map('result-map');

    // 背景にOpenStreetMapの世界地図を表示
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(resultMap);

    // 正解の場所にマーカーを立てる
    const answerMarker = L.marker(answerCoords).addTo(resultMap).bindPopup("正解の場所");

    // もしユーザーの推測地点があれば（時間切れでなければ）
    if (guessCoords) { 
        L.marker(guessCoords).addTo(resultMap).bindPopup("あなたの推測");
        L.polyline([guessCoords, answerCoords], { color: 'white', weight: 2, dashArray: '5, 10' }).addTo(resultMap);
        const resultBounds = L.latLngBounds([guessCoords, answerCoords]);
        resultMap.fitBounds(resultBounds.pad(0.2));s

    } else {
        // 時間切れなどで推測がない場合は、正解地点を中央に表示
        resultMap.setView(answerMarker, 16); // ズームレベル16
        L.marker(answerMarker).addTo(resultMap).bindPopup("正解の場所").openPopup();
    }

    // 結果画面が表示された後に地図のサイズを再計算させる（表示崩れ防止）
    setTimeout(() => {
        if (resultMap) {
            resultMap.invalidateSize();
        }
    }, 10);

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