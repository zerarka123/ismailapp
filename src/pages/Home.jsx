import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import Icon from '../components/Icon.jsx';
import ListingFeed from '../components/ListingFeed.jsx';

export default function Home() {
  const { user } = useAuth();
  const [types, setTypes] = useState([]);
  const [chip, setChip] = useState('all'); // 'all' | 'engine' | boat type id

  useEffect(() => {
    supabase.from('boat_types').select('id, name_ar').order('sort_order').then(({ data }) => setTypes(data || []));
  }, []);

  const filters = chip === 'all' ? {} : chip === 'engine' ? { kind: 'engine' } : { typeId: chip };

  return (
    <>
      <header className="head">
        <div className="brand"><img src="/logo.png" alt="" />مرسى</div>
        <Link className="iconbtn" to={user ? '/account' : '/login'} aria-label={user ? 'حسابي' : 'تسجيل الدخول'}>
          <Icon name="user" />
        </Link>
      </header>

      <Link to="/search" className="searchbox"><Icon name="search" color="#51708A" />ابحث عن قارب، محرك، معدات...</Link>

      <div className="shortcuts">
        <Link to="/guide/marine" className="shortcut"><Icon name="compass" />الدليل البحري</Link>
        <Link to="/guide/fisher" className="shortcut sand"><Icon name="fish" />دليل الصياد</Link>
      </div>

      <div className="chips">
        <button className={`chip ${chip === 'all' ? 'on' : ''}`} onClick={() => setChip('all')}>الكل</button>
        {types.map((t) => (
          <button key={t.id} className={`chip ${chip === t.id ? 'on' : ''}`} onClick={() => setChip(t.id)}>{t.name_ar}</button>
        ))}
        <button className={`chip ${chip === 'engine' ? 'on' : ''}`} onClick={() => setChip('engine')}>محركات</button>
      </div>

      <ListingFeed filters={filters} emptyText="لا توجد إعلانات في هذا القسم بعد. كن أول من ينشر!" />
    </>
  );
}
