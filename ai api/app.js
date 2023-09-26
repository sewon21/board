const express = require('express');
const app = express();
const mysql = require('mysql');
const path = require('path');
const multer = require('multer');
const upload = multer();
const session = require('express-session');
const nodemailer = require('nodemailer');
const moment = require('moment');

const connection = mysql.createConnection({
  host: "127.0.0.1",
  user: 'root',
  password: '1234',
  database: 'members',
  port: '3306'
});

// 뷰 경로 설정
app.set('views', path.join(__dirname,'게시판모음')); 
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.use((req, res, next) => {
  if (req.path === '/index' || req.path === '/') {
    app.set('views', __dirname);
  } else {
      app.set('views', path.join(__dirname, '게시판모음'));
  }
  next();
});

//여기위에 수정함 만약 RDS로 갈때 구지이케 안해도 ㄱㅊ으면 전으로 되돌리기
// 정적 파일 경로 설정 (CSS, JS, 이미지 등)
app.use(express.static(path.join(__dirname, '게시판모음')));
app.use('/js', express.static(path.join(__dirname,'js')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/fontawesome/css', express.static(path.join(__dirname, 'fontawesome', 'css')));
app.use('/img', express.static(path.join(__dirname,  'img')));
app.use('/review_board', express.static(path.join(__dirname, '게시판모음'))); 


app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: 'your-secret-key',
    resave: true,
    saveUninitialized: true
  })
);

// 로그인 모듈 불러오기
const loginModule = require('./로그인');
app.use('/login', loginModule);

// 회원가입 모듈 불러오기
const joinModule = require('./회원가입');
app.use('/join-membership', joinModule);

// 회원가입 폼 전송 처리
app.post('/join', upload.none(), function (req, res) {
  // 회원가입 폼에서 전송된 데이터 가져오기
  const { memberID, memberPW, memberNick, memberEmail, memberFirstName, memberLastName, memberTel, memberBirth } = req.body;

  // 유효성 검사
  if (!memberID) {
    // memberID가 전달되지 않은 경우에 대한 처리
    // 예를 들어, 오류 응답을 보내거나 다시 폼을 표시할 수 있습니다.
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

    res.redirect('/join-success');
  });
});

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

// 마이페이지 렌더링
app.get('/login/mypage', checkLoginStatus, function (req, res) {
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

// 회원가입 후 회원가입축하 페이지로 이동
app.get('/join-success', (req, res) => {
  const { memberID } = req.body;
  req.session.memberID = memberID;
  res.redirect('./회원가입축하.html');
});

// 마이페이지 수정 페이지 렌더링
app.get('/login/mypage/edit', checkLoginStatus, function (req, res) {
  const query = 'SELECT member_id, member_nick, member_Email, member_Last_Name, member_First_Name, member_Tel, member_Point, member_Level, member_Join, member_Login FROM members WHERE member_id = ?';
  connection.query(query, [req.session.memberID], (error, results) => {
    if (error) {
      console.error('데이터베이스 쿼리 오류: ' + error.stack);
      return;
    }

    if (results.length > 0) {
      const memberInfo = results[0];
      console.log(memberInfo);
      res.render('마이페이지수정.ejs', {
        memberInfo: memberInfo
      });
    } else {
      res.render('마이페이지수정.ejs', { memberInfo: null, memberID: req.session.memberID });
    }
  });
});

// 마이페이지 수정 폼 전송 처리
app.post('/login/mypage/edit', upload.none(), function (req, res) {
  // 마이페이지 수정 처리 로직
  const { memberNick, memberEmail, memberTel } = req.body;

  const query = 'UPDATE members SET member_nick = ?, member_Email = ?, member_Tel = ? WHERE member_id = ?';
  connection.query(query, [memberNick, memberEmail, memberTel, req.session.memberID], (error, results) => {
    if (error) {
      console.error('데이터베이스 쿼리 오류: ' + error.stack);
      return;
    }

    console.log('마이페이지 수정 완료!');
    res.redirect('/login/mypage');
  });
});

const 아이디찾기Router = require('./아이디찾기.js');
app.use('/아이디찾기', 아이디찾기Router);

const 비밀번호찾기Router = require('./비밀번호찾기.js');
app.use('/비밀번호찾기', 비밀번호찾기Router);

// 아이디 찾기 폼 전송 처리
app.post('/login/findID', function (req, res) {
  const { memberNick, memberEmail } = req.body;

  const query = 'SELECT member_id FROM members WHERE member_nick = ? AND member_Email = ?';
  connection.query(query, [memberNick, memberEmail], (error, results) => {
    if (error) {
      console.error('Error querying database: ' + error.stack);
      return;
    }

    if (results.length > 0) {
      const memberID = results[0].member_id;
      res.render('아이디찾기결과.html', { memberID: memberID });
    } else {
      res.redirect('/아이디찾기?mode=error');
    }
  });
});

// 비밀번호 찾기 폼 전송 처리
app.post('/login/findPW', function (req, res) {
  const { memberID, memberEmail } = req.body;

  const query = 'SELECT member_pw FROM members WHERE member_id = ? AND member_Email = ?';
  connection.query(query, [memberID, memberEmail], (error, results) => {
    if (error) {
      console.error('Error querying database: ' + error.stack);
      return;
    }

    if (results.length > 0) {
      const memberPW = results[0].member_pw;
      res.render('비밀번호찾기결과.html', { memberPW: memberPW });
    } else {
      res.redirect('/비밀번호찾기?mode=error');
    }
  });
});

const reviewBoardModule = require('./후기게시판.js');
app.get('/review_board', checkLoginStatus, reviewBoardModule);


// 글쓰기 페이지 라우트
app.get('/review_board/post', (req, res) => {
  const { column, keyword } = req.query;
  const message = req.query.message;
  res.render('글쓰기.html', { column, keyword, message }); // 글쓰기 파일 렌더링, 쿼리 파라미터와 알림 메시지 전달
});

app.get('/board/:id', (req, res) => {
  const review_id = req.params.id;

  // 조회수 증가 쿼리
  const increaseViewCountQuery = 'UPDATE review_board SET hits = hits + 1 WHERE num = ?';

  connection.query(increaseViewCountQuery, [review_id], (err, result) => {
    if (err) {
      console.error('조회수 증가 실패:', err);
      res.status(500).send('조회수 증가에 실패했습니다.');
    } else {
      // 현재 날짜와 시간 설정
      const comment_date = moment().format('YYYY-MM-DD HH:mm:ss');

      // 댓글의 comment_date 업데이트
      const updateCommentDateQuery = 'UPDATE comments_review SET comment_date = ? WHERE review_id = ?';
      connection.query(updateCommentDateQuery, [comment_date, review_id], (err) => {
        if (err) {
          console.error('댓글 날짜 업데이트 실패:', err);
          res.status(500).send('댓글 날짜 업데이트에 실패했습니다.');
          return;
        }

        // 게시글 조회 쿼리를 실행하여 게시글 정보와 댓글 목록을 가져옴
        const query = `
          SELECT
            rb.*,
            cr.comment_id,
            cr.content AS comment_content,
            cr.member_id AS comment_member_id
          FROM
            review_board rb
            LEFT JOIN comments_review cr ON rb.num = cr.review_id
          WHERE
            rb.num = ?
        `;
        connection.query(query, [review_id], (err, rows) => {
          if (err) {
            console.error('게시글 조회 실패:', err);
            res.status(500).send('게시글 조회에 실패했습니다.');
          } else {
            if (rows.length === 0) {
              res.status(404).send('해당 게시글을 찾을 수 없습니다.');
            } else {
              const board = rows[0];
              // 게시글의 날짜 형식 변경
              board.rdate = moment(board.rdate).format('YYYY-MM-DD HH:mm:ss'); 
              
              const comments = [];
              const loggedInUser = req.session.memberID;

              // 댓글이 존재하는 경우 댓글 정보를 추출하여 comments 배열에 추가
              rows.forEach(row => {
                if (row.comment_id) {
                  const comment = {
                    comment_id: row.comment_id,
                    content: row.comment_content,
                    member_id: row.comment_member_id,
                    // 댓글의 날짜 형식 변경
                    comment_date: moment(row.comment_date).format('YYYY-MM-DD')
                  };
                  comments.push(comment);
                }
              });

              const vo = {
                boardId: review_id,
                board: board,
                boardList: rows,
                comments: comments
              };

              res.render('상세페이지.ejs', { vo, loggedInUser });
            }
          }
        });
      });
    }
  });
});

//게시글 삭제 코드
app.post('/review_board/board/delete/:id', (req, res) => {
  const review_id = req.params.id;
  const member_id = req.session.memberID;

  // Check if the current user is the author of the post
  const checkAuthorQuery = 'SELECT member_id FROM review_board WHERE num = ?';
  connection.query(checkAuthorQuery, [review_id], (err, result) => {
    if (err) {
      console.error('게시글 삭제 실패:', err);
      res.status(500).send('게시글 삭제에 실패했습니다.');
    } else {
      const author_id = result[0].member_id;

      // Compare the current user with the author of the post
      if (member_id !== author_id) {
        console.log('작성자가 아닌 사용자입니다. 게시글 삭제 권한이 없습니다.');
        res.status(403).send('작성자가 아닌 사용자입니다. 게시글 삭제 권한이 없습니다.');
      } else {
        // The current user is the author, proceed with deleting the post
        const deleteQuery = 'DELETE FROM review_board WHERE num = ?';
        connection.query(deleteQuery, [review_id], (err, result) => {
          if (err) {
            console.error('게시글 삭제 실패:', err);
            res.status(500).send('게시글 삭제에 실패했습니다.');
          } else {
            console.log('게시글 삭제 완료');
            res.redirect('/review_board');
          }
        });
      }
    }
  });
});


app.post('/review_board/board/post', (req, res) => {
  // Retrieve the post data from the request body
  const { title, content } = req.body;
  const member_id = req.session.memberID;
  const rdate = moment().format('YYYY-MM-DD HH:mm'); // 현재 날짜를 'YYYY-MM-DD' 형식으로 저장

  // Save the post data to the database
  const query = 'INSERT INTO review_board (title, content, member_id, rdate) VALUES (?, ?, ?, ?)';
  connection.query(query, [title, content, member_id, rdate], (err, result) => {  
    if (err) {
      console.error('게시글 등록 실패:', err);
      res.status(500).send('게시글 등록에 실패했습니다.');
    } else {
      console.log(req.body);
      res.redirect('/review_board'); // 게시글 등록 성공 후 후기게시판으로 리디렉션
    }
  });
});


app.post('/review_board/post', (req, res) => {
  res.render('./게시글작성완료.html'); // Replace 'post.html' with the actual file name and path for the post page
});

app.get('/', function (req, res) {
  res.render('index.html');
});

const server = app.listen(3000, () => {
  console.log('서버가 시작되었습니다: localhost:3000');
});

// 로그아웃 처리
app.get('/logout', function(req, res) {
  // 세션 초기화 또는 삭제
  req.session.destroy(function(err) {
    if (err) {
      console.error('세션 삭제 실패:', err);
    }
    res.redirect('/'); // 로그아웃 후, 메인 페이지로 리디렉션
  });
});


app.post('/comments', (req, res) => {
  const { comment, review_id } = req.body;
  const member_id = req.session.memberID;
  const comment_date = new Date();

  // 댓글을 데이터베이스에 저장합니다.
  const query = 'INSERT INTO comments_review (content, member_id, review_id, comment_date) VALUES (?, ?, ?, ?)';
  connection.query(query, [comment, member_id, review_id, comment_date], (err, result) => {
    if (err) {
      console.error('댓글 등록 실패:', err);
      res.status(500).send('댓글 등록에 실패했습니다.');
    } else {
      console.log('댓글 등록 완료');

      // 게시글 조회 쿼리를 실행하여 게시글 정보와 댓글 목록을 가져옵니다.
      const query = `
        SELECT
          rb.*,
          cr.comment_id,
          cr.content AS comment_content,
          cr.member_id AS comment_member_id
        FROM
          review_board rb
          LEFT JOIN comments_review cr ON rb.num = cr.review_id
        WHERE
          rb.num = ?
        `;
      connection.query(query, [review_id], (err, rows) => {
        if (err) {
          console.error('게시글 조회 실패:', err);
          res.status(500).send('게시글 조회에 실패했습니다.');
        } else {
          if (rows.length === 0) {
            res.status(404).send('해당 게시글을 찾을 수 없습니다.');
          } else {
            const board = rows[0];
            const comments = [];

            // 댓글이 존재하는 경우 댓글 정보를 추출하여 comments 배열에 추가합니다.
            rows.forEach(row => {
              if (row.comment_id) {
                const comment = {
                  comment_id: row.comment_id,
                  content: row.comment_content,
                  member_id: row.comment_member_id
                };
                comments.push(comment);
              }
            });

            const vo = {
              boardId: review_id,
              board: board,
              boardList: rows,
              comments: comments // 댓글 목록을 vo에 추가 이거약간 이상함 좀다가 집가서 수정 
            };
            const loggedInUser = req.session.memberID;

            

            res.render('상세페이지.ejs', { vo, loggedInUser });
            console.log('Fetched comments:', vo.comments);
          }
        }
      });
    }
  });
});

// 댓글 삭제 라우트
app.post('/review_board/comment/delete/:id', (req, res) => {
  const comment_id = req.params.id;
  const member_id = req.session.memberID;
  
  // 현재 사용자가 게시물의 작성자인지 확인
  const checkAuthorQuery = 'SELECT `member_id`, `review_id` FROM `members`.`comments_review` WHERE `comment_id` = ?';
  
  connection.query(checkAuthorQuery, [comment_id], (err, result) => {
    if (err) {
      console.error('댓글 삭제 실패:', err);
      res.status(500).send('댓글 삭제에 실패했습니다.');
    } else {
      const author_id = result[0].member_id;
      const review_id = result[0].review_id; // 게시글 ID도 가져옵니다.

      if (member_id !== author_id) {
        res.status(403).send('작성자가 아닌 사용자입니다. 댓글 삭제 권한이 없습니다.');
      } else {
        const deleteQuery = 'DELETE FROM `members`.`comments_review` WHERE `comment_id` = ?';
        
        connection.query(deleteQuery, [comment_id], (err, result) => {
          if (err) {
            console.error('댓글 삭제 실패:', err);
            res.status(500).send('댓글 삭제에 실패했습니다.');
          } else {
            console.log('댓글 삭제 완료');

            // 여기서 게시글 조회 로직을 수행합니다.
            const query = `
              SELECT
                rb.*,
                cr.comment_id,
                cr.content AS comment_content,
                cr.member_id AS comment_member_id
              FROM
                review_board rb
                LEFT JOIN comments_review cr ON rb.num = cr.review_id
              WHERE
                rb.num = ?
              `;

            connection.query(query, [review_id], (err, rows) => {
              if (err) {
                console.error('게시글 조회 실패:', err);
                res.status(500).send('게시글 조회에 실패했습니다.');
              } else {
                const board = rows[0];
                const comments = [];

                rows.forEach(row => {
                  if (row.comment_id) {
                    const comment = {
                      comment_id: row.comment_id,
                      content: row.comment_content,
                      member_id: row.comment_member_id
                    };
                    comments.push(comment);
                  }
                });

                const vo = {
                  boardId: review_id,
                  board: board,
                  boardList: rows,
                  comments: comments
                };

                const loggedInUser = req.session.memberID;
                res.render('상세페이지.ejs', { vo, loggedInUser });
              }
            });
          }
        });
      }
    }
  });
});

/*
app.get('/review_board/comment/edit/:id', (req, res) => {
  const comment_id = req.params.id;
  const member_id = req.session.memberID;
  const updatedComment = req.body.updatedComment; // 수정할 댓글 내용
  
  // 현재 사용자가 댓글의 작성자인지 확인
  const checkAuthorQuery = 'SELECT `member_id`, `review_id` FROM `members`.`comments_review` WHERE `comment_id` = ?';
  
  connection.query(checkAuthorQuery, [comment_id], (err, result) => {
    if (err) {
      console.error('댓글 수정 실패:', err);
      res.status(500).send('댓글 수정에 실패했습니다.');
    } else {
      const author_id = result[0].member_id;
      const review_id = result[0].review_id;

      if (member_id !== author_id) {
        res.status(403).send('작성자가 아닌 사용자입니다. 댓글 수정 권한이 없습니다.');
      } else {
        const updateQuery = 'UPDATE `members`.`comments_review` SET `content` = ? WHERE `comment_id` = ?';
        
        connection.query(updateQuery, [updatedComment, comment_id], (err, result) => {
          if (err) {
            console.error('댓글 수정 실패:', err);
            res.status(500).send('댓글 수정에 실패했습니다.');
          } else {
            console.log('댓글 수정 완료');

            const query = `
              SELECT
                rb.*,
                cr.comment_id,
                cr.content AS comment_content,
                cr.member_id AS comment_member_id
              FROM
                review_board rb
                LEFT JOIN comments_review cr ON rb.num = cr.review_id
              WHERE
                rb.num = ?
              `;

            connection.query(query, [review_id], (err, rows) => {
              if (err) {
                console.error('게시글 조회 실패:', err);
                res.status(500).send('게시글 조회에 실패했습니다.');
              } else {
                const board = rows[0];
                const comments = [];

                rows.forEach(row => {
                  if (row.comment_id) {
                    const comment = {
                      comment_id: row.comment_id,
                      content: row.comment_content,
                      member_id: row.comment_member_id
                    };
                    comments.push(comment);
                  }
                });

                const vo = {
                  boardId: review_id,
                  board: board,
                  boardList: rows,
                  comments: comments
                };

                const loggedInUser = req.session.memberID;
                res.render('상세페이지.ejs', { vo, loggedInUser });
              }
            });
          }
        });
      }
    }
  });
});
*/