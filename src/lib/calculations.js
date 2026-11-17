export function calculateShiftMetrics(shift, isEvening = false) {
  // الصافي = الفائدة المباشرة + المصاريف - الحلويات - الثلاجة
  const netCroissantRevenue =
    Number(shift.directProfit || 0) +
    Number(shift.expenses || 0) -
    Number(shift.sweetsSales || 0) -
    Number(shift.fridgeSales || 0);

  // في المساء: الكرواسون المطهو المتبقي يُرمى → يُحسب ضمن التالف تلقائياً
  const eveningBakedSpoiled = isEvening ? Number(shift.leftoverBaked || 0) : 0;

  // عدد الحبات المباعة = المخمرة - الباقي مطهو (صباح فقط) - الباقي غير مطهو - الباقي الفاسد
  const soldCount = Math.max(
    0,
    Number(shift.fermentedCount || 0) -
      (isEvening ? 0 : Number(shift.leftoverBaked || 0)) -
      Number(shift.leftoverRaw || 0) -
      Number(shift.leftoverSpoiled || 0) -
      eveningBakedSpoiled,
  );

  // إجمالي التالف للمساء = الفاسد المدخل + المطهو المتبقي
  const totalSpoiled =
    Number(shift.leftoverSpoiled || 0) + eveningBakedSpoiled;

  // المتوسط = الصافي / عدد الحبات المباعة
  const averagePerPiece = soldCount > 0 ? netCroissantRevenue / soldCount : 0;

  return {
    netCroissantRevenue,
    soldCount,
    totalSpoiled,
    averagePerPiece,
  };
}
