import type { LegalDocument } from './types';

export const cookiePolicy: LegalDocument = {
  slug: 'cookies',
  version: '2026-11-draft-1',
  lastUpdated: '2026-11-25',
  review: {
    'what-we-use':
      'Inventory taken from the code on 2026-11-25. The session cookie lifetime is 7 days on this branch; the pending login lockdown work changes it to 12 hours, so update the table when that merges. Re-check the list whenever analytics, chat or advertising tools are added.',
    'third-party':
      'Not verified whether Cloudflare Stream, OpenFreeMap or unpkg set their own cookies in the viewer’s browser. Check in a clean browser profile on the production domain before launch.',
    'no-tracking':
      'The UAE PDPL has no cookie-specific rule like the EU ePrivacy Directive. Drafted on the assumption that strictly necessary storage needs no banner, and that any future analytics or advertising cookies would need prior opt-in consent. Confirm, and confirm whether EU/UK visitors require a banner anyway.',
  },
  en: {
    title: 'Cookie Policy',
    summary:
      'Which cookies and similar browser storage MakanReel uses, why, and how you can control them.',
    sections: [
      {
        id: 'what-are-cookies',
        heading: '1. What cookies and local storage are',
        blocks: [
          {
            type: 'p',
            text: 'Cookies are small text files a website stores in your browser. Local storage is a similar feature that keeps information on your device. We use both only to make the service work and to remember your choices.',
          },
        ],
      },
      {
        id: 'what-we-use',
        heading: '2. What we use',
        blocks: [
          {
            type: 'table',
            headers: ['Name', 'Type', 'Purpose', 'How long'],
            rows: [
              [
                'makanreel_session',
                'Cookie (strictly necessary, HTTP-only)',
                'Keeps you signed in and applies your account permissions',
                '[7 days], or until you sign out',
              ],
              [
                'NEXT_LOCALE',
                'Cookie (strictly necessary)',
                'Remembers whether you chose English or Arabic',
                'Set by our language framework [CONFIRM LIFETIME]',
              ],
              [
                'makanreel_theme',
                'Local storage (preference)',
                'Remembers light or dark mode',
                'Until you clear it',
              ],
              [
                'makanreel_currency',
                'Local storage (preference)',
                'Remembers your display currency',
                'Until you clear it',
              ],
              [
                'makanreel_tus_resume_*',
                'Local storage (strictly necessary, agents only)',
                'Lets an interrupted video upload resume',
                'Removed when the upload finishes',
              ],
            ],
          },
        ],
      },
      {
        id: 'third-party',
        heading: '3. Third-party content',
        blocks: [
          {
            type: 'p',
            text: 'Some content is loaded from other providers. When your browser loads it, the provider receives your IP address and browser details and may use its own cookies under its own policy:',
          },
          {
            type: 'ul',
            items: [
              'OpenFreeMap: map tiles.',
              'unpkg: a script that displays Arabic place names correctly on the map.',
              'Cloudflare Stream: video playback and uploads [CONFIRM WHETHER COOKIES ARE SET].',
              'WhatsApp: only if you tap a WhatsApp button.',
            ],
          },
        ],
      },
      {
        id: 'no-tracking',
        heading: '4. No analytics or advertising cookies',
        blocks: [
          {
            type: 'p',
            text: 'We do not currently use analytics, advertising or cross-site tracking cookies. If we add them, we will update this policy and ask for your consent before setting them.',
          },
        ],
      },
      {
        id: 'control',
        heading: '5. How to control cookies',
        blocks: [
          {
            type: 'p',
            text: 'You can block or delete cookies and local storage in your browser settings. If you block strictly necessary cookies, signing in and some features will not work.',
          },
        ],
      },
      {
        id: 'contact',
        heading: '6. Contact',
        blocks: [
          {
            type: 'p',
            text: 'Questions about this policy: [privacy@makanreel.ae]. See also our Privacy Notice.',
          },
        ],
      },
    ],
  },
  ar: {
    title: 'سياسة ملفات تعريف الارتباط',
    summary:
      'ملفات تعريف الارتباط ووسائل التخزين المماثلة في المتصفح التي تستخدمها مكان ريل، وسبب استخدامها، وكيف يمكنك التحكم بها.',
    sections: [
      {
        id: 'what-are-cookies',
        heading: '1. ما هي ملفات تعريف الارتباط والتخزين المحلي',
        blocks: [
          {
            type: 'p',
            text: 'ملفات تعريف الارتباط (الكوكيز) ملفات نصية صغيرة يحفظها الموقع في متصفحك، والتخزين المحلي ميزة مماثلة تحتفظ بالمعلومات على جهازك. ونستخدمهما فقط لتشغيل الخدمة وتذكّر اختياراتك.',
          },
        ],
      },
      {
        id: 'what-we-use',
        heading: '2. ما نستخدمه',
        blocks: [
          {
            type: 'table',
            headers: ['الاسم', 'النوع', 'الغرض', 'المدة'],
            rows: [
              [
                'makanreel_session',
                'ملف تعريف ارتباط (ضروري، HTTP-only)',
                'يُبقيك مسجّلاً للدخول ويطبّق صلاحيات حسابك',
                '[7 أيام] أو حتى تسجيل الخروج',
              ],
              [
                'NEXT_LOCALE',
                'ملف تعريف ارتباط (ضروري)',
                'يتذكّر اختيارك للغة العربية أو الإنجليزية',
                'يضبطه إطار اللغات المستخدم [تأكيد المدة]',
              ],
              [
                'makanreel_theme',
                'تخزين محلي (تفضيلات)',
                'يتذكّر الوضع الفاتح أو الداكن',
                'حتى تحذفه',
              ],
              [
                'makanreel_currency',
                'تخزين محلي (تفضيلات)',
                'يتذكّر عملة العرض',
                'حتى تحذفه',
              ],
              [
                'makanreel_tus_resume_*',
                'تخزين محلي (ضروري، للوسطاء فقط)',
                'يتيح استئناف رفع الفيديو بعد انقطاعه',
                'يُحذف عند اكتمال الرفع',
              ],
            ],
          },
        ],
      },
      {
        id: 'third-party',
        heading: '3. محتوى من أطراف أخرى',
        blocks: [
          {
            type: 'p',
            text: 'يُحمَّل بعض المحتوى من مزوّدين آخرين، وعند تحميل متصفحك له يتلقّى المزوّد عنوان IP وبيانات المتصفح، وقد يستخدم ملفات تعريف الارتباط الخاصة به وفق سياسته:',
          },
          {
            type: 'ul',
            items: [
              'OpenFreeMap: مربعات الخريطة.',
              'unpkg: برنامج نصي يعرض أسماء الأماكن العربية بشكل صحيح على الخريطة.',
              'Cloudflare Stream: تشغيل الفيديو ورفعه [تأكيد ما إذا كان يضع ملفات تعريف ارتباط].',
              'واتساب: فقط إذا ضغطت زر واتساب.',
            ],
          },
        ],
      },
      {
        id: 'no-tracking',
        heading: '4. لا نستخدم ملفات تعريف ارتباط للتحليلات أو الإعلانات',
        blocks: [
          {
            type: 'p',
            text: 'لا نستخدم حالياً ملفات تعريف ارتباط للتحليلات أو الإعلانات أو التتبّع عبر المواقع. وإذا أضفناها فسنحدّث هذه السياسة ونطلب موافقتك قبل وضعها.',
          },
        ],
      },
      {
        id: 'control',
        heading: '5. كيف تتحكّم بملفات تعريف الارتباط',
        blocks: [
          {
            type: 'p',
            text: 'يمكنك حظر ملفات تعريف الارتباط والتخزين المحلي أو حذفها من إعدادات متصفحك. وإذا حظرت الملفات الضرورية فلن يعمل تسجيل الدخول وبعض الميزات.',
          },
        ],
      },
      {
        id: 'contact',
        heading: '6. التواصل',
        blocks: [
          {
            type: 'p',
            text: 'للاستفسار عن هذه السياسة: [privacy@makanreel.ae]. راجع أيضاً إشعار الخصوصية.',
          },
        ],
      },
    ],
  },
};
