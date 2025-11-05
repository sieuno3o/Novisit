import { Link } from "react-router-dom";
import "./Footer.scss";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner wrapper">
        <div className="site-footer__cols">

          <div className="site-footer__col">
            <div className="site-footer__title">빠른 링크</div>
            <div><Link to="/notice">알림 도메인 설정하기</Link></div>
            <div><Link to="/mypage">카카오톡 연동 설정하기</Link></div>
            <div><Link to="/mypage">디스코드 연동 설정하기</Link></div>
          </div>

          <div className="site-footer__col">
            <div className="site-footer__title">사이트 정보</div>
            <div>© 2025 Team Novisit</div>
            <div>
              <a
                href="https://github.com/pknu-wap/Novisit"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </div>
            <div>Version 1.0.0</div>
          </div>

          <div className="site-footer__col">
            <div className="site-footer__title">정책 문서</div>
            <div>이용약관</div>
            <div>개인정보처리방침</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
