import { useI18n } from '../i18n/index.jsx';
import { CURRENCIES, DZD_UNITS, fmtPrice, parsePrice } from '../lib/price';

// Price field of the post / edit forms: amount + currency (DZD, EUR, USD) and, for dinars, a unit (k / M / mi).
// value = { price, priceUnit, currency } (strings, as typed); onChange gets the same object back.
export default function PriceInput({ value, onChange }) {
  const { t } = useI18n();
  const { price, priceUnit, currency } = value;
  const isDzd = currency === 'DZD';
  const set = (patch) => onChange({ price, priceUnit, currency, ...patch });
  const amount = parsePrice(price, priceUnit, currency);

  return (
    <div className="field">
      <label>{t('sell.price_label')}</label>
      <div className="price-row">
        <input
          className="input"
          inputMode="decimal"
          dir="ltr"
          value={price}
          onChange={(e) => set({ price: e.target.value.replace(/[^\d.,]/g, '') })}
          maxLength={16}
          placeholder={t('sell.price_hint')}
        />
        {isDzd && (
          <select className="input" value={priceUnit} onChange={(e) => set({ priceUnit: e.target.value })} aria-label={t('price.unit')}>
            {DZD_UNITS.map((u) => <option key={u.id} value={u.id}>{t(`price.opt_${u.id}`)}</option>)}
          </select>
        )}
        <select className="input" value={currency} onChange={(e) => set({ currency: e.target.value, priceUnit: e.target.value === 'DZD' ? priceUnit : '1' })} aria-label={t('price.currency_pick')}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{t(`price.cur_${c}`)}</option>)}
        </select>
      </div>
      {Number.isFinite(amount) && amount != null && <small className="muted">= {fmtPrice(amount, currency)}</small>}
    </div>
  );
}
