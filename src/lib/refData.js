import { supabase } from '../supabase';

// Reference lists that almost never change (wilayas, boat types, guide branches).
// Every page used to download them again on each visit. Now: one request per app session, shared by all pages,
// and the last copy is kept in localStorage so the lists are there immediately on the next visit (also offline).
// The copy is refreshed in the background once per session, so a change in the database shows up on the next open.
const PREFIX = 'marsa.ref.';
const pending = {};

function saved(key) {
  try {
    const v = JSON.parse(localStorage.getItem(PREFIX + key));
    return Array.isArray(v) && v.length ? v : null;
  } catch {
    return null;
  }
}

function load(key, run) {
  if (!pending[key]) {
    const fresh = Promise.resolve(run()).then(
      ({ data, error }) => {
        if (error || !Array.isArray(data)) return null;
        try {
          localStorage.setItem(PREFIX + key, JSON.stringify(data));
        } catch {
          /* storage full or blocked: the in-memory copy is enough */
        }
        return data;
      },
      () => null
    );
    const old = saved(key);
    pending[key] = old
      ? Promise.resolve(old)
      : fresh.then((data) => {
          if (!data) delete pending[key]; // failed: let the next page try again
          return data || [];
        });
  }
  return pending[key];
}

export const getWilayas = () => load('wilayas', () => supabase.from('wilayas').select('*').order('id'));
export const getBoatTypes = () => load('boat_types', () => supabase.from('boat_types').select('*').order('sort_order'));
export const getGuideCategories = () => load('guide_categories', () => supabase.from('guide_categories').select('*').order('sort_order'));
