const express = require('express');
const helmet = require('helmet'); //보안
const router = express.Router();
const mysql = require('mysql');
const path = require('path');
const app = express();
const port = 3000;
const moment = require('moment');

app.use(helmet()); //보안

// MySQL 연결 설정
const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '1234',
  database: 'members',
  port: '3306'
});

// MySQL 연결 시도
connection.connect((err) => {
  if (err) {
    console.error('MySQL 연결 실패:', err);
  } else {
    console.log('MySQL 연결 성공!');
  }
});

// 뷰 템플릿 엔진 설정
app.set('views', path.join(__dirname, '게시판모음'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(express.urlencoded({ extended: true })); // express.urlencoded 미들웨어 추가

// 정적 파일 제공을 위한 미들웨어 설정
router.use('/review_board', express.static(path.join(__dirname, '게시판모음')));

// 리뷰 게시판 목록 조회 라우터
router.get('/review_board', (req, res) => {
  const keyword = req.query.keyword || '';
  const column = req.query.column || 'title';
  const page = parseInt(req.query.page || 1);
  const countPerPage = 10;
  const pageBlockSize = 10;

  const rdate = moment().format('YYYY-MM-DD'); // 현재 날짜를 'YYYY-MM-DD' 형식으로 저장
  let query = `SELECT * FROM review_board`;

  if (keyword) {
    if (column === 'title') {
      query += ` WHERE title LIKE '%${keyword}%'`;
    } else if (column === 'content') {
      query += ` WHERE content LIKE '%${keyword}%'`;
    } else if (column === 'member_id') {
      query += ` WHERE member_id LIKE '%${keyword}%'`;
    } else {
      query += ` WHERE (title LIKE '%${keyword}%' OR content LIKE '%${keyword}%' OR member_id LIKE '%${keyword}%')`;
    }
  }

  // 총 게시글 수 조회 쿼리
    const totalCountQuery = `
    SELECT COUNT(*) AS totalCount
    FROM review_board
    ${keyword ? `WHERE title LIKE '%${keyword}%' OR content LIKE '%${keyword}%' OR member_id LIKE '%${keyword}%'` : ''}
    `;

connection.query(totalCountQuery, (err, result) => {
if (err) {
  console.error('게시판 목록 조회 실패:', err);
  res.status(500).send('게시판 목록 조회에 실패했습니다.');
} else {
  const totalCount = result[0].totalCount;
  const countTotalPage = Math.ceil(totalCount / countPerPage);
  const currentPage = Math.max(1, Math.min(page, countTotalPage));
  const startPage = Math.floor((currentPage - 1) / pageBlockSize) * pageBlockSize + 1;
  const endPage = Math.min(startPage + pageBlockSize - 1, countTotalPage);

  console.log('totalCount:', totalCount);
  console.log('countPerPage:', countPerPage);
  console.log('currentPage:', currentPage);
  console.log('startPage:', startPage);
  console.log('endPage:', endPage);
  


  // 페이지네이션 쿼리
  const paginationQuery = `
    SELECT *
    FROM review_board
    ${keyword ? `WHERE title LIKE '%${keyword}%' OR content LIKE '%${keyword}%' OR member_id LIKE '%${keyword}%'` : ''}
    ORDER BY num DESC
    LIMIT ${(currentPage - 1) * countPerPage}, ${countPerPage};
  `;
  console.log('paginationQuery:', paginationQuery);

  connection.query(paginationQuery, (err, rows) => {
    if (err) {
      console.error('게시판 목록 조회 실패:', err);
      res.status(500).send('게시판 목록 조회에 실패했습니다.');
    } else {
      const pageBoardList = rows.map(row => {
        row.rdate = moment(row.rdate).format('YYYY-MM-DD');
      return row;
    });
      const prevPage = currentPage > 1 ? currentPage - 1 : null;
      const nextPage = currentPage < countTotalPage ? currentPage + 1 : null;

      console.log('prevPage:', prevPage);
      console.log('nextPage:', nextPage);
     
      const offset = (currentPage - 1) * countPerPage;
      console.log('Offset:', offset);

      const vo = {
        boardList: pageBoardList,
        keyword: keyword,
        column: column,
        page: currentPage,
        countPerPage: countPerPage,
        pageBlockSize: pageBlockSize,
        startPage: startPage,
        endPage: endPage,
        prevPage: prevPage,
        nextPage: nextPage
      };
      res.render('후기 게시판.ejs', { vo, boardList: pageBoardList });
    }
  });
}
});
});

// 글쓰기 페이지 라우트
router.get('/review_board/post', (req, res) => {
  const { column, keyword } = req.query;
  const message = req.query.message;
  res.render('글쓰기.html', { column, keyword, message }); // 글쓰기 파일 렌더링, 쿼리 파라미터와 알림 메시지 전달
});


router.get('/review_board/:id', (req, res) => {
  const review_id = req.params.id;


  // 조회수 증가 쿼리
  const increaseViewCountQuery = 'UPDATE review_board SET hits = hits + 1 WHERE num = ?';
  
  connection.query(increaseViewCountQuery, [review_id], (err, result) => {
    if (err) {
      console.error('조회수 증가 실패:', err);
      res.status(500).send('조회수 증가에 실패했습니다.');
    } else {
      // 게시글 조회 쿼리를 실행하여 게시글 정보와 댓글 목록을 가져옴
      const query = `
        SELECT
          rb.*,
          cr.comment_id,
          cr.content AS comment_content,
          cr.member_id AS comment_member_id
          cr.comment_date AS comment_date
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
          // 게시글 정보
     const board = rows[0];
      
      // 날짜 형식을 변경 (moment 라이브러리를 사용하여 'YYYY-MM-DD' 형식으로)
          if (rows.length === 0) {
            res.status(404).send('해당 게시글을 찾을 수 없습니다.');
          } else {
            const board = rows[0];
            board.rdate = moment(board.rdate).format('YYYY-MM-DD'); // 게시글의 날짜 형식 변경
            const comments = [];
            const loggedInUser = req.session.memberID;

            // 댓글이 존재하는 경우 댓글 정보를 추출하여 comments 배열에 추가
            rows.forEach(row => {
              if (row.comment_id) {
                const comment = {
                  comment_id: row.comment_id,
                  content: row.comment_content,
                  member_id: row.comment_member_id,
                  comment_date: moment(row.comment_date).format('YYYY-MM-DD HH:mm:ss') // 댓글의 날짜 형식 변경
                };
                comments.push(comment);
              }
            });

            const vo = {
              boardId: review_id,
              board: board,
              boardList: rows,
              comments: comments // 댓글 목록을 vo에 추가
            };

            res.render('상세페이지.ejs', { vo, loggedInUser   });
          }
        }
      });
    }
  });
});



// 게시글 등록 라우트
router.post('/review_board/board/post', (req, res) => {
  // 게시글 작성 폼에서 전송된 데이터 가져오기
  const { title, content } = req.body;
  const member_id = req.session.memberID;
  const rdate = moment().format('YYYY-MM-DD'); // 현재 날짜를 'YYYY-MM-DD' 형식으로 저장

  // 데이터베이스에 게시글 정보 저장
  const query = 'INSERT INTO review_board (title, content, member_id, rdate) VALUES (?, ?, ?, ?)';
  connection.query(query, [title, content, member_id, rdate], (err, result) => {
    if (err) {
      res.status(500).send('게시글 등록에 실패했습니다.');
    } else {
      console.log(req.body);

      const message = '게시글이 등록되었습니다.'; // 알림 메시지
      res.render('게시글작성완료.html', { message }); // 게시글 작성 완료 페이지를 렌더링하며 알림 메시지 전달
    }
  });
});

// 게시글 삭제 라우트
router.post('/review_board/board/delete/:id', (req, res) => {

  //보안
  // Validate inputs
  req.check('id', 'Invalid review ID').notEmpty().isInt();
  
  const errors = req.validationErrors();
  if (errors) {
    return res.status(400).send(errors);
  }//여기까지

  const review_id = req.params.id;
  const member_id = req.session.memberID;

  // 현재 사용자가 게시물의 작성자인지 확인
  const checkAuthorQuery = 'SELECT member_id FROM review_board WHERE num = ?';
  connection.query(checkAuthorQuery, [review_id], (err, result) => {
    if (err) {
      console.error('게시글 삭제 실패:', err);
      res.status(500).send('게시글 삭제에 실패했습니다.');
    } else {
      const author_id = result[0].member_id;

      // 현재 사용자와 게시물 작성자 비교
      if (member_id !== author_id) {
        console.log('작성자가 아닌 사용자입니다. 게시글 삭제 권한이 없습니다.');
        res.status(403).send('작성자가 아닌 사용자입니다. 게시글 삭제 권한이 없습니다.');
      } else {
        // 현재 사용자가 작성자 게시물 삭제 가능
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

// 댓글 삭제 라우트
router.post('/review_board/comment/delete/:id', (req, res) => {
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

// 댓글 등록 라우터
router.post('/comments', (req, res) => {

  // Validation 보안
  req.checkBody('comment', 'Comment cannot be empty').notEmpty();
  const errors = req.validationErrors();
  
  if (errors) {
    return res.status(400).send(errors);
   } //여기까지

  const { comment: commentBody, review_id } = req.body;
  const member_id = req.session.memberID;
  const comment_date = new Date();
  console.log(`Session memberID: ${member_id}`);  // 세션 값 확인

  const query = 'INSERT INTO comments_review (content, member_id, review_id, comment_date) VALUES (?, ?, ?, ?)';
  connection.query(query, [commentBody, member_id, review_id, comment_date], (err, result) => {
    if (err) {
      console.error('댓글 등록 실패:', err);
      res.status(500).send('댓글 등록에 실패했습니다.');
    } else {
      console.log('댓글 등록 완료');

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
          console.log('게시글과 댓글 조회 결과:', rows);  // 조회 결과 로깅
          
          if (rows.length === 0) {
            res.status(404).send('해당 게시글을 찾을 수 없습니다.');
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

            console.log('조회된 댓글:', comments);  // 댓글 정보 로깅

            const vo = {
              boardId: review_id,
              board: board,
              boardList: rows,
              comments: comments
            };
            const loggedInUser = req.session.memberID;
            console.log(`Logged In User: ${loggedInUser}`);  // 로그인된 사용자 정보 로깅

            res.render('상세페이지.ejs', { vo, loggedInUser });
            // 새로운 댓글을 데이터베이스에 추가하고, 게시글과 댓글을 즉시 조회
            
          }
        }
      });
    }
  });
});

// ↓댓글 수정 코드 
/*router.get('/review_board/comment/edit/:id', (req, res) => {
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
app.use('/', router);


module.exports = router;