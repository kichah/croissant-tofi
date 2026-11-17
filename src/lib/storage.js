import { supabase } from './supabase';

// ─── Helpers: Mapping between Supabase flat columns & App objects ─────────────

function mapDailyEntryFromDb(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    storeId: row.store_id,
    date: row.date,
    morning: {
      fermentedCount: Number(row.morning_fermented_count || 0),
      leftoverBaked: Number(row.morning_leftover_baked || 0),
      leftoverRaw: Number(row.morning_leftover_raw || 0),
      leftoverSpoiled: Number(row.morning_leftover_spoiled || 0),
      directProfit: Number(row.morning_direct_profit || 0),
      expenses: Number(row.morning_expenses || 0),
      sweetsSales: Number(row.morning_sweets_sales || 0),
      fridgeSales: Number(row.morning_fridge_sales || 0),
    },
    evening: {
      fermentedCount: Number(row.evening_fermented_count || 0),
      leftoverBaked: Number(row.evening_leftover_baked || 0),
      leftoverRaw: Number(row.evening_leftover_raw || 0),
      leftoverSpoiled: Number(row.evening_leftover_spoiled || 0),
      directProfit: Number(row.evening_direct_profit || 0),
      expenses: Number(row.evening_expenses || 0),
      sweetsSales: Number(row.evening_sweets_sales || 0),
      fridgeSales: Number(row.evening_fridge_sales || 0),
    },
    createdAt: row.created_at,
  };
}

function mapDailyEntryToDb(entry) {
  return {
    store_id: entry.storeId,
    date: entry.date,
    morning_fermented_count: Number(entry.morning?.fermentedCount || 0),
    morning_leftover_baked: Number(entry.morning?.leftoverBaked || 0),
    morning_leftover_raw: Number(entry.morning?.leftoverRaw || 0),
    morning_leftover_spoiled: Number(entry.morning?.leftoverSpoiled || 0),
    morning_direct_profit: Number(entry.morning?.directProfit || 0),
    morning_expenses: Number(entry.morning?.expenses || 0),
    morning_sweets_sales: Number(entry.morning?.sweetsSales || 0),
    morning_fridge_sales: Number(entry.morning?.fridgeSales || 0),

    evening_fermented_count: Number(entry.evening?.fermentedCount || 0),
    evening_leftover_baked: Number(entry.evening?.leftoverBaked || 0),
    evening_leftover_raw: Number(entry.evening?.leftoverRaw || 0),
    evening_leftover_spoiled: Number(entry.evening?.leftoverSpoiled || 0),
    evening_direct_profit: Number(entry.evening?.directProfit || 0),
    evening_expenses: Number(entry.evening?.expenses || 0),
    evening_sweets_sales: Number(entry.evening?.sweetsSales || 0),
    evening_fridge_sales: Number(entry.evening?.fridgeSales || 0),
  };
}

function mapDeliveryFromDb(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    storeId: row.store_id,
    date: row.date,
    trays: Number(row.trays || 0),
    returnedPieces: Number(row.returned_pieces || 0),
    createdAt: row.created_at,
  };
}

function mapStockCheckFromDb(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    storeId: row.store_id,
    date: row.date,
    trays: Number(row.trays || 0),
    pieces: Number(row.pieces || 0),
    defective: Number(row.defective || 0),
    createdAt: row.created_at,
  };
}

// ─── Daily Entries ────────────────────────────────────────────────────────────

export async function getEntriesByStore(storeId) {
  try {
    const { data, error } = await supabase
      .from('daily_entries')
      .select('*')
      .eq('store_id', storeId)
      .order('date', { ascending: false });

    if (error) {
      console.error(
        'Error fetching daily entries from Supabase:',
        error.message,
      );
      return [];
    }

    return (data || []).map(mapDailyEntryFromDb);
  } catch (err) {
    console.error('Network error fetching daily entries:', err);
    return [];
  }
}

export async function saveDailyEntry(entry) {
  try {
    const payload = mapDailyEntryToDb(entry);

    // Check if an entry already exists for this store and date
    const { data: existing, error: findError } = await supabase
      .from('daily_entries')
      .select('id')
      .eq('store_id', payload.store_id)
      .eq('date', payload.date)
      .maybeSingle();

    if (findError) {
      console.error('Error checking existing entry:', findError.message);
    }

    if (existing) {
      const { error } = await supabase
        .from('daily_entries')
        .update(payload)
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating daily entry:', error.message);
        throw error;
      }
    } else {
      const { error } = await supabase.from('daily_entries').insert(payload);

      if (error) {
        console.error('Error inserting daily entry:', error.message);
        throw error;
      }
    }
  } catch (err) {
    console.error('Network error saving daily entry:', err);
    throw err;
  }
}

export async function deleteDailyEntry(entryId) {
  try {
    const { error } = await supabase
      .from('daily_entries')
      .delete()
      .eq('id', entryId);

    if (error) {
      console.error('Error deleting daily entry from Supabase:', error.message);
      throw error;
    }
  } catch (err) {
    console.error('Network error deleting daily entry:', err);
    throw err;
  }
}

// ─── Deliveries ───────────────────────────────────────────────────────────────

export async function getDeliveriesByStore(storeId) {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('store_id', storeId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching deliveries from Supabase:', error.message);
      return [];
    }

    return (data || []).map(mapDeliveryFromDb);
  } catch (err) {
    console.error('Network error fetching deliveries:', err);
    return [];
  }
}

export async function saveDelivery(delivery) {
  try {
    const payload = {
      store_id: delivery.storeId,
      date: delivery.date,
      trays: Number(delivery.trays || 0),
      returned_pieces: Number(delivery.returnedPieces || 0),
    };

    // If updating an existing delivery with a valid database ID
    if (delivery.id && !String(delivery.id).startsWith('del_')) {
      const { error } = await supabase
        .from('deliveries')
        .update(payload)
        .eq('id', delivery.id);

      if (error) {
        console.error('Error updating delivery:', error.message);
        throw error;
      }
    } else {
      const { error } = await supabase.from('deliveries').insert(payload);

      if (error) {
        console.error('Error inserting delivery:', error.message);
        throw error;
      }
    }
  } catch (err) {
    console.error('Network error saving delivery:', err);
    throw err;
  }
}

export async function deleteDelivery(deliveryId) {
  try {
    const { error } = await supabase
      .from('deliveries')
      .delete()
      .eq('id', deliveryId);

    if (error) {
      console.error('Error deleting delivery from Supabase:', error.message);
      throw error;
    }
  } catch (err) {
    console.error('Network error deleting delivery:', err);
    throw err;
  }
}

// ─── Physical Stock Checks ────────────────────────────────────────────────────

export async function getStockChecksByStore(storeId) {
  try {
    const { data, error } = await supabase
      .from('stock_checks')
      .select('*')
      .eq('store_id', storeId)
      .order('date', { ascending: false });

    if (error) {
      console.error(
        'Error fetching stock checks from Supabase:',
        error.message,
      );
      return [];
    }

    return (data || []).map(mapStockCheckFromDb);
  } catch (err) {
    console.error('Network error fetching stock checks:', err);
    return [];
  }
}

export async function saveStockCheck(check) {
  try {
    const payload = {
      store_id: check.storeId,
      date: check.date,
      trays: Number(check.trays || 0),
      pieces: Number(check.pieces || 0),
      defective: Number(check.defective || 0),
    };

    if (check.id && !String(check.id).startsWith('chk_')) {
      const { error } = await supabase
        .from('stock_checks')
        .update(payload)
        .eq('id', check.id);

      if (error) {
        console.error('Error updating stock check:', error.message);
        throw error;
      }
    } else {
      const { error } = await supabase.from('stock_checks').insert(payload);

      if (error) {
        console.error('Error inserting stock check:', error.message);
        throw error;
      }
    }
  } catch (err) {
    console.error('Network error saving stock check:', err);
    throw err;
  }
}

export async function deleteStockCheck(checkId) {
  try {
    const { error } = await supabase
      .from('stock_checks')
      .delete()
      .eq('id', checkId);

    if (error) {
      console.error('Error deleting stock check from Supabase:', error.message);
      throw error;
    }
  } catch (err) {
    console.error('Network error deleting stock check:', err);
    throw err;
  }
}
