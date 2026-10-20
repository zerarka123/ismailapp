import { Link, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';

export default function NeedLogin({ text = 'سجّل الدخول لمتابعة هذه الخطوة.' }) {
  const { pathname } = useLocation();
  return (
    <div className="needlogin">
      <Icon name="user" size={34} color="#0A6EB4" />
      <p>{text}</p>
      <Link className="btn" to={`/login?next=${encodeURIComponent(pathname)}`}>تسجيل الدخول</Link>
    </div>
  );
}
