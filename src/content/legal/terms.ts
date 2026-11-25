import type { LegalDocument } from './types';

export const termsOfUse: LegalDocument = {
  slug: 'terms',
  version: '2026-11-draft-1',
  lastUpdated: '2026-11-25',
  review: {
    'about-us':
      'Confirm whether MakanReel itself needs a RERA/DLD licence (for example as a broker or as an advertising platform). If it acts as a broker, these terms must change substantially.',
    eligibility:
      'Confirm the minimum age for entering binding online contracts under the UAE Civil Transactions Law. 18 is a placeholder.',
    'agent-obligations':
      'Confirm current Trakheesi permit and Madmoun QR display rules and the off-plan escrow disclosure wording required by RERA. The filming-consent clause relies on the privacy provisions of Federal Decree-Law No. 34 of 2021 on Combatting Rumours and Cybercrimes (the codebase cites Article 44); confirm the article.',
    'no-advice':
      'Confirm whether the yield calculator and investor presentations could be treated as regulated financial promotion or investment advice (SCA / Central Bank), and whether a specific disclaimer is required.',
    liability:
      'Liability exclusions may be limited or void under the UAE Civil Transactions Law and Federal Law No. 15 of 2020 on Consumer Protection. Confirm what is enforceable, especially against consumers.',
    'governing-law':
      'Dubai mainland courts are an assumption. If the operating entity is in DIFC or ADGM, or the business prefers arbitration, update this clause.',
    language:
      'Decide which language prevails. Courts in the UAE generally work in Arabic; confirm whether an English-prevails clause is advisable.',
  },
  en: {
    title: 'Terms of Use',
    summary:
      'The rules for using MakanReel, whether you are browsing listings, sending an enquiry, or uploading property videos as an agent.',
    sections: [
      {
        id: 'about-us',
        heading: '1. About these terms',
        blocks: [
          {
            type: 'p',
            text: 'These terms form an agreement between you and [COMPANY LEGAL NAME] ("MakanReel", "we", "us"). By using MakanReel you agree to them. If you do not agree, please do not use the service.',
          },
          {
            type: 'p',
            text: 'MakanReel is a video listing platform. Unless we say otherwise in writing, we are not a party to any sale, purchase or lease, and we do not act as your real-estate broker [CONFIRM].',
          },
        ],
      },
      {
        id: 'eligibility',
        heading: '2. Who can use MakanReel',
        blocks: [
          {
            type: 'ul',
            items: [
              'You must be at least [18] years old.',
              'To publish listings or upload videos you must be a real-estate agent or brokerage licensed by RERA / the Dubai Land Department (or the equivalent authority in another emirate), and you must keep your licence valid.',
              'You are responsible for keeping your login details secret and for activity on your account.',
            ],
          },
        ],
      },
      {
        id: 'listings',
        heading: '3. Listings and information accuracy',
        blocks: [
          {
            type: 'p',
            text: 'Listings, prices, availability, unit plans and videos are provided by agents and brokerages. We check permit numbers and review videos before publishing, but we cannot guarantee that every detail is complete, accurate or up to date. Always confirm details with the agent and through official DLD channels before you make a decision.',
          },
          {
            type: 'p',
            text: 'A "verified" or "on-site" badge only means that the listing passed the specific check it describes, such as a valid permit format or a capture location close to the property. It is not a guarantee of title, condition or value.',
          },
        ],
      },
      {
        id: 'agent-obligations',
        heading: '4. Extra obligations for agents',
        blocks: [
          {
            type: 'p',
            text: 'If you publish listings or upload videos, you confirm and agree that:',
          },
          {
            type: 'ul',
            items: [
              'each listing has a valid Trakheesi advertising permit and the matching Madmoun QR code, and you will remove the listing when the permit expires or the property is no longer available;',
              'prices, sizes, payment plans and off-plan developer and escrow details are accurate and not misleading;',
              'you have the property owner’s permission to film and advertise the property;',
              'anyone who appears or can be heard in your video has agreed to be filmed, and you have not filmed private spaces, documents or people without consent;',
              'your content does not infringe anyone’s copyright or other rights.',
            ],
          },
          {
            type: 'p',
            text: 'We may reject, unpublish or remove content, or suspend an account, if we reasonably believe these obligations are not met.',
          },
        ],
      },
      {
        id: 'content-licence',
        heading: '5. Content you upload',
        blocks: [
          {
            type: 'p',
            text: 'You keep ownership of the videos and content you upload. You give MakanReel a non-exclusive, royalty-free licence to host, store, transcode, caption, display and share that content on MakanReel and in investor presentations while the listing is active, and for a reasonable period afterwards for record-keeping [CONFIRM PERIOD].',
          },
        ],
      },
      {
        id: 'acceptable-use',
        heading: '6. Acceptable use',
        blocks: [
          { type: 'p', text: 'You must not:' },
          {
            type: 'ul',
            items: [
              'scrape, crawl, copy or harvest listings, videos or contact details by automated means, or use them to train AI models;',
              'try to bypass security, rate limits or access controls, or interfere with the service;',
              'upload unlawful, misleading, offensive or infringing content;',
              'use enquiry contact details for anything other than answering that enquiry, unless the person has opted in to marketing.',
            ],
          },
        ],
      },
      {
        id: 'no-advice',
        heading: '7. No financial or investment advice',
        blocks: [
          {
            type: 'p',
            text: 'Yield calculations, mortgage estimates, currency conversions and investor presentations are illustrations only. They are not financial, investment, tax or legal advice. Get independent professional advice before you invest.',
          },
        ],
      },
      {
        id: 'third-parties',
        heading: '8. Third-party services',
        blocks: [
          {
            type: 'p',
            text: 'MakanReel links to or uses third-party services such as WhatsApp, map providers and DLD verification pages. We are not responsible for their content or how they handle your data.',
          },
        ],
      },
      {
        id: 'liability',
        heading: '9. Liability',
        blocks: [
          {
            type: 'p',
            text: 'To the extent the law allows, we provide MakanReel "as is" and are not liable for indirect or consequential loss, or for loss caused by relying on listing information provided by agents. Nothing in these terms limits liability that cannot be limited under UAE law [CONFIRM SCOPE AND ANY CAP].',
          },
        ],
      },
      {
        id: 'suspension',
        heading: '10. Suspension and ending your use',
        blocks: [
          {
            type: 'p',
            text: 'You can stop using MakanReel at any time. We may suspend or close access if you break these terms, if the law requires it, or to protect users or the service.',
          },
        ],
      },
      {
        id: 'changes',
        heading: '11. Changes to these terms',
        blocks: [
          {
            type: 'p',
            text: 'We may update these terms. We will post the new version on this page with its date and, for significant changes, notify registered users in advance [CONFIRM NOTICE PERIOD].',
          },
        ],
      },
      {
        id: 'governing-law',
        heading: '12. Governing law and disputes',
        blocks: [
          {
            type: 'p',
            text: 'These terms are governed by the federal laws of the United Arab Emirates as applied in the Emirate of Dubai. The courts of Dubai have jurisdiction over any dispute [CONFIRM].',
          },
        ],
      },
      {
        id: 'language',
        heading: '13. Language',
        blocks: [
          {
            type: 'p',
            text: 'These terms are available in Arabic and English. If the two versions differ, the [ARABIC / ENGLISH] version prevails.',
          },
        ],
      },
      {
        id: 'contact',
        heading: '14. Contact',
        blocks: [
          {
            type: 'p',
            text: 'Questions about these terms: [legal@makanreel.ae], [REGISTERED ADDRESS].',
          },
        ],
      },
    ],
  },
  ar: {
    title: 'شروط الاستخدام',
    summary:
      'قواعد استخدام مكان ريل، سواء كنت تتصفّح العقارات أو ترسل استفساراً أو ترفع فيديوهات العقارات بصفتك وسيطاً.',
    sections: [
      {
        id: 'about-us',
        heading: '1. حول هذه الشروط',
        blocks: [
          {
            type: 'p',
            text: 'تشكّل هذه الشروط اتفاقاً بينك وبين [الاسم القانوني للشركة] ("مكان ريل" أو "نحن"). باستخدامك مكان ريل فإنك توافق عليها، وإن لم توافق فيُرجى عدم استخدام الخدمة.',
          },
          {
            type: 'p',
            text: 'مكان ريل منصة لعرض العقارات بالفيديو. وما لم نذكر خلاف ذلك كتابياً، فلسنا طرفاً في أي عملية بيع أو شراء أو إيجار، ولا نعمل بصفة وسيطك العقاري [للتأكيد].',
          },
        ],
      },
      {
        id: 'eligibility',
        heading: '2. من يحق له استخدام مكان ريل',
        blocks: [
          {
            type: 'ul',
            items: [
              'يجب ألا يقل عمرك عن [18] عاماً.',
              'لنشر الإعلانات أو رفع الفيديوهات يجب أن تكون وسيطاً عقارياً أو شركة وساطة مرخّصة من مؤسسة التنظيم العقاري / دائرة الأراضي والأملاك في دبي (أو الجهة المعادلة في إمارة أخرى)، وأن تحافظ على سريان ترخيصك.',
              'أنت مسؤول عن الحفاظ على سرية بيانات تسجيل الدخول وعن النشاط الذي يتم عبر حسابك.',
            ],
          },
        ],
      },
      {
        id: 'listings',
        heading: '3. الإعلانات ودقة المعلومات',
        blocks: [
          {
            type: 'p',
            text: 'يقدّم الوسطاء وشركات الوساطة الإعلانات والأسعار والتوافر ومخططات الوحدات والفيديوهات. ونحن نتحقق من أرقام التصاريح ونراجع الفيديوهات قبل نشرها، لكننا لا نضمن أن كل التفاصيل كاملة أو دقيقة أو محدّثة. تأكّد دائماً من التفاصيل مع الوسيط ومن خلال القنوات الرسمية لدائرة الأراضي والأملاك قبل اتخاذ أي قرار.',
          },
          {
            type: 'p',
            text: 'شارة "موثّق" أو "مُصوَّر في الموقع" تعني فقط أن الإعلان اجتاز الفحص المحدد الذي تصفه، مثل صحة صيغة التصريح أو قرب موقع التصوير من العقار، ولا تُعدّ ضماناً للملكية أو الحالة أو القيمة.',
          },
        ],
      },
      {
        id: 'agent-obligations',
        heading: '4. التزامات إضافية على الوسطاء',
        blocks: [
          {
            type: 'p',
            text: 'إذا نشرت إعلانات أو رفعت فيديوهات، فإنك تؤكّد وتوافق على ما يلي:',
          },
          {
            type: 'ul',
            items: [
              'لكل إعلان تصريح إعلان ساري من نظام تراخيص (Trakheesi) ورمز QR المطابق من نظام مضمون، وستزيل الإعلان عند انتهاء التصريح أو عدم توفّر العقار؛',
              'الأسعار والمساحات وخطط السداد وبيانات المطوّر وحساب الضمان للمشاريع على الخارطة دقيقة وغير مضلّلة؛',
              'لديك إذن مالك العقار بتصويره والإعلان عنه؛',
              'كل من يظهر أو يُسمع صوته في الفيديو وافق على تصويره، ولم تصوّر أماكن خاصة أو مستندات أو أشخاصاً دون موافقتهم؛',
              'المحتوى الذي تقدّمه لا ينتهك حقوق المؤلف أو أي حقوق أخرى للغير.',
            ],
          },
          {
            type: 'p',
            text: 'يجوز لنا رفض المحتوى أو إلغاء نشره أو حذفه، أو إيقاف الحساب، إذا اعتقدنا بشكل معقول أن هذه الالتزامات لم تُستوفَ.',
          },
        ],
      },
      {
        id: 'content-licence',
        heading: '5. المحتوى الذي ترفعه',
        blocks: [
          {
            type: 'p',
            text: 'تبقى ملكية الفيديوهات والمحتوى الذي ترفعه لك. وتمنح مكان ريل ترخيصاً غير حصري ودون مقابل لاستضافة هذا المحتوى وتخزينه وتحويل صيغته وإضافة الترجمة إليه وعرضه ومشاركته على مكان ريل وفي عروض المستثمرين طوال فترة نشاط الإعلان، ولمدة معقولة بعدها لأغراض حفظ السجلات [تأكيد المدة].',
          },
        ],
      },
      {
        id: 'acceptable-use',
        heading: '6. الاستخدام المقبول',
        blocks: [
          { type: 'p', text: 'لا يجوز لك:' },
          {
            type: 'ul',
            items: [
              'استخراج الإعلانات أو الفيديوهات أو بيانات التواصل أو نسخها أو جمعها بوسائل آلية، أو استخدامها لتدريب نماذج الذكاء الاصطناعي؛',
              'محاولة تجاوز إجراءات الأمن أو حدود الاستخدام أو ضوابط الوصول، أو التدخل في عمل الخدمة؛',
              'رفع محتوى غير قانوني أو مضلّل أو مسيء أو منتهك لحقوق الغير؛',
              'استخدام بيانات التواصل الواردة في الاستفسارات لأي غرض غير الرد على ذلك الاستفسار، ما لم يوافق الشخص على تلقي الرسائل التسويقية.',
            ],
          },
        ],
      },
      {
        id: 'no-advice',
        heading: '7. لا نقدّم استشارات مالية أو استثمارية',
        blocks: [
          {
            type: 'p',
            text: 'حسابات العائد وتقديرات التمويل العقاري وتحويل العملات وعروض المستثمرين هي للتوضيح فقط، وليست استشارة مالية أو استثمارية أو ضريبية أو قانونية. احصل على استشارة مهنية مستقلة قبل أن تستثمر.',
          },
        ],
      },
      {
        id: 'third-parties',
        heading: '8. خدمات الغير',
        blocks: [
          {
            type: 'p',
            text: 'يرتبط مكان ريل بخدمات تابعة للغير أو يستخدمها، مثل واتساب ومزوّدي الخرائط وصفحات التحقق التابعة لدائرة الأراضي والأملاك. ولسنا مسؤولين عن محتواها أو عن طريقة تعاملها مع بياناتك.',
          },
        ],
      },
      {
        id: 'liability',
        heading: '9. المسؤولية',
        blocks: [
          {
            type: 'p',
            text: 'في الحدود التي يسمح بها القانون، نقدّم مكان ريل "كما هو"، ولا نتحمّل المسؤولية عن الخسائر غير المباشرة أو التبعية، أو عن الخسائر الناتجة عن الاعتماد على معلومات الإعلانات المقدّمة من الوسطاء. ولا يحدّ أي شيء في هذه الشروط من المسؤولية التي لا يجوز تحديدها بموجب قوانين دولة الإمارات [تأكيد النطاق وأي حد أقصى].',
          },
        ],
      },
      {
        id: 'suspension',
        heading: '10. الإيقاف وإنهاء الاستخدام',
        blocks: [
          {
            type: 'p',
            text: 'يمكنك التوقف عن استخدام مكان ريل في أي وقت. ويجوز لنا إيقاف الوصول أو إنهاؤه إذا خالفت هذه الشروط، أو إذا فرض القانون ذلك، أو لحماية المستخدمين أو الخدمة.',
          },
        ],
      },
      {
        id: 'changes',
        heading: '11. التعديلات على هذه الشروط',
        blocks: [
          {
            type: 'p',
            text: 'قد نحدّث هذه الشروط، وسننشر الإصدار الجديد على هذه الصفحة مع تاريخه، وسنُخطر المستخدمين المسجّلين مسبقاً بالتغييرات الجوهرية [تأكيد مدة الإخطار].',
          },
        ],
      },
      {
        id: 'governing-law',
        heading: '12. القانون الواجب التطبيق وتسوية النزاعات',
        blocks: [
          {
            type: 'p',
            text: 'تخضع هذه الشروط للقوانين الاتحادية لدولة الإمارات العربية المتحدة كما تُطبَّق في إمارة دبي، وتختص محاكم دبي بالنظر في أي نزاع [للتأكيد].',
          },
        ],
      },
      {
        id: 'language',
        heading: '13. اللغة',
        blocks: [
          {
            type: 'p',
            text: 'تتوفّر هذه الشروط باللغتين العربية والإنجليزية، وفي حال وجود اختلاف بين النسختين تسود النسخة [العربية / الإنجليزية].',
          },
        ],
      },
      {
        id: 'contact',
        heading: '14. التواصل',
        blocks: [
          {
            type: 'p',
            text: 'للاستفسار عن هذه الشروط: [legal@makanreel.ae]، [العنوان المسجّل].',
          },
        ],
      },
    ],
  },
};
