const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const path = require('path');
const multer = require('multer');
const upload = multer();
const app = express();

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
router.use(express.urlencoded({ extended: true }));

// 회원가입 페이지 렌더링
router.get('/', function (req, res) {
  res.render('회원가입.html');
});

// 회원가입 폼 전송 처리
router.post('/join', upload.none(), function (req, res) {
  // 회원가입 폼에서 전송된 데이터 가져오기
  const { memberID, memberPW, memberNick, memberEmail, memberFirstName, memberLastName, memberTel, memberBirth } = req.body;

  // 유효성 검사
  if (!memberID) {
    // memberID가 전달되지 않은 경우에 대한 처리
    // 예를 들어, 오류 응답을 보내거나 다시 폼을 표시
    return res.status(400).send('Invalid memberID');
  }

  // 데이터베이스에 회원 정보 저장
  const query = 'INSERT INTO members (member_id, member_PW, member_nick, member_email, member_first_name, member_last_name, member_tel, member_birth) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  connection.query(query, [memberID, memberPW, memberNick, memberEmail, memberFirstName, memberLastName, memberTel, memberBirth], (error, results) => {
    if (error) {
      console.error('Error querying database: ' + error.stack);
      return;
    }
    console.log('Registered new user with ID: ' + results.insertId);

    // 리다이렉션을 수행하여 회원가입 축하 페이지로 이동
    res.redirect('/join-success');
  });
});

// 회원가입 축하 페이지 렌더링
router.get('/join-success', function (req, res) {
  res.render('./회원가입축하.html');
});

module.exports = router;
