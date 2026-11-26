import type { PropertyType } from '@/types/domain';

export interface FloorPlanRoom {
  id: string;
  nameEn: string;
  nameAr: string;
  zone: 'living' | 'bedroom' | 'kitchen' | 'outdoor' | 'utility' | 'commercial';
  /** Normalized grid coordinates (0-100) for crisp responsive 2D & 3D isometric rendering */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Wall extrusion height in px for 3D isometric mode */
  wallHeightPx: number;
  areaSqft: number;
  dimensionsLabel: string;
  finishEn: string;
  finishAr: string;
  videoCueSec: number;
}

export interface ArchitecturalFloorPlan {
  levelLabelEn: string;
  levelLabelAr: string;
  orientation: string;
  totalSqft: number;
  rooms: FloorPlanRoom[];
}

export function getFloorPlanForProperty(params: {
  propertyType: PropertyType;
  areaSqft: number;
  bedrooms: number;
}): ArchitecturalFloorPlan {
  const total = Math.max(350, Math.round(params.areaSqft));

  // Dedicated Studio Architectural Floorplate
  if (params.bedrooms === 0 && params.propertyType === 'apartment') {
    return {
      levelLabelEn: 'Designer Open-Plan Studio Floorplate',
      levelLabelAr: 'مخطط استوديو معماري مفتوح',
      orientation: 'W · Golf Course & Skyline View',
      totalSqft: total,
      rooms: [
        {
          id: 'rm-studio-suite',
          nameEn: 'Open Living & Sleeping Suite',
          nameAr: 'مساحة المعيشة والنوم المفتوحة',
          zone: 'living',
          x: 8,
          y: 12,
          w: 56,
          h: 52,
          wallHeightPx: 36,
          areaSqft: Math.round(total * 0.48),
          dimensionsLabel: '5.6m × 3.8m',
          finishEn: 'Floor-to-Ceiling Glazing · Built-in Media Wall · Smart Climate',
          finishAr: 'واجهات زجاجية كاملة · جدار ترفيه مدمج · تحكم ذكي بالتكييف',
          videoCueSec: 4,
        },
        {
          id: 'rm-studio-kitchen',
          nameEn: 'Fitted Kitchenette & Dining Bar',
          nameAr: 'مطبخ حديث مجهز بالكامل',
          zone: 'kitchen',
          x: 66,
          y: 12,
          w: 26,
          h: 32,
          wallHeightPx: 34,
          areaSqft: Math.round(total * 0.16),
          dimensionsLabel: '2.8m × 2.2m',
          finishEn: 'Quartz Countertop · Integrated Appliances · Matte Cabinetry',
          finishAr: 'سطح كوارتز · أجهزة مدمجة · خزائن مطفية حديثة',
          videoCueSec: 10,
        },
        {
          id: 'rm-studio-bath',
          nameEn: 'Walk-in Rain Shower Spa Bath',
          nameAr: 'حمام عصري مع دوش مطري',
          zone: 'bedroom',
          x: 66,
          y: 46,
          w: 26,
          h: 34,
          wallHeightPx: 34,
          areaSqft: Math.round(total * 0.16),
          dimensionsLabel: '2.6m × 2.1m',
          finishEn: 'Porcelain Stone Tile · Backlit Mirror · Brushed Fixtures',
          finishAr: 'بلاط بورسلان حجري · مرآة مضاءة · إكسسوارات فاخرة',
          videoCueSec: 16,
        },
        {
          id: 'rm-studio-balcony',
          nameEn: 'Panoramic View Balcony',
          nameAr: 'شرفة بإطلالة بانورامية',
          zone: 'outdoor',
          x: 8,
          y: 66,
          w: 56,
          h: 22,
          wallHeightPx: 14,
          areaSqft: Math.round(total * 0.2),
          dimensionsLabel: '5.4m × 1.5m',
          finishEn: 'Frameless Glass Rail · Golf & Skyline Vista',
          finishAr: 'حاجز زجاجي شفاف · إطلالة على ملعب الغولف والأفق',
          videoCueSec: 22,
        },
      ],
    };
  }

  if (params.propertyType === 'villa' || params.propertyType === 'townhouse') {
    return {
      levelLabelEn: 'Ground & Garden Waterfront Level',
      levelLabelAr: 'الطابق الأرضي والحديقة الشاطئية',
      orientation: 'NW · Sunset Beachfront',
      totalSqft: total,
      rooms: [
        {
          id: 'rm-living',
          nameEn: 'Double-Height Majlis & Living',
          nameAr: 'صالة الاستقبال والمجلس بارتفاع مزدوج',
          zone: 'living',
          x: 6,
          y: 8,
          w: 50,
          h: 44,
          wallHeightPx: 42,
          areaSqft: Math.round(total * 0.28),
          dimensionsLabel: '11.8m × 7.4m',
          finishEn: 'Bookmatched Travertine · 6.4m Ceiling · KNX Lighting',
          finishAr: 'رخام ترافرتين · سقف بارتفاع 6.4م · إضاءة ذكية',
          videoCueSec: 8,
        },
        {
          id: 'rm-kitchen',
          nameEn: 'Show Kitchen & Prep Pantry',
          nameAr: 'المطبخ الرئيسي ومطبخ التحضير',
          zone: 'kitchen',
          x: 58,
          y: 8,
          w: 36,
          h: 34,
          wallHeightPx: 36,
          areaSqft: Math.round(total * 0.14),
          dimensionsLabel: '7.2m × 5.1m',
          finishEn: 'Gaggenau 400 Series · Taj Mahal Quartzite Island',
          finishAr: 'أجهزة غاغيناو 400 · جزيرة كوارتزايت تاج محل',
          videoCueSec: 22,
        },
        {
          id: 'rm-master',
          nameEn: 'Primary Waterfront Suite',
          nameAr: 'الجناح الرئيسي بإطلالة بحرية',
          zone: 'bedroom',
          x: 58,
          y: 44,
          w: 36,
          h: 34,
          wallHeightPx: 36,
          areaSqft: Math.round(total * 0.22),
          dimensionsLabel: '8.4m × 5.8m',
          finishEn: 'Smoked European Oak · Walk-in Atelier · Spa Bath',
          finishAr: 'خشب البلوط الأوروبي · غرفة ملابس · حمام سبا',
          videoCueSec: 36,
        },
        {
          id: 'rm-terrace',
          nameEn: 'Infinity Pool Deck & Private Beach',
          nameAr: 'تراس المسبح إنفينيتي والشاطئ الخاص',
          zone: 'outdoor',
          x: 6,
          y: 54,
          w: 50,
          h: 36,
          wallHeightPx: 14,
          areaSqft: Math.round(total * 0.24),
          dimensionsLabel: '18.0m × 6.2m',
          finishEn: 'Chilled Infinity Edge · Sunken Fire Lounge',
          finishAr: 'مسبح مبرد إنفينيتي · جلسة خارجية غائرة',
          videoCueSec: 48,
        },
        {
          id: 'rm-foyer',
          nameEn: 'Private Gallery & Valet Lobby',
          nameAr: 'بهو الدخول والمعرض الخاص',
          zone: 'utility',
          x: 58,
          y: 80,
          w: 36,
          h: 12,
          wallHeightPx: 30,
          areaSqft: Math.round(total * 0.12),
          dimensionsLabel: '6.5m × 3.2m',
          finishEn: 'Acoustic Walnut Slats · Private Lift Core',
          finishAr: 'خشب الجوز الصوتي · مصعد خاص',
          videoCueSec: 2,
        },
      ],
    };
  }

  if (params.propertyType === 'commercial' || params.propertyType === 'plot') {
    return {
      levelLabelEn:
        params.propertyType === 'plot'
          ? 'Master Plot Zoning & GFA Footprint'
          : 'Executive Grade-A Floorplate',
      levelLabelAr:
        params.propertyType === 'plot'
          ? 'مخطط تقسيم الأرض والمساحة الطابقية'
          : 'مخطط الطابق الإداري الفئة A',
      orientation: 'NE · Skyline & Canal Axis',
      totalSqft: total,
      rooms: [
        {
          id: 'rm-boardroom',
          nameEn: params.propertyType === 'plot' ? 'Primary Tower Footprint (G+32)' : 'Executive Boardroom & Reception',
          nameAr: params.propertyType === 'plot' ? 'نطاق البرج الرئيسي (G+32)' : 'قاعة الاجتماعات والاستقبال التنفيذي',
          zone: 'commercial',
          x: 8,
          y: 10,
          w: 52,
          h: 46,
          wallHeightPx: 44,
          areaSqft: Math.round(total * 0.42),
          dimensionsLabel: '16.0m × 10.5m',
          finishEn: 'Full-Height Low-E Glazing · Unobstructed Skyline Axis',
          finishAr: 'واجهات زجاجية عازلة للحرارة · إطلالة مفتوحة',
          videoCueSec: 6,
        },
        {
          id: 'rm-trading',
          nameEn: params.propertyType === 'plot' ? 'Podium Retail & Promenade' : 'Private Suites & Advisory Pods',
          nameAr: params.propertyType === 'plot' ? 'منصة التجزئة والممشى' : 'المكاتب الخاصة وغرف الاستشارات',
          zone: 'living',
          x: 62,
          y: 10,
          w: 30,
          h: 46,
          wallHeightPx: 34,
          areaSqft: Math.round(total * 0.3),
          dimensionsLabel: '10.2m × 8.4m',
          finishEn: 'Acoustic Partitioning · Dual Fiber Redundancy',
          finishAr: 'فواصل عازلة للصوت · بنية تحتية متقدمة',
          videoCueSec: 24,
        },
        {
          id: 'rm-promenade',
          nameEn: params.propertyType === 'plot' ? 'Canal Frontage Setback & Marina' : 'Sky Lounge & Breakout Terrace',
          nameAr: params.propertyType === 'plot' ? 'الواجهة المائية للقناة والمرسى' : 'صالة الاستراحة والتراس المفتوح',
          zone: 'outdoor',
          x: 8,
          y: 60,
          w: 84,
          h: 28,
          wallHeightPx: 14,
          areaSqft: Math.round(total * 0.28),
          dimensionsLabel: '26.0m × 5.8m',
          finishEn: 'Direct Waterfront Promenade · Dedicated Drop-off',
          finishAr: 'إطلالة مباشرة على الواجهة المائية · مدخل مستقل',
          videoCueSec: 40,
        },
      ],
    };
  }

  // Default: Penthouse, Apartment, or Off-Plan Residence
  return {
    levelLabelEn: 'Sky Residence Principal Floorplate',
    levelLabelAr: 'المخطط المعماري الرئيسي للوحدة',
    orientation: 'W · Panoramic Skyline & Water View',
    totalSqft: total,
    rooms: [
      {
        id: 'rm-greatroom',
        nameEn: 'Panoramic Great Room & Dining',
        nameAr: 'الصالة البانورامية وغرفة الطعام',
        zone: 'living',
        x: 6,
        y: 10,
        w: 52,
        h: 48,
        wallHeightPx: 38,
        areaSqft: Math.round(total * 0.34),
        dimensionsLabel: '9.6m × 6.2m',
        finishEn: '3.4m Floor-to-Ceiling Glass · Italian Marble Flooring',
        finishAr: 'نوافذ ممتدة بارتفاع 3.4م · أرضيات رخام إيطالي',
        videoCueSec: 10,
      },
      {
        id: 'rm-kitchen',
        nameEn: 'Open Architectural Kitchen',
        nameAr: 'المطبخ المفتوح الحديث',
        zone: 'kitchen',
        x: 60,
        y: 10,
        w: 34,
        h: 28,
        wallHeightPx: 34,
        areaSqft: Math.round(total * 0.14),
        dimensionsLabel: '4.8m × 3.9m',
        finishEn: 'Miele Integrated Appliances · Calacatta Island',
        finishAr: 'أجهزة ميلي المدمجة · جزيرة كالاكاتا',
        videoCueSec: 22,
      },
      {
        id: 'rm-primary',
        nameEn: `Primary Suite (${Math.max(1, params.bedrooms)}BR Layout)`,
        nameAr: `الجناح الرئيسي (${Math.max(1, params.bedrooms)} غرف)`,
        zone: 'bedroom',
        x: 60,
        y: 40,
        w: 34,
        h: 48,
        wallHeightPx: 34,
        areaSqft: Math.round(total * 0.28),
        dimensionsLabel: '6.4m × 4.9m',
        finishEn: 'Walk-in Dressing Room · Dual Vanity Marble Ensuite',
        finishAr: 'غرفة ملابس مستقلة · حمام داخلي فاخر',
        videoCueSec: 34,
      },
      {
        id: 'rm-balcony',
        nameEn: 'Wrap-Around View Terrace',
        nameAr: 'الشرفة البانورامية الممتدة',
        zone: 'outdoor',
        x: 6,
        y: 62,
        w: 52,
        h: 26,
        wallHeightPx: 14,
        areaSqft: Math.round(total * 0.16),
        dimensionsLabel: '9.6m × 2.8m',
        finishEn: 'Frameless Glass Balustrade · Outdoor Lounge Deck',
        finishAr: 'حواجز زجاجية شفافة · جلسة خارجية مطلة',
        videoCueSec: 46,
      },
      {
        id: 'rm-guest',
        nameEn: 'Private Lift Lobby & Powder Room',
        nameAr: 'بهو المصعد الخاص وغرفة الضيوف',
        zone: 'utility',
        x: 6,
        y: 0,
        w: 28,
        h: 8,
        wallHeightPx: 26,
        areaSqft: Math.round(total * 0.08),
        dimensionsLabel: '4.2m × 2.4m',
        finishEn: 'Biometric Access · Smart Intercom',
        finishAr: 'دخول ذكي بالبصمة · إنتركوم مرئي',
        videoCueSec: 2,
      },
    ],
  };
}
