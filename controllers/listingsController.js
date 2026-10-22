// controller لمراجعة الإعلانات وجلبها حسب التصنيف الجديد
const getListings = async (req, res) => {
  try {
    const { category, wilaya } = req.query; 
    // الأقسام المقبولة: boat_sale | job_offer | job_request

    let query = "SELECT * FROM marsad_listings WHERE status = 'active'";
    let queryParams = [];

    if (category) {
      query += " AND category = ?";
      queryParams.push(category);
    }

    if (wilaya && wilaya !== 'كل الولايات') {
      query += " AND wilaya = ?";
      queryParams.push(wilaya);
    }

    query += " ORDER BY created_at DESC";

    // تنفيذ الاستعلام على قاعدة البيانات
    const [rows] = await db.execute(query, queryParams);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });

  } catch (error) {
    console.error("Listing Fetch Error:", error);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ في السيرفر أثناء جلب البيانات"
    });
  }
};

module.exports = { getListings };