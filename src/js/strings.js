// Strings rendered by JavaScript, in both languages. Static page copy lives in
// src/index.html (English) and src/i18n/ar.js (Arabic).

export const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
export const rtl = lang === 'ar';

const STRINGS = {
  en: {
    pause: 'Pause',
    resume: 'Resume',
    startAgain: 'Start again',
    timerCues: ['Small circles at the hairline…', 'Move up to the crown…', 'Now behind the ears and nape…'],
    timerDone: 'Beautiful. Leave it in for at least an hour ✨',
    timerToast: 'Massage complete. Your scalp thanks you ✨',
    week: (n) => `Week ${n}`,
    stages: [
      ['Scalp feels nourished', 'Dryness and tightness ease. Hair feels softer and looks shinier from the very first wash.'],
      ['Less shedding', 'Fewer strands in the brush and shower drain as roots are nourished and breakage drops.'],
      ['Stronger strands', 'Hair feels thicker to the touch, with fewer split ends and more bounce.'],
      ['New baby hairs', 'Look closely at your hairline and part: fine new hairs start to appear.'],
      ['Fuller-looking hair', 'A visibly denser, glossier head of hair. Keep the ritual going to maintain your results.'],
    ],
    openBag: (n) => `Open bag, ${n} item${n === 1 ? '' : 's'}`,
    qtyFor: (name) => `Quantity for ${name}`,
    decrease: 'Decrease',
    increase: 'Increase',
    remove: 'Remove',
    awayFromFree: (amount) => `You’re ${amount} away from free UAE delivery`,
    awayFromDiscount: (amount) => `Free UAE delivery unlocked. Add ${amount} more for 10% off`,
    allUnlocked: 'Free UAE delivery and 10% off unlocked 🎉',
    redirecting: 'Opening secure checkout…',
    checkoutDown: 'Checkout is unavailable right now. Please try again in a moment.',
    cancelled: 'Checkout cancelled. Your bag is saved.',
    added: (qty, name) => `Added ${qty} × ${name} to your bag`,
    waMessage: 'Hi Pink Oil! I’d like to order:',
    waGeneric: 'Hi Pink Oil! I have a question.',
    quiz: [
      {
        q: 'What’s your #1 hair goal?',
        key: 'goal',
        opts: [
          ['growth', 'Fuller, thicker hair', 'Thinning or sparse areas'],
          ['edges', 'Restore my hairline', 'Edges & temples'],
          ['breakage', 'Stop breakage', 'Split ends & snapping'],
          ['shine', 'Softness & shine', 'Dull or dry lengths'],
        ],
      },
      {
        q: 'How would you describe your hair?',
        key: 'type',
        opts: [
          ['fine', 'Fine & straight', ''],
          ['wavy', 'Wavy', ''],
          ['curly', 'Curly', ''],
          ['coily', 'Coily', ''],
        ],
      },
      {
        q: 'How long will you commit to the ritual?',
        key: 'commit',
        opts: [
          ['1', 'Let me try it first', 'A few weeks'],
          ['2', 'About two months', 'See real change'],
          ['4', 'The full journey', '12+ weeks for best results'],
        ],
      },
    ],
    tips: {
      growth: 'Focus every drop on the scalp along your parts and never skip the 3-minute massage.',
      edges: 'Apply 1–2 drops directly to the hairline with your fingertip and massage gently. Avoid tight styles while you grow.',
      breakage: 'Use on the scalp, then smooth the remainder through your ends to seal them.',
      shine: 'After your scalp, rub one drop between your palms and glaze over dry lengths for instant gloss.',
    },
    typeTips: {
      fine: 'Fine hair loves 3 drops per part and an overnight treatment before wash day.',
      wavy: 'Use 4 drops per part, and scrunch any leftover oil into your ends.',
      curly: 'Apply on damp hair before your styler to lock in moisture and definition.',
      coily: 'Use 5 drops per part and seal your ends. Coily hair drinks this up.',
    },
    yourMatch: 'Your match',
    shopRitual: (price) => `Shop my ritual: ${price}`,
    retake: 'Retake',
    ingredients: {
      rosemary: {
        latin: 'Rosmarinus officinalis leaf oil',
        text: 'The hero of the blend. Rosemary boosts micro-circulation in the scalp so follicles receive more nutrients. Studies have compared its effect on hair count to popular growth treatments over six months.',
        tags: ['Growth', 'Circulation', 'Density'],
      },
      castor: {
        latin: 'Ricinus communis seed oil',
        text: 'Rich in ricinoleic acid, cold-pressed castor oil coats and thickens each strand, sealing in moisture to reduce breakage and split ends, so length is retained as hair grows.',
        tags: ['Strength', 'Thickness', 'Moisture'],
      },
      pumpkin: {
        latin: 'Cucurbita pepo seed oil',
        text: 'Packed with zinc, phytosterols and vitamin E, pumpkin seed oil supports a balanced scalp and is studied for its role in reducing hair thinning.',
        tags: ['Anti-thinning', 'Zinc', 'Vitamin E'],
      },
      jojoba: {
        latin: 'Simmondsia chinensis seed oil',
        text: 'Technically a liquid wax that closely mirrors your scalp’s natural sebum. It balances oil production, calms dryness and flaking, and absorbs without clogging follicles.',
        tags: ['Balance', 'Soothing', 'Lightweight'],
      },
      rosehip: {
        latin: 'Rosa canina fruit oil',
        text: 'The source of Pink Oil’s blush. Rosehip is loaded with essential fatty acids and vitamin A that smooth the cuticle for softness and a glass-like shine.',
        tags: ['Shine', 'Softness', 'Omega 3 & 6'],
      },
      peppermint: {
        latin: 'Mentha piperita oil',
        text: 'A cooling tingle that wakes up the scalp, welcome on a hot Dubai evening. Peppermint’s menthol encourages blood flow to the follicles.',
        tags: ['Cooling', 'Freshness', 'Stimulating'],
      },
    },
  },
  ar: {
    pause: 'إيقاف مؤقت',
    resume: 'متابعة',
    startAgain: 'ابدئي من جديد',
    timerCues: ['حركات دائرية صغيرة عند خط الشعر…', 'انتقلي إلى أعلى الرأس…', 'والآن خلف الأذنين وأسفل الرقبة…'],
    timerDone: 'رائع. اتركيه ساعة على الأقل ✨',
    timerToast: 'انتهى التدليك. فروة رأسك تشكرك ✨',
    week: (n) => `الأسبوع ${n}`,
    stages: [
      ['فروة رأس مغذّاة', 'يخفّ الجفاف والشدّ. يصبح الشعر أنعم ويبدو أكثر لمعانًا من أول غسلة.'],
      ['تساقط أقل', 'شعر أقل في الفرشاة وفي الحمام مع تغذية الجذور وتراجع التكسّر.'],
      ['شعر أقوى', 'يصبح الشعر أكثف عند اللمس، مع تقصّف أقل وحيوية أكبر.'],
      ['شعيرات جديدة', 'انظري عن قرب إلى خط الشعر والفرق: تبدأ شعيرات ناعمة جديدة بالظهور.'],
      ['شعر يبدو أكثف', 'شعر أكثف ولمعانًا بشكل واضح. استمري في الروتين للحفاظ على النتائج.'],
    ],
    openBag: (n) => `فتح الحقيبة، ${n} منتجات`,
    qtyFor: (name) => `كمية ${name}`,
    decrease: 'إنقاص',
    increase: 'زيادة',
    remove: 'إزالة',
    awayFromFree: (amount) => `يتبقّى ${amount} للحصول على توصيل مجاني في الإمارات`,
    awayFromDiscount: (amount) => `حصلتِ على توصيل مجاني. أضيفي ${amount} للحصول على خصم 10٪`,
    allUnlocked: 'حصلتِ على توصيل مجاني وخصم 10٪ 🎉',
    redirecting: 'جارٍ فتح صفحة الدفع الآمن…',
    checkoutDown: 'الدفع غير متاح حاليًا. يُرجى المحاولة بعد قليل.',
    cancelled: 'أُلغي الدفع. حقيبتك محفوظة.',
    added: (qty, name) => `أُضيف ${qty} × ${name} إلى حقيبتك`,
    waMessage: 'مرحبًا بينك أويل! أودّ طلب:',
    waGeneric: 'مرحبًا بينك أويل! لدي سؤال.',
    quiz: [
      {
        q: 'ما هدفك الأول لشعرك؟',
        key: 'goal',
        opts: [
          ['growth', 'شعر أكثف وأغزر', 'مناطق خفيفة أو فراغات'],
          ['edges', 'استعادة خط الشعر', 'المقدمة والصدغان'],
          ['breakage', 'إيقاف التكسّر', 'التقصّف والأطراف المتقصفة'],
          ['shine', 'نعومة ولمعان', 'أطراف باهتة أو جافة'],
        ],
      },
      {
        q: 'كيف تصفين شعرك؟',
        key: 'type',
        opts: [
          ['fine', 'ناعم ومفرود', ''],
          ['wavy', 'مموّج', ''],
          ['curly', 'مجعّد', ''],
          ['coily', 'مجعّد جدًا', ''],
        ],
      },
      {
        q: 'كم من الوقت ستلتزمين بالروتين؟',
        key: 'commit',
        opts: [
          ['1', 'أريد التجربة أولًا', 'بضعة أسابيع'],
          ['2', 'شهران تقريبًا', 'لرؤية تغيير حقيقي'],
          ['4', 'الرحلة الكاملة', '12 أسبوعًا أو أكثر لأفضل النتائج'],
        ],
      },
    ],
    tips: {
      growth: 'ركّزي كل قطرة على فروة الرأس على طول الفروق ولا تتخطّي تدليك الدقائق الثلاث.',
      edges: 'ضعي قطرة أو قطرتين مباشرة على خط الشعر بطرف إصبعك ودلّكي بلطف. تجنّبي التسريحات المشدودة خلال فترة النمو.',
      breakage: 'استخدميه على فروة الرأس، ثم مرّري ما تبقّى على الأطراف لحمايتها.',
      shine: 'بعد فروة الرأس، افركي قطرة بين كفّيك ومرّريها على الأطراف الجافة للمعان فوري.',
    },
    typeTips: {
      fine: 'الشعر الناعم يحب 3 قطرات لكل فرق وعلاجًا طوال الليل قبل يوم الغسل.',
      wavy: 'استخدمي 4 قطرات لكل فرق، واضغطي ما تبقّى من الزيت على الأطراف.',
      curly: 'ضعيه على الشعر الرطب قبل منتج التصفيف لحبس الرطوبة وتحديد التجعيدات.',
      coily: 'استخدمي 5 قطرات لكل فرق واحمي أطرافك. الشعر المجعّد جدًا يمتصّه بسرعة.',
    },
    yourMatch: 'اختيارك المثالي',
    shopRitual: (price) => `تسوّقي روتيني: ${price}`,
    retake: 'أعيدي الاختبار',
    ingredients: {
      rosemary: {
        latin: 'Rosmarinus officinalis leaf oil',
        text: 'نجم المزيج. ينشّط إكليل الجبل الدورة الدموية الدقيقة في فروة الرأس لتحصل البصيلات على غذاء أكثر، وقد قارنت دراسات تأثيره على كثافة الشعر بعلاجات نمو شائعة على مدى ستة أشهر.',
        tags: ['النمو', 'الدورة الدموية', 'الكثافة'],
      },
      castor: {
        latin: 'Ricinus communis seed oil',
        text: 'زيت الخروع المعصور على البارد غني بحمض الريسينوليك، يغلّف كل شعرة ويكثّفها ويحبس الرطوبة ليقلّل التكسّر والتقصّف، فيحافظ شعرك على طوله وهو ينمو.',
        tags: ['القوة', 'الكثافة', 'الترطيب'],
      },
      pumpkin: {
        latin: 'Cucurbita pepo seed oil',
        text: 'غني بالزنك والستيرولات النباتية وفيتامين E، يدعم زيت بذور اليقطين توازن فروة الرأس، ويُدرس دوره في الحدّ من ترقّق الشعر.',
        tags: ['ضد الترقّق', 'الزنك', 'فيتامين E'],
      },
      jojoba: {
        latin: 'Simmondsia chinensis seed oil',
        text: 'هو في الحقيقة شمع سائل يشبه كثيرًا الزيوت الطبيعية لفروة رأسك. يوازن إفراز الدهون ويهدّئ الجفاف والقشرة ويُمتص دون أن يسدّ البصيلات.',
        tags: ['التوازن', 'التهدئة', 'خفيف'],
      },
      rosehip: {
        latin: 'Rosa canina fruit oil',
        text: 'مصدر اللون الوردي في بينك أويل. زيت ثمر الورد غني بالأحماض الدهنية الأساسية وفيتامين A التي تنعّم القشرة الخارجية للشعرة لنعومة ولمعان كالزجاج.',
        tags: ['اللمعان', 'النعومة', 'أوميغا 3 و6'],
      },
      peppermint: {
        latin: 'Mentha piperita oil',
        text: 'إحساس منعش يوقظ فروة الرأس، ومرحَّب به في أمسيات دبي الحارة. يشجّع المنثول في النعناع تدفق الدم إلى البصيلات.',
        tags: ['انتعاش', 'برودة', 'تنشيط'],
      },
    },
  },
};

export const T = STRINGS[lang];
