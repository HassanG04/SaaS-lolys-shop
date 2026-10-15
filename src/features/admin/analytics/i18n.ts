export interface AnalyticsI18n {
  title: string
  subtitle: string
  refresh: string
  exportCsv: string
  exportSuccess: string
  loading: string
  error: string
  empty: string
  salesOverviewTitle: string
  salesOverviewDesc: string
  salesUnits: string
  salesRevenue: string
  salesUnitsMa7: string
  salesRevenueMa7: string
  salesUnitsMa28: string
  salesRevenueMa28: string
  productPerfTitle: string
  productPerfDesc: string
  productName: string
  revenueShare: string
  totalRevenue: string
  totalUnits: string
  abcClass: string
  xyzClass: string
  cvDemand: string
  segmentsTitle: string
  segmentsDesc: string
  segmentChampions: string
  segmentLoyal: string
  segmentPromising: string
  segmentAtRisk: string
  segmentLost: string
  segmentOther: string
  customerCount: string
  avgOrderValue: string
  cohortTitle: string
  cohortDesc: string
  cohortMonth: string
  cohortSize: string
  retentionRate: string
  periodMonth: string
  basketTitle: string
  basketDesc: string
  productA: string
  productB: string
  support: string
  confidence: string
  lift: string
  sampleOrders: string
  discountTitle: string
  discountDesc: string
  promoUnits: string
  regularUnits: string
  uplift: string
  discountDisclaimer: string
  fulfilmentTitle: string
  fulfilmentDesc: string
  cancellationRate: string
  refusalRate: string
  expiryRate: string
  medianDeliveryDays: string
  days: string
  avgProofHours: string
  hours: string
  geographyTitle: string
  geographyDesc: string
  governorate: string
  ordersCount: string
  privacyNote: string
  privacyBadge: string
}

export const analyticsTranslations: Record<'ar' | 'en', AnalyticsI18n> = {
  ar: {
    title: 'التحليلات الوصفية وتجزئة العملاء',
    subtitle:
      'رؤى تحليلية شاملة للمبيعات وسلوك العملاء وجودة التنفيذ مع التزام صارم بخصوصية البيانات',
    refresh: 'تحديث الرؤى',
    exportCsv: 'تصدير تقرير CSV',
    exportSuccess: 'تم تصدير ملف تحليلات البيانات بنجاح',
    loading: 'جارٍ جلب الرؤى التحليلية…',
    error: 'تعذر تحميل الرؤى التحليلية، يرجى إعادة المحاولة.',
    empty: 'لا توجد بيانات كافية حالياً لعرض التحليلات الوصفية.',
    salesOverviewTitle: 'نظرة عامة على المبيعات',
    salesOverviewDesc: 'المتوسط المتحرك لـ 7 أيام و28 يوماً للوحدات والإيرادات',
    salesUnits: 'الوحدات',
    salesRevenue: 'الإيرادات (ج.م)',
    salesUnitsMa7: 'متوسط 7 أيام (وحدات)',
    salesRevenueMa7: 'متوسط 7 أيام (إيرادات)',
    salesUnitsMa28: 'متوسط 28 يوماً (وحدات)',
    salesRevenueMa28: 'متوسط 28 يوماً (إيرادات)',
    productPerfTitle: 'أداء وتصنيف المنتجات (ABC / XYZ)',
    productPerfDesc: 'تحليل باريتو لحصة الإيرادات (ABC) وتذبذب الطلب الأسبوعي (XYZ)',
    productName: 'المنتج',
    revenueShare: 'حصة الإيراد',
    totalRevenue: 'إجمالي الإيراد (ج.م)',
    totalUnits: 'إجمالي الوحدات',
    abcClass: 'فئة ABC',
    xyzClass: 'فئة XYZ',
    cvDemand: 'معامل التباين',
    segmentsTitle: 'تجزئة العملاء (RFM)',
    segmentsDesc: 'تصنيف العملاء إلى شرائح سلوكية بأرقام تجميعية دون أي بيانات شخصية',
    segmentChampions: 'الأبطال',
    segmentLoyal: 'الأوفياء',
    segmentPromising: 'واعدون',
    segmentAtRisk: 'في خطر',
    segmentLost: 'ضائعون',
    segmentOther: 'أخرى (حماية الخصوصية)',
    customerCount: 'عدد العملاء',
    avgOrderValue: 'متوسط قيمة الطلب (ج.م)',
    cohortTitle: 'مصفوفة الاحتفاظ بالعملاء (Cohorts)',
    cohortDesc: 'نسبة احتفاظ مجموعات العملاء شهراً بعد شهر بناءً على أول طلب شراء',
    cohortMonth: 'شهر البداية',
    cohortSize: 'حجم المجموعة',
    retentionRate: 'نسبة الاحتفاظ',
    periodMonth: 'شهر',
    basketTitle: 'تحليل سلة المشتريات (الأصناف المشتراة معاً)',
    basketDesc: 'اكتشاف ارتباط المنتجات المقترنة الأكثر تكراراً (الدعم >= 2% أو >= 5 طلبات)',
    productA: 'المنتج الأساسي',
    productB: 'المنتج المقترن',
    support: 'الدعم (Support)',
    confidence: 'الثقة (Confidence)',
    lift: 'قوة الارتباط (Lift)',
    sampleOrders: 'عدد الطلبات المشتركة',
    discountTitle: 'أثر التخفيضات والعروض',
    discountDesc: 'مقارنة متوسط المبيعات الأسبوعية خلال أسابيع العروض مقابل الأسابيع العادية',
    promoUnits: 'مبيعات أسابيع التخفيض',
    regularUnits: 'مبيعات الأسابيع العادية',
    uplift: 'نسبة الزيادة التقديرية',
    discountDisclaimer: 'هذا التحليل للمقارنة ولا يثبت علاقة سببية حتمية',
    fulfilmentTitle: 'جودة المعالجة والتنفيذ',
    fulfilmentDesc: 'معدلات الإلغاء والرفض والوقت الوسيط للتوصيل وسرعة مراجعة إنستاباي',
    cancellationRate: 'معدل الإلغاء',
    refusalRate: 'معدل الرفض',
    expiryRate: 'معدل انتهاء الصلاحية دون دفع',
    medianDeliveryDays: 'الوسيط الزمني للتوصيل',
    days: 'يوم',
    avgProofHours: 'متوسط فحص إيصال إنستاباي',
    hours: 'ساعة',
    geographyTitle: 'التوزيع الجغرافي للمبيعات',
    geographyDesc:
      'توزيع الطلبات والإيرادات حسب المحافظة (المجموعات الأقل من 5 عملاء تُدمج لحماية الخصوصية)',
    governorate: 'المحافظة',
    ordersCount: 'عدد الطلبات',
    privacyNote: 'المجموعات التي تضم أقل من 5 عملاء يتم دمجها تلقائياً لحماية سرية الأفراد.',
    privacyBadge: 'حماية خصوصية',
  },
  en: {
    title: 'Descriptive Analytics & Customer Insights',
    subtitle:
      'Comprehensive sales, customer segment, and fulfillment insights with strict data privacy guarantees',
    refresh: 'Refresh Insights',
    exportCsv: 'Export CSV Report',
    exportSuccess: 'Analytics report exported successfully',
    loading: 'Loading analytics insights…',
    error: 'Failed to load analytics insights. Please retry.',
    empty: 'No analytics insights data available yet.',
    salesOverviewTitle: 'Sales Overview',
    salesOverviewDesc: '7-day and 28-day moving averages of units and revenue',
    salesUnits: 'Units',
    salesRevenue: 'Revenue (EGP)',
    salesUnitsMa7: '7d MA Units',
    salesRevenueMa7: '7d MA Revenue',
    salesUnitsMa28: '28d MA Units',
    salesRevenueMa28: '28d MA Revenue',
    productPerfTitle: 'Product Performance & Classification (ABC / XYZ)',
    productPerfDesc: 'Pareto revenue share (ABC) and weekly demand variability (XYZ)',
    productName: 'Product',
    revenueShare: 'Revenue Share',
    totalRevenue: 'Total Revenue (EGP)',
    totalUnits: 'Total Units',
    abcClass: 'ABC Class',
    xyzClass: 'XYZ Class',
    cvDemand: 'Demand CV',
    segmentsTitle: 'Customer Segments (RFM)',
    segmentsDesc: 'Behavioral customer grouping in strict aggregates without personal data',
    segmentChampions: 'Champions',
    segmentLoyal: 'Loyal',
    segmentPromising: 'Promising',
    segmentAtRisk: 'At Risk',
    segmentLost: 'Lost',
    segmentOther: 'Other (Privacy Merged)',
    customerCount: 'Customers',
    avgOrderValue: 'AOV (EGP)',
    cohortTitle: 'Customer Cohort Retention Matrix',
    cohortDesc: 'Monthly cohort retention rates based on initial order month',
    cohortMonth: 'Cohort Month',
    cohortSize: 'Cohort Size',
    retentionRate: 'Retention Rate',
    periodMonth: 'Month',
    basketTitle: 'Market Basket Analysis (Frequently Bought Together)',
    basketDesc: 'Product affinities meeting support >= 2% or >= 5 joint orders',
    productA: 'Product A',
    productB: 'Product B',
    support: 'Support',
    confidence: 'Confidence',
    lift: 'Lift',
    sampleOrders: 'Joint Orders',
    discountTitle: 'Discount & Promotion Effect',
    discountDesc: 'Comparison of promo week weekly units vs baseline non-promo weeks',
    promoUnits: 'Promo Week Units',
    regularUnits: 'Baseline Week Units',
    uplift: 'Estimated Uplift',
    discountDisclaimer: 'Correlation for comparison; not proof of cause',
    fulfilmentTitle: 'Fulfillment & Order Quality',
    fulfilmentDesc: 'Cancellation, refusal, expiry rates, delivery time, and InstaPay turnaround',
    cancellationRate: 'Cancellation Rate',
    refusalRate: 'Refusal Rate',
    expiryRate: 'Unpaid Expiry Rate',
    medianDeliveryDays: 'Median Delivery Days',
    days: 'days',
    avgProofHours: 'Avg InstaPay Proof Review',
    hours: 'hours',
    geographyTitle: 'Geographic Distribution',
    geographyDesc: 'Orders and revenue by Egyptian governorate (groups < 5 customers merged)',
    governorate: 'Governorate',
    ordersCount: 'Orders Count',
    privacyNote:
      'Groups with fewer than 5 customers are automatically merged to preserve individual privacy.',
    privacyBadge: 'Privacy Protected',
  },
}

export function useAnalyticsI18n(lang: string): AnalyticsI18n {
  return analyticsTranslations[lang === 'ar' ? 'ar' : 'en']
}
