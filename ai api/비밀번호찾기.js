const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const nodemailer = require('nodemailer');
const app = express();
const path = require('path');

const connection = mysql.createConnection({
  host: "127.0.0.1",
  user: 'root',
  password: '1234',
  database: 'members',
  port: '3306'
});

app.set('views', path.join(__dirname, '게시판모음'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

router.use(express.static(path.join(__dirname, '게시판모음')));
router.use(express.urlencoded({ extended: true }));

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database: ' + err.stack);
    return;
  }
  console.log('Connected to database as ID: ' + connection.threadId);
});

// 이메일 전송 함수
function sendEmail(email, memberPW) {
  // 이메일 전송에 필요한 설정
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'dnjswh4415@gmail.com', // 발신자 이메일 주소
      pass: 'dnjswh@1234' // 발신자 이메일 비밀번호
    }
  });

  const mailOptions = {
    from: 'dnjswh4415@gmail.com', // 발신자 이메일 주소
    to: email, // 수신자 이메일 주소
    subject: '비밀번호 찾기 결과',
    text: `회원님의 비밀번호는 ${memberPW}입니다.`
  };

  // 이메일 전송
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error('Error sending email: ' + error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

// 비밀번호 찾기 페이지 렌더링

router.get('/findPW', function (req, res) {
  res.render('비밀번호찾기.html');
});

    // 비밀번호 찾기 폼 전송 처리
    router.post('/findPW', function (req, res) {
    const { memberID, memberEmail } = req.body;

    const query = 'SELECT member_pw FROM members WHERE member_id = ? AND member_email = ?';
    connection.query(query, [memberID, memberEmail], (error, results) => {
        if (error) {
        console.error('Error querying database: ' + error.stack);
        return;
        }

        if (results.length > 0) {
        const memberPW = results[0].member_pw;
        sendEmail(memberEmail, memberPW);
        res.render('비밀번호찾기결과.html', { memberPW: memberPW});
        } else {
        res.redirect('/비밀번호찾기?mode=error');
        }
    });
    });

app.use('/', router);

module.exports = router;
