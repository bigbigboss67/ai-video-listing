import { PRIVACY_NOTICE_VERSION } from '@/lib/legal';
import type { LegalDocument } from './types';

export const privacyNotice: LegalDocument = {
  slug: 'privacy',
  version: PRIVACY_NOTICE_VERSION,
  lastUpdated: '2026-11-25',
  review: {
    'who-we-are':
      'Confirm the legal entity, licence and registered address. If the operator is licensed in DIFC or ADGM, the federal PDPL does not apply there and this notice must be rewritten for DIFC Data Protection Law No. 5 of 2020 or the ADGM Data Protection Regulations 2021. Confirm whether a Data Protection Officer must be appointed.',
    scope:
      'Confirm the role split: is MakanReel a controller for enquiry data and the brokerage a separate controller, or is MakanReel a processor for the brokerage? This changes who answers rights requests and what contracts are needed.',
    'legal-basis':
      'Drafted on the assumption that UAE PDPL (Federal Decree-Law No. 45 of 2021) relies on consent by default, with exceptions such as performing a contract, legal obligations and protecting vital interests. The PDPL does not have a broad GDPR-style "legitimate interests" basis; confirm which exception, if any, covers security logging and anti-fraud. Also confirm the current status of the PDPL Executive Regulations.',
    sharing:
      'List the actual production processors and their hosting regions once chosen (hosting, database, video, email/WhatsApp tooling). Confirm what DLD/RERA can lawfully request from a listing portal.',
    transfers:
      'Confirm the PDPL cross-border transfer conditions and whether the chosen providers’ regions are covered by an adequacy decision or need contractual safeguards.',
    retention:
      'All retention periods here are guesses for business review. Confirm any minimum periods under RERA advertising rules, AML (Federal Decree-Law No. 20 of 2018 and its amendments, if the operator is a reporting entity) and tax/commercial record-keeping laws.',
    rights:
      'Confirm the rights list and the response deadline under the PDPL and its Executive Regulations. The 30-day figure is a placeholder.',
    children:
      'The minimum age of 18 is a business assumption. Confirm whether the PDPL or Executive Regulations set a specific age of digital consent.',
    complaints:
      'Confirm the competent authority (UAE Data Office) and its complaint channel once published.',
  },
  en: {
    title: 'Privacy Notice',
    summary:
      'How MakanReel collects, uses, shares and protects personal data when you browse listings, send an enquiry, or upload property videos as an agent.',
    sections: [
      {
        id: 'who-we-are',
        heading: '1. Who we are',
        blocks: [
          {
            type: 'p',
            text: 'MakanReel is operated by [COMPANY LEGAL NAME], holder of trade licence no. [LICENCE NUMBER] issued by [ISSUING AUTHORITY], with its registered address at [REGISTERED ADDRESS, DUBAI, UAE] ("MakanReel", "we", "us").',
          },
          {
            type: 'p',
            text: 'For any privacy question or request, contact us at [privacy@makanreel.ae].',
          },
        ],
      },
      {
        id: 'scope',
        heading: '2. What this notice covers',
        blocks: [
          {
            type: 'p',
            text: 'This notice applies to the MakanReel website and web app, including property pages, the reels feed, investor presentations, the agent capture studio and the agent dashboard.',
          },
          {
            type: 'p',
            text: 'When you send an enquiry, the licensed real-estate agent or brokerage that advertises the property also receives your details. They handle your data under their own privacy notice once they receive it.',
          },
        ],
      },
      {
        id: 'data-we-collect',
        heading: '3. Personal data we collect',
        blocks: [
          {
            type: 'ul',
            items: [
              'Enquiry details: your name, email address, phone or WhatsApp number, your message, the property and video you enquired about, how long you watched the video, the time of the enquiry, and whether you opted in to marketing.',
              'Agent account details: name, email address, role, brokerage and licence details, and activity in the dashboard.',
              'Property videos and capture data: video footage, the GPS location where the video was recorded (only if you allow location access), and the filming-consent confirmation you give before uploading.',
              'Technical data: IP address, browser and device type, and request logs. We use these to keep the service secure, apply rate limits and block automated scraping.',
              'Preferences saved on your device: language, light or dark theme, display currency, and upload progress. See the Cookie Policy.',
            ],
          },
          {
            type: 'p',
            text: 'We do not ask for sensitive data such as health, religion or biometric data. Please do not include it in enquiry messages.',
          },
        ],
      },
      {
        id: 'legal-basis',
        heading: '4. Why we use your data and on what basis',
        blocks: [
          {
            type: 'table',
            headers: ['Purpose', 'Basis'],
            rows: [
              [
                'Recording your enquiry and passing it to the listing agent so they can reply',
                'Your consent, given by ticking the box on the enquiry form',
              ],
              [
                'Sending you similar listings and market updates',
                'Your separate, optional marketing consent. You can withdraw it at any time',
              ],
              [
                'Showing permit numbers and Madmoun QR codes, and keeping listing records',
                'Compliance with Dubai Land Department and RERA advertising requirements [CONFIRM]',
              ],
              [
                'Running agent accounts, uploads and moderation',
                'Performing our agreement with the agent or brokerage',
              ],
              [
                'Security, fraud prevention, rate limiting and audit logs',
                '[LEGAL BASIS TO BE CONFIRMED BY COUNSEL]',
              ],
            ],
          },
          {
            type: 'p',
            text: 'You can withdraw consent at any time. Withdrawing consent does not affect processing that already took place.',
          },
        ],
      },
      {
        id: 'sharing',
        heading: '5. Who we share data with',
        blocks: [
          {
            type: 'ul',
            items: [
              'The licensed agent or brokerage advertising the property you enquired about.',
              'Service providers that run the platform for us, such as hosting, database and video-streaming providers [LIST PROVIDERS AND REGIONS BEFORE LAUNCH]. They may only use the data to provide their service to us.',
              'Map tiles are loaded from OpenFreeMap, and a map text plugin is loaded from the unpkg content network. These providers receive your IP address when the map loads.',
              'If you tap a WhatsApp button, you leave MakanReel and WhatsApp (Meta) processes your data under its own terms.',
              'Government authorities, courts or regulators such as the Dubai Land Department, RERA or the police, when the law requires it.',
            ],
          },
          { type: 'p', text: 'We do not sell your personal data.' },
        ],
      },
      {
        id: 'transfers',
        heading: '6. Transfers outside the UAE',
        blocks: [
          {
            type: 'p',
            text: 'Some of our service providers may store or process data outside the UAE. When that happens, we only transfer data where UAE data protection law allows it, for example to a country with adequate protection or under contractual safeguards [CONFIRM MECHANISM].',
          },
        ],
      },
      {
        id: 'retention',
        heading: '7. How long we keep data',
        blocks: [
          {
            type: 'ul',
            items: [
              'Enquiries: up to [24 months] after the enquiry, unless the law requires longer.',
              'Marketing consent records: for as long as you stay subscribed, plus [12 months] as evidence of consent.',
              'Agent accounts: while the account is active, plus [24 months] after it is closed.',
              'Property videos: while the listing is active, plus [12 months].',
              'Security and audit logs: [3 years].',
            ],
          },
          {
            type: 'p',
            text: 'After these periods we delete or anonymise the data.',
          },
        ],
      },
      {
        id: 'rights',
        heading: '8. Your rights',
        blocks: [
          {
            type: 'p',
            text: 'Subject to UAE law, you can ask us to:',
          },
          {
            type: 'ul',
            items: [
              'give you a copy of your personal data and information about how we use it;',
              'correct inaccurate or incomplete data;',
              'delete your data;',
              'restrict or stop certain processing, including any processing for marketing;',
              'send your data to you or another provider in a structured format;',
              'withdraw your consent at any time.',
            ],
          },
          {
            type: 'p',
            text: 'Email [privacy@makanreel.ae] with your request. Agents can also export or erase their data from the dashboard. We may need to verify your identity, and we aim to reply within [30 days].',
          },
        ],
      },
      {
        id: 'security',
        heading: '9. How we protect data',
        blocks: [
          {
            type: 'p',
            text: 'We use encrypted connections, role-based access controls, hashed passwords, rate limiting and audit logs of sensitive actions. No system is completely secure, so if we become aware of a breach that affects you, we will tell you and the authorities where the law requires.',
          },
        ],
      },
      {
        id: 'children',
        heading: '10. Children',
        blocks: [
          {
            type: 'p',
            text: 'MakanReel is not intended for people under [18]. We do not knowingly collect data from children.',
          },
        ],
      },
      {
        id: 'complaints',
        heading: '11. Complaints',
        blocks: [
          {
            type: 'p',
            text: 'If you are unhappy with how we handled your data, please contact us first. You may also complain to the UAE Data Office [CONFIRM AUTHORITY AND CONTACT CHANNEL].',
          },
        ],
      },
      {
        id: 'changes',
        heading: '12. Changes to this notice',
        blocks: [
          {
            type: 'p',
            text: 'We will post any update on this page with a new version number and date. If a change materially affects how we use data you already gave us, we will ask for your consent again where the law requires it.',
          },
        ],
      },
    ],
  },
  ar: {
    title: 'إشعار الخصوصية',
    summary:
      'كيف تجمع مكان ريل البيانات الشخصية وتستخدمها وتشاركها وتحميها عند تصفّح العقارات أو إرسال استفسار أو رفع فيديوهات العقارات بصفتك وسيطاً.',
    sections: [
      {
        id: 'who-we-are',
        heading: '1. من نحن',
        blocks: [
          {
            type: 'p',
            text: 'تُشغّل منصة مكان ريل شركة [الاسم القانوني للشركة]، الحاصلة على الرخصة التجارية رقم [رقم الرخصة] الصادرة عن [الجهة المُصدِرة]، وعنوانها المسجّل [العنوان المسجّل، دبي، الإمارات العربية المتحدة] ("مكان ريل" أو "نحن").',
          },
          {
            type: 'p',
            text: 'لأي سؤال أو طلب يتعلق بالخصوصية، تواصل معنا عبر [privacy@makanreel.ae].',
          },
        ],
      },
      {
        id: 'scope',
        heading: '2. نطاق هذا الإشعار',
        blocks: [
          {
            type: 'p',
            text: 'ينطبق هذا الإشعار على موقع مكان ريل وتطبيق الويب، بما في ذلك صفحات العقارات وخلاصة الريلز وعروض المستثمرين واستوديو التصوير ولوحة تحكم الوسطاء.',
          },
          {
            type: 'p',
            text: 'عند إرسال استفسار، يتسلّم بياناتك أيضاً الوسيط العقاري أو شركة الوساطة المرخّصة التي تعلن عن العقار، وتتعامل مع بياناتك وفق إشعار الخصوصية الخاص بها بعد استلامها.',
          },
        ],
      },
      {
        id: 'data-we-collect',
        heading: '3. البيانات الشخصية التي نجمعها',
        blocks: [
          {
            type: 'ul',
            items: [
              'بيانات الاستفسار: اسمك وبريدك الإلكتروني ورقم هاتفك أو واتساب ورسالتك، والعقار والفيديو الذي استفسرت عنه، ومدة مشاهدتك للفيديو، ووقت الاستفسار، وما إذا كنت قد وافقت على تلقي الرسائل التسويقية.',
              'بيانات حساب الوسيط: الاسم والبريد الإلكتروني والدور وبيانات شركة الوساطة والترخيص، والنشاط في لوحة التحكم.',
              'فيديوهات العقارات وبيانات التصوير: لقطات الفيديو، والموقع الجغرافي (GPS) الذي صُوّر فيه الفيديو (فقط إذا سمحت بالوصول إلى الموقع)، وتأكيد موافقة التصوير الذي تقدّمه قبل الرفع.',
              'البيانات التقنية: عنوان IP ونوع المتصفح والجهاز وسجلات الطلبات، ونستخدمها لحماية الخدمة وتطبيق حدود الاستخدام ومنع الاستخراج الآلي للبيانات.',
              'التفضيلات المحفوظة على جهازك: اللغة والوضع الفاتح أو الداكن وعملة العرض وتقدّم رفع الفيديو. راجع سياسة ملفات تعريف الارتباط.',
            ],
          },
          {
            type: 'p',
            text: 'لا نطلب بيانات حساسة مثل البيانات الصحية أو الدينية أو البيومترية، ونرجو عدم إدراجها في رسائل الاستفسار.',
          },
        ],
      },
      {
        id: 'legal-basis',
        heading: '4. أغراض استخدام بياناتك وأساسه',
        blocks: [
          {
            type: 'table',
            headers: ['الغرض', 'الأساس'],
            rows: [
              [
                'تسجيل استفسارك وإحالته إلى الوسيط المُعلِن للرد عليك',
                'موافقتك، التي تقدّمها بتحديد الخانة في نموذج الاستفسار',
              ],
              [
                'إرسال عقارات مشابهة وتحديثات السوق إليك',
                'موافقتك التسويقية المستقلة والاختيارية، ويمكنك سحبها في أي وقت',
              ],
              [
                'عرض أرقام التصاريح ورموز QR الخاصة بنظام مضمون والاحتفاظ بسجلات الإعلانات',
                'الامتثال لمتطلبات الإعلان لدى دائرة الأراضي والأملاك في دبي ومؤسسة التنظيم العقاري (ريرا) [للتأكيد]',
              ],
              [
                'تشغيل حسابات الوسطاء والرفع والمراجعة',
                'تنفيذ اتفاقنا مع الوسيط أو شركة الوساطة',
              ],
              [
                'الأمن ومنع الاحتيال وحدود الاستخدام وسجلات التدقيق',
                '[الأساس القانوني بانتظار تأكيد المستشار القانوني]',
              ],
            ],
          },
          {
            type: 'p',
            text: 'يمكنك سحب موافقتك في أي وقت، ولا يؤثر سحبها على المعالجة التي تمّت قبل ذلك.',
          },
        ],
      },
      {
        id: 'sharing',
        heading: '5. الجهات التي نشارك البيانات معها',
        blocks: [
          {
            type: 'ul',
            items: [
              'الوسيط أو شركة الوساطة المرخّصة التي تعلن عن العقار الذي استفسرت عنه.',
              'مزوّدو الخدمات الذين يشغّلون المنصة نيابةً عنا، مثل مزوّدي الاستضافة وقواعد البيانات وبث الفيديو [تُدرج أسماء المزوّدين ومناطق الاستضافة قبل الإطلاق]، ولا يجوز لهم استخدام البيانات إلا لتقديم خدمتهم لنا.',
              'تُحمَّل مربعات الخريطة من OpenFreeMap، ويُحمَّل مكوّن نصوص الخريطة من شبكة unpkg، ويتلقّى هذان المزوّدان عنوان IP الخاص بك عند تحميل الخريطة.',
              'إذا ضغطت زر واتساب فإنك تغادر مكان ريل، ويعالج واتساب (ميتا) بياناتك وفق شروطه الخاصة.',
              'الجهات الحكومية أو المحاكم أو الجهات التنظيمية مثل دائرة الأراضي والأملاك ومؤسسة التنظيم العقاري أو الشرطة، عندما يفرض القانون ذلك.',
            ],
          },
          { type: 'p', text: 'نحن لا نبيع بياناتك الشخصية.' },
        ],
      },
      {
        id: 'transfers',
        heading: '6. نقل البيانات خارج الدولة',
        blocks: [
          {
            type: 'p',
            text: 'قد يخزّن بعض مزوّدي الخدمات البيانات أو يعالجونها خارج دولة الإمارات. وفي هذه الحالة لا ننقل البيانات إلا بالقدر الذي يسمح به قانون حماية البيانات الإماراتي، مثل النقل إلى دولة توفّر حماية كافية أو بموجب ضمانات تعاقدية [تأكيد آلية النقل].',
          },
        ],
      },
      {
        id: 'retention',
        heading: '7. مدة الاحتفاظ بالبيانات',
        blocks: [
          {
            type: 'ul',
            items: [
              'الاستفسارات: لمدة أقصاها [24 شهراً] من تاريخ الاستفسار، ما لم يفرض القانون مدة أطول.',
              'سجلات الموافقة التسويقية: طوال فترة اشتراكك، مضافاً إليها [12 شهراً] كدليل على الموافقة.',
              'حسابات الوسطاء: طوال فترة نشاط الحساب، مضافاً إليها [24 شهراً] بعد إغلاقه.',
              'فيديوهات العقارات: طوال فترة نشاط الإعلان، مضافاً إليها [12 شهراً].',
              'سجلات الأمن والتدقيق: [3 سنوات].',
            ],
          },
          {
            type: 'p',
            text: 'بعد انقضاء هذه المدد نحذف البيانات أو نجعلها مجهولة الهوية.',
          },
        ],
      },
      {
        id: 'rights',
        heading: '8. حقوقك',
        blocks: [
          {
            type: 'p',
            text: 'وفقاً لقوانين دولة الإمارات، يحق لك أن تطلب منا:',
          },
          {
            type: 'ul',
            items: [
              'تزويدك بنسخة من بياناتك الشخصية ومعلومات عن كيفية استخدامها؛',
              'تصحيح البيانات غير الدقيقة أو غير المكتملة؛',
              'حذف بياناتك؛',
              'تقييد معالجات معيّنة أو إيقافها، بما في ذلك أي معالجة لأغراض التسويق؛',
              'إرسال بياناتك إليك أو إلى مزوّد آخر بصيغة منظّمة؛',
              'سحب موافقتك في أي وقت.',
            ],
          },
          {
            type: 'p',
            text: 'أرسل طلبك إلى [privacy@makanreel.ae]. ويمكن للوسطاء أيضاً تصدير بياناتهم أو حذفها من لوحة التحكم. قد نحتاج إلى التحقق من هويتك، ونسعى إلى الرد خلال [30 يوماً].',
          },
        ],
      },
      {
        id: 'security',
        heading: '9. كيف نحمي البيانات',
        blocks: [
          {
            type: 'p',
            text: 'نستخدم اتصالات مشفّرة وصلاحيات وصول مبنية على الأدوار وكلمات مرور مُجزّأة (Hashed) وحدوداً للاستخدام وسجلات تدقيق للإجراءات الحساسة. ولا يوجد نظام آمن تماماً، لذلك إذا علمنا باختراق يؤثر عليك فسنبلغك ونبلغ الجهات المختصة متى فرض القانون ذلك.',
          },
        ],
      },
      {
        id: 'children',
        heading: '10. الأطفال',
        blocks: [
          {
            type: 'p',
            text: 'منصة مكان ريل غير موجّهة لمن هم دون [18] عاماً، ولا نجمع عن علم بيانات من الأطفال.',
          },
        ],
      },
      {
        id: 'complaints',
        heading: '11. الشكاوى',
        blocks: [
          {
            type: 'p',
            text: 'إذا لم تكن راضياً عن طريقة تعاملنا مع بياناتك، فيُرجى التواصل معنا أولاً. ويمكنك أيضاً تقديم شكوى إلى مكتب الإمارات للبيانات [تأكيد الجهة وقناة التواصل].',
          },
        ],
      },
      {
        id: 'changes',
        heading: '12. التعديلات على هذا الإشعار',
        blocks: [
          {
            type: 'p',
            text: 'سننشر أي تحديث على هذه الصفحة برقم إصدار وتاريخ جديدين. وإذا أثّر تغيير ما جوهرياً على طريقة استخدامنا لبيانات سبق أن قدّمتها، فسنطلب موافقتك مجدداً متى فرض القانون ذلك.',
          },
        ],
      },
    ],
  },
};
