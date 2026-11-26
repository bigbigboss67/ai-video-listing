import type { PropertyType } from '@/types/domain';

export type FurnitureKind =
  | 'bed_king'
  | 'sofa_l'
  | 'coffee_table'
  | 'kitchen_counter'
  | 'kitchen_island'
  | 'dining_table'
  | 'shower_glass'
  | 'vanity'
  | 'wc'
  | 'loungers'
  | 'pool'
  | 'wardrobe'
  | 'conference_table'
  | 'desk';

export interface RoomFurniture {
  kind: FurnitureKind;
  /** Position & size relative to room (0..1 normalized) */
  rx: number;
  ry: number;
  rw: number;
  rh: number;
  /** 3D height in meters */
  heightM: number;
}

export interface FloorPlanRoom {
  id: string;
  nameEn: string;
  nameAr: string;
  zone: 'living' | 'bedroom' | 'kitchen' | 'bath' | 'outdoor' | 'utility' | 'commercial';
  /** Coordinates in meters on the floorplate */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Wall height in meters (balconies/decks use 1.1m glass balustrade) */
  wallHeightM: number;
  isOutdoor?: boolean;
  areaSqft: number;
  dimensionsLabel: string;
  finishEn: string;
  finishAr: string;
  doorSide?: 'top' | 'bottom' | 'left' | 'right';
  windowSide?: 'top' | 'bottom' | 'left' | 'right';
  furniture: RoomFurniture[];
  videoCueSec: number;
}

export interface ArchitecturalFloorPlan {
  levelLabelEn: string;
  levelLabelAr: string;
  orientation: string;
  widthM: number;
  depthM: number;
  totalSqft: number;
  rooms: FloorPlanRoom[];
}

export function getFloorPlanForProperty(params: {
  propertyType: PropertyType;
  areaSqft: number;
  bedrooms: number;
}): ArchitecturalFloorPlan {
  const total = Math.max(350, Math.round(params.areaSqft));

  // 1. Luxury Studio Floorplate (e.g., Golf Views Seven City 402 sq ft)
  if (params.bedrooms === 0 && params.propertyType === 'apartment') {
    return {
      levelLabelEn: 'Designer Open-Plan Studio Architectural Plan',
      levelLabelAr: 'المخطط المعماري للاستوديو المفتوح',
      orientation: 'W · Golf Course & Skyline Vista',
      widthM: 8.4,
      depthM: 5.8,
      totalSqft: total,
      rooms: [
        {
          id: 'rm-studio-suite',
          nameEn: 'Open Living & Sleeping Suite',
          nameAr: 'مساحة المعيشة والنوم المفتوحة',
          zone: 'living',
          x: 0,
          y: 0,
          w: 5.4,
          h: 4.1,
          wallHeightM: 2.9,
          areaSqft: Math.round(total * 0.48),
          dimensionsLabel: '5.4m × 4.1m',
          finishEn: 'Oak Herringbone Parquet · Floor-to-Ceiling Glass · Built-In Wardrobe',
          finishAr: 'أرضيات باركيه بلوط · واجهات زجاجية كاملة · خزائن مدمجة',
          doorSide: 'top',
          windowSide: 'bottom',
          furniture: [
            { kind: 'bed_king', rx: 0.08, ry: 0.14, rw: 0.4, rh: 0.56, heightM: 0.65 },
            { kind: 'wardrobe', rx: 0.06, ry: 0.02, rw: 0.42, rh: 0.1, heightM: 2.2 },
            { kind: 'sofa_l', rx: 0.56, ry: 0.22, rw: 0.36, rh: 0.34, heightM: 0.78 },
            { kind: 'coffee_table', rx: 0.62, ry: 0.64, rw: 0.24, rh: 0.18, heightM: 0.42 },
          ],
          videoCueSec: 4,
        },
        {
          id: 'rm-studio-kitchen',
          nameEn: 'Fitted Kitchen & Dining Bar',
          nameAr: 'المطبخ المجهز وطاولة الطعام',
          zone: 'kitchen',
          x: 5.4,
          y: 0,
          w: 3.0,
          h: 2.2,
          wallHeightM: 2.9,
          areaSqft: Math.round(total * 0.16),
          dimensionsLabel: '3.0m × 2.2m',
          finishEn: 'Quartz Countertop · Integrated Oven & Hob · Matte Oak Joinery',
          finishAr: 'سطح كوارتز · فرن وموقد مدمج · خزائن خشبية مطفية',
          doorSide: 'left',
          furniture: [
            { kind: 'kitchen_counter', rx: 0.08, ry: 0.06, rw: 0.84, rh: 0.28, heightM: 0.92 },
            { kind: 'kitchen_island', rx: 0.16, ry: 0.56, rw: 0.66, rh: 0.26, heightM: 0.92 },
          ],
          videoCueSec: 10,
        },
        {
          id: 'rm-studio-bath',
          nameEn: 'Walk-in Rain Shower Spa Bath',
          nameAr: 'حمام عصري مع دوش مطري',
          zone: 'bath',
          x: 5.4,
          y: 2.2,
          w: 3.0,
          h: 1.9,
          wallHeightM: 2.9,
          areaSqft: Math.round(total * 0.16),
          dimensionsLabel: '3.0m × 1.9m',
          finishEn: 'Porcelain Stone Slabs · Frameless Rain Shower · Backlit Vanity',
          finishAr: 'بلاط بورسلان حجري · دوش مطري زجاجي · مغسلة مضاءة',
          doorSide: 'left',
          furniture: [
            { kind: 'shower_glass', rx: 0.56, ry: 0.08, rw: 0.36, rh: 0.82, heightM: 2.15 },
            { kind: 'vanity', rx: 0.08, ry: 0.1, rw: 0.36, rh: 0.28, heightM: 0.86 },
            { kind: 'wc', rx: 0.12, ry: 0.58, rw: 0.22, rh: 0.28, heightM: 0.45 },
          ],
          videoCueSec: 16,
        },
        {
          id: 'rm-studio-balcony',
          nameEn: 'Panoramic Golf-View Balcony',
          nameAr: 'شرفة بانورامية مطلة على الغولف',
          zone: 'outdoor',
          x: 0,
          y: 4.1,
          w: 8.4,
          h: 1.7,
          wallHeightM: 1.1,
          isOutdoor: true,
          areaSqft: Math.round(total * 0.2),
          dimensionsLabel: '8.4m × 1.7m',
          finishEn: 'Teak Composite Decking · Frameless Glass Balustrade · Golf Vista',
          finishAr: 'أرضيات خشبية خارجية · حاجز زجاجي شفاف · إطلالة الغولف',
          windowSide: 'bottom',
          furniture: [
            { kind: 'loungers', rx: 0.12, ry: 0.22, rw: 0.32, rh: 0.56, heightM: 0.55 },
            { kind: 'coffee_table', rx: 0.52, ry: 0.32, rw: 0.12, rh: 0.36, heightM: 0.45 },
          ],
          videoCueSec: 22,
        },
      ],
    };
  }

  // 2. Signature Waterfront Villa / Townhouse Floorplate
  if (params.propertyType === 'villa' || params.propertyType === 'townhouse') {
    return {
      levelLabelEn: 'Ground & Waterfront Pool Architectural Plan',
      levelLabelAr: 'المخطط المعماري للطابق الأرضي والمسبح',
      orientation: 'NW · Private Beachfront & Sunset',
      widthM: 16.0,
      depthM: 12.0,
      totalSqft: total,
      rooms: [
        {
          id: 'rm-living',
          nameEn: 'Double-Height Majlis & Reception',
          nameAr: 'صالة الاستقبال والمجلس بارتفاع مزدوج',
          zone: 'living',
          x: 0,
          y: 0,
          w: 9.2,
          h: 6.4,
          wallHeightM: 3.6,
          areaSqft: Math.round(total * 0.3),
          dimensionsLabel: '9.2m × 6.4m',
          finishEn: 'Bookmatched Travertine · 6.4m Void · Acoustic Timber Ceiling',
          finishAr: 'رخام ترافرتين طبيعي · سقف بارتفاع 6.4م · إضاءة ذكية',
          doorSide: 'top',
          windowSide: 'bottom',
          furniture: [
            { kind: 'sofa_l', rx: 0.08, ry: 0.18, rw: 0.38, rh: 0.46, heightM: 0.8 },
            { kind: 'coffee_table', rx: 0.18, ry: 0.42, rw: 0.2, rh: 0.18, heightM: 0.42 },
            { kind: 'dining_table', rx: 0.56, ry: 0.24, rw: 0.34, rh: 0.48, heightM: 0.78 },
          ],
          videoCueSec: 8,
        },
        {
          id: 'rm-kitchen',
          nameEn: 'Show Kitchen & Prep Pantry',
          nameAr: 'المطبخ الرئيسي ومطبخ التحضير',
          zone: 'kitchen',
          x: 9.2,
          y: 0,
          w: 6.8,
          h: 3.4,
          wallHeightM: 3.2,
          areaSqft: Math.round(total * 0.15),
          dimensionsLabel: '6.8m × 3.4m',
          finishEn: 'Gaggenau 400 Series · Taj Mahal Quartzite Island',
          finishAr: 'أجهزة غاغيناو 400 · جزيرة كوارتزايت تاج محل',
          doorSide: 'left',
          windowSide: 'right',
          furniture: [
            { kind: 'kitchen_counter', rx: 0.08, ry: 0.08, rw: 0.84, rh: 0.24, heightM: 0.92 },
            { kind: 'kitchen_island', rx: 0.2, ry: 0.52, rw: 0.6, rh: 0.28, heightM: 0.92 },
          ],
          videoCueSec: 22,
        },
        {
          id: 'rm-master',
          nameEn: 'Primary Waterfront Suite',
          nameAr: 'الجناح الرئيسي بإطلالة بحرية',
          zone: 'bedroom',
          x: 9.2,
          y: 3.4,
          w: 6.8,
          h: 4.8,
          wallHeightM: 3.2,
          areaSqft: Math.round(total * 0.23),
          dimensionsLabel: '6.8m × 4.8m',
          finishEn: 'Smoked European Oak · Walk-In Atelier · Dual Spa Ensuite',
          finishAr: 'خشب البلوط الأوروبي · غرفة ملابس مستقلة · حمام سبا',
          doorSide: 'left',
          windowSide: 'bottom',
          furniture: [
            { kind: 'bed_king', rx: 0.14, ry: 0.18, rw: 0.42, rh: 0.5, heightM: 0.68 },
            { kind: 'wardrobe', rx: 0.08, ry: 0.04, rw: 0.5, rh: 0.1, heightM: 2.4 },
            { kind: 'shower_glass', rx: 0.66, ry: 0.12, rw: 0.26, rh: 0.44, heightM: 2.2 },
            { kind: 'vanity', rx: 0.66, ry: 0.64, rw: 0.26, rh: 0.24, heightM: 0.88 },
          ],
          videoCueSec: 36,
        },
        {
          id: 'rm-terrace',
          nameEn: 'Infinity Pool Deck & Private Beach',
          nameAr: 'تراس المسبح إنفينيتي والشاطئ الخاص',
          zone: 'outdoor',
          x: 0,
          y: 6.4,
          w: 9.2,
          h: 5.6,
          wallHeightM: 0.9,
          isOutdoor: true,
          areaSqft: Math.round(total * 0.22),
          dimensionsLabel: '9.2m × 5.6m',
          finishEn: 'Chilled Infinity Pool · Sunken Fire Lounge · Private Beach',
          finishAr: 'مسبح مبرد إنفينيتي · جلسة خارجية غائرة · شاطئ خاص',
          windowSide: 'bottom',
          furniture: [
            { kind: 'pool', rx: 0.08, ry: 0.36, rw: 0.84, rh: 0.52, heightM: 0.25 },
            { kind: 'loungers', rx: 0.12, ry: 0.08, rw: 0.42, rh: 0.22, heightM: 0.5 },
          ],
          videoCueSec: 48,
        },
        {
          id: 'rm-foyer',
          nameEn: 'Private Gallery & Lift Core',
          nameAr: 'بهو الدخول والمعرض الخاص',
          zone: 'utility',
          x: 9.2,
          y: 8.2,
          w: 6.8,
          h: 3.8,
          wallHeightM: 1.1,
          isOutdoor: true,
          areaSqft: Math.round(total * 0.1),
          dimensionsLabel: '6.8m × 3.8m',
          finishEn: 'Landscaped Courtyard · Private Marina Access Deck',
          finishAr: 'حديقة خاصة · ممر مباشر إلى المرسى الخاص',
          furniture: [
            { kind: 'loungers', rx: 0.18, ry: 0.24, rw: 0.56, rh: 0.48, heightM: 0.55 },
          ],
          videoCueSec: 2,
        },
      ],
    };
  }

  // 3. Commercial / Development Plot Floorplate
  if (params.propertyType === 'commercial' || params.propertyType === 'plot') {
    return {
      levelLabelEn:
        params.propertyType === 'plot'
          ? 'Master Plot Zoning & GFA Architectural Plan'
          : 'Executive Grade-A Commercial Floorplate',
      levelLabelAr:
        params.propertyType === 'plot'
          ? 'مخطط تقسيم الأرض والمساحة الطابقية'
          : 'المخطط المعماري للطابق الإداري الفئة A',
      orientation: 'NE · Skyline & Canal Axis',
      widthM: 15.0,
      depthM: 10.0,
      totalSqft: total,
      rooms: [
        {
          id: 'rm-boardroom',
          nameEn:
            params.propertyType === 'plot'
              ? 'Primary Tower Footprint (G+32)'
              : 'Executive Boardroom & Reception',
          nameAr:
            params.propertyType === 'plot'
              ? 'نطاق البرج الرئيسي (G+32)'
              : 'قاعة الاجتماعات والاستقبال التنفيذي',
          zone: 'commercial',
          x: 0,
          y: 0,
          w: 9.4,
          h: 6.8,
          wallHeightM: 3.4,
          areaSqft: Math.round(total * 0.44),
          dimensionsLabel: '9.4m × 6.8m',
          finishEn: 'Acoustic Low-E Curtain Wall · Raised Access Flooring',
          finishAr: 'واجهات زجاجية عازلة للحرارة · أرضيات مرتفعة حديثة',
          doorSide: 'top',
          windowSide: 'left',
          furniture: [
            { kind: 'conference_table', rx: 0.18, ry: 0.24, rw: 0.62, rh: 0.46, heightM: 0.78 },
          ],
          videoCueSec: 6,
        },
        {
          id: 'rm-trading',
          nameEn:
            params.propertyType === 'plot'
              ? 'Podium Retail & Promenade'
              : 'Private Executive Suites & Pods',
          nameAr:
            params.propertyType === 'plot'
              ? 'منصة التجزئة والممشى'
              : 'المكاتب التنفيذية وغرف الاستشارات',
          zone: 'living',
          x: 9.4,
          y: 0,
          w: 5.6,
          h: 6.8,
          wallHeightM: 3.4,
          areaSqft: Math.round(total * 0.3),
          dimensionsLabel: '5.6m × 6.8m',
          finishEn: 'Acoustic Glass Partitions · Dual Fiber Redundancy',
          finishAr: 'فواصل زجاجية عازلة للصوت · بنية تحتية متقدمة',
          doorSide: 'left',
          windowSide: 'right',
          furniture: [
            { kind: 'desk', rx: 0.16, ry: 0.14, rw: 0.68, rh: 0.24, heightM: 0.76 },
            { kind: 'desk', rx: 0.16, ry: 0.56, rw: 0.68, rh: 0.24, heightM: 0.76 },
          ],
          videoCueSec: 24,
        },
        {
          id: 'rm-promenade',
          nameEn:
            params.propertyType === 'plot'
              ? 'Canal Frontage Setback & Marina'
              : 'Sky Lounge & Outdoor Terrace',
          nameAr:
            params.propertyType === 'plot'
              ? 'الواجهة المائية للقناة والمرسى'
              : 'صالة الاستراحة والتراس المفتوح',
          zone: 'outdoor',
          x: 0,
          y: 6.8,
          w: 15.0,
          h: 3.2,
          wallHeightM: 1.1,
          isOutdoor: true,
          areaSqft: Math.round(total * 0.26),
          dimensionsLabel: '15.0m × 3.2m',
          finishEn: 'Direct Waterfront Axis · Dedicated VIP Drop-off',
          finishAr: 'إطلالة مباشرة على الواجهة المائية · مدخل خاص',
          windowSide: 'bottom',
          furniture: [
            { kind: 'loungers', rx: 0.12, ry: 0.24, rw: 0.3, rh: 0.52, heightM: 0.52 },
            { kind: 'loungers', rx: 0.58, ry: 0.24, rw: 0.3, rh: 0.52, heightM: 0.52 },
          ],
          videoCueSec: 40,
        },
      ],
    };
  }

  // 4. Penthouse / Multi-Bedroom Apartment / Off-Plan Residence
  return {
    levelLabelEn: 'Sky Residence Principal Architectural Plan',
    levelLabelAr: 'المخطط المعماري الرئيسي للوحدة السكنية',
    orientation: 'W · Panoramic Skyline & Water View',
    widthM: 14.0,
    depthM: 10.0,
    totalSqft: total,
    rooms: [
      {
        id: 'rm-greatroom',
        nameEn: 'Panoramic Great Room & Dining',
        nameAr: 'الصالة البانورامية وغرفة الطعام',
        zone: 'living',
        x: 0,
        y: 0,
        w: 8.2,
        h: 6.8,
        wallHeightM: 3.2,
        areaSqft: Math.round(total * 0.36),
        dimensionsLabel: '8.2m × 6.8m',
        finishEn: '3.4m Floor-to-Ceiling Glass · Italian Marble Slab Flooring',
        finishAr: 'نوافذ ممتدة بارتفاع 3.4م · أرضيات رخام إيطالي فاخر',
        doorSide: 'top',
        windowSide: 'bottom',
        furniture: [
          { kind: 'sofa_l', rx: 0.08, ry: 0.16, rw: 0.42, rh: 0.42, heightM: 0.78 },
          { kind: 'coffee_table', rx: 0.2, ry: 0.38, rw: 0.18, rh: 0.16, heightM: 0.42 },
          { kind: 'dining_table', rx: 0.58, ry: 0.22, rw: 0.32, rh: 0.48, heightM: 0.76 },
        ],
        videoCueSec: 10,
      },
      {
        id: 'rm-kitchen',
        nameEn: 'Open Architectural Kitchen',
        nameAr: 'المطبخ المفتوح الحديث',
        zone: 'kitchen',
        x: 8.2,
        y: 0,
        w: 5.8,
        h: 3.2,
        wallHeightM: 3.2,
        areaSqft: Math.round(total * 0.14),
        dimensionsLabel: '5.8m × 3.2m',
        finishEn: 'Miele Integrated Appliances · Calacatta Marble Island',
        finishAr: 'أجهزة ميلي المدمجة · جزيرة رخام كالاكاتا',
        doorSide: 'left',
        windowSide: 'right',
        furniture: [
          { kind: 'kitchen_counter', rx: 0.08, ry: 0.08, rw: 0.84, rh: 0.26, heightM: 0.92 },
          { kind: 'kitchen_island', rx: 0.18, ry: 0.54, rw: 0.64, rh: 0.28, heightM: 0.92 },
        ],
        videoCueSec: 22,
      },
      {
        id: 'rm-primary',
        nameEn: `Primary Suite (${Math.max(1, params.bedrooms)}BR Layout)`,
        nameAr: `الجناح الرئيسي (${Math.max(1, params.bedrooms)} غرف)`,
        zone: 'bedroom',
        x: 8.2,
        y: 3.2,
        w: 5.8,
        h: 4.4,
        wallHeightM: 3.2,
        areaSqft: Math.round(total * 0.24),
        dimensionsLabel: '5.8m × 4.4m',
        finishEn: 'Smoked Oak Parquet · Walk-in Dressing Atelier · Skyline Corner',
        finishAr: 'باركيه بلوط مدخن · غرفة ملابس مستقلة · زاوية بانورامية',
        doorSide: 'left',
        windowSide: 'right',
        furniture: [
          { kind: 'bed_king', rx: 0.18, ry: 0.2, rw: 0.48, rh: 0.56, heightM: 0.68 },
          { kind: 'wardrobe', rx: 0.08, ry: 0.04, rw: 0.68, rh: 0.1, heightM: 2.3 },
        ],
        videoCueSec: 34,
      },
      {
        id: 'rm-ensuite',
        nameEn: 'Marble Spa Ensuite Bath',
        nameAr: 'الحمام الداخلي الفاخر',
        zone: 'bath',
        x: 8.2,
        y: 7.6,
        w: 5.8,
        h: 2.4,
        wallHeightM: 3.2,
        areaSqft: Math.round(total * 0.1),
        dimensionsLabel: '5.8m × 2.4m',
        finishEn: 'Dual Vanity · Walk-in Rain Shower · Heated Stone Floor',
        finishAr: 'مغسلة مزدوجة · دوش مطري زجاجي · أرضيات حجرية',
        doorSide: 'top',
        furniture: [
          { kind: 'shower_glass', rx: 0.62, ry: 0.12, rw: 0.3, rh: 0.76, heightM: 2.2 },
          { kind: 'vanity', rx: 0.08, ry: 0.12, rw: 0.42, rh: 0.28, heightM: 0.86 },
          { kind: 'wc', rx: 0.12, ry: 0.56, rw: 0.18, rh: 0.3, heightM: 0.45 },
        ],
        videoCueSec: 40,
      },
      {
        id: 'rm-balcony',
        nameEn: 'Wrap-Around View Terrace',
        nameAr: 'الشرفة البانورامية الممتدة',
        zone: 'outdoor',
        x: 0,
        y: 6.8,
        w: 8.2,
        h: 3.2,
        wallHeightM: 1.1,
        isOutdoor: true,
        areaSqft: Math.round(total * 0.16),
        dimensionsLabel: '8.2m × 3.2m',
        finishEn: 'Frameless Glass Balustrade · Outdoor Lounge & Dining Deck',
        finishAr: 'حواجز زجاجية شفافة · جلسة خارجية مطلة',
        windowSide: 'bottom',
        furniture: [
          { kind: 'loungers', rx: 0.12, ry: 0.22, rw: 0.38, rh: 0.56, heightM: 0.52 },
          { kind: 'coffee_table', rx: 0.58, ry: 0.32, rw: 0.16, rh: 0.36, heightM: 0.45 },
        ],
        videoCueSec: 46,
      },
    ],
  };
}
