const express = require('express');
const app = express();
const mysql = require('mysql');
const path = require('path');
const multer = require('multer');
const upload = multer();
const session = require('express-session');
const router = express.Router();

const connection = mysql.createConnection({
  host: "127.0.0.1",
  user: 'root',
  password: '1234',
  database: 'members',
  port: '3306'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database: ' + err.stack);
    return;
  }
  console.log('Connected to database as ID: ' + connection.threadId);
});

app.set('views', path.join(__dirname, '게시판모음'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

router.use(express.static(path.join(__dirname, '게시판모음')));
router.use('/login/mypage', express.static(path.join(__dirname, '게시판모음')));
router.use(express.urlencoded({ extended: true }));

// Session middleware
router.use(
  session({
    secret: 'your-secret-key',
    resave: true,
    saveUninitialized: true
  })
);

// checkLoginStatus 함수 정의
function checkLoginStatus(req, res, next) {
  if (req.session.memberID) {
    // 로그인 상태이므로 다음 미들웨어로 진행
    next();
  } else {
    // 로그인되지 않은 상태이므로 로그인 페이지로 리다이렉션
    res.redirect('/login');
  }
}


// 로그인 페이지 렌더링
router.get('/', function (req, res) {
  // 로그인 상태 확인
  if (req.session.memberID) {
    res.redirect('/login/mypage'); // 로그인 상태인 경우, 마이페이지로 리디렉션
  } else {
    res.render('로그인.html', { showButtons: true }); // 로그인 상태가 아닌 경우, 로그인 페이지 렌더링 (버튼 표시)
  }
});


// 로그인 폼 전송 처리
router.post('/', upload.none(), function (req, res) {
  // 로그인 처리 로직
  const { memberID, memberPW } = req.body;

  const query = 'SELECT * FROM members WHERE member_id = ? AND member_PW = ?';
  connection.query(query, [memberID, memberPW], (error, results) => {
    if (error) {
      console.error('Error querying database: ' + error.stack);
      return;
    }

    if (results.length > 0) {
      req.session.memberID = memberID;
      const memberInfo = results[0];
      req.session.memberInfo = memberInfo;

      // loggedInUser 객체 설정
      const loggedInUser = {
        member_id: memberInfo.member_id
      };
      req.session.loggedInUser = loggedInUser;

      res.redirect('/login/mypage');
    } else {
      res.redirect('/login?mode=error');
    }
  });
});

// 마이페이지 렌더링
router.get('/login/mypage', checkLoginStatus, function (req, res) {
  const query = 'SELECT member_id, member_nick, member_Email, member_Last_Name, member_First_Name, member_Tel, member_Point, member_Level, member_Join, member_Login FROM members WHERE member_id = ?';
  connection.query(query, [req.session.memberID], (error, results) => {
    if (error) {
      console.error('데이터베이스 쿼리 오류: ' + error.stack);
      return;
    }

    if (results.length > 0) {
      const memberInfo = results[0];
      console.log(memberInfo);
      res.render('마이페이지.ejs', {
        memberInfo: memberInfo
      });
    } else {
      res.render('마이페이지.ejs', { memberInfo: null, memberID: req.session.memberID });
    }
  });
});

// 로그아웃 처리
router.get('/logout', function(req, res) {
  // 세션 초기화 또는 삭제
  req.session.destroy(function(err) {
    if (err) {
      console.error('세션 삭제 실패:', err);
    }
    res.redirect('/'); // 로그아웃 후, 메인 페이지로 리디렉션
  });
});


module.exports = router;
