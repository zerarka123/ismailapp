import { SUPPORT_EMAIL } from './config.js';

// Draft texts written for Marsa's real behaviour. Have a lawyer review them before publishing.
export const LEGAL_UPDATED = 'نوفمبر 2026';
export const LEGAL_UPDATED_I18N = { ar: LEGAL_UPDATED, fr: 'novembre 2026', en: 'November 2026' };

export const LEGAL = {
  privacy: {
    title: 'سياسة الخصوصية',
    sections: [
      ['من نحن', ['«مرسى» تطبيق جزائري لإعلانات بيع القوارب والمحركات، ودليل للأنشطة البحرية وأنشطة الصيد. تشرح هذه السياسة ما نجمعه من بيانات وكيف نستعملها وكيف تتحكم بها.']],
      ['البيانات التي نجمعها', [
        'بيانات الحساب: البريد الإلكتروني (للدخول والتحقق)، وكلمة السر (تُحفظ مشفّرة لدى مزوّد المصادقة ولا نطّلع عليها)، والاسم.',
        'بيانات اختيارية: رقم الهاتف والولاية.',
        'ما تنشره: نصوص الإعلانات والأنشطة، والصور التي تختارها أنت، وأرقام الهاتف وواتساب التي تضعها للتواصل.',
        'وثائق التوثيق: إذا طلبت شارة التوثيق ترفع حتى 3 ملفات (صور أو PDF). تُحفظ في مساحة تخزين خاصة، ولا يطّلع عليها غيرك وفريق الإدارة، ونستعملها لمراجعة طلب التوثيق. نحتفظ بها ما دام حسابك قائمًا، ويمكنك طلب حذفها بمراسلتنا.',
        'سوق السمك: الطلبات والعروض (النوع والكمية والسعر والولاية والبلدية)، وأرقام التواصل المرتبطة بها، ومن تتابعهم.',
        'الدخول بحساب Google (إذا كان متاحًا واخترته): نستقبل من Google بيانات حسابك الأساسية مثل البريد الإلكتروني والاسم.',
        'الموقع الجغرافي: فقط عندما تضغط زر «حدّد موقع نشاطك» أثناء تسجيل نشاط في الدليل. نحفظ الإحداثيات مع نشاطك لعرضها على الخريطة. لا نتتبع موقعك في الخلفية.',
        'نشاطك داخل التطبيق: الإعلانات المفضلة، والبلاغات التي ترسلها، واهتمامات الإشعارات التي تختارها.',
        'نسجّل أيضًا الإعلانات الداخلية (أخبار مرسى) التي قرأتها، وتاريخ آخر دخول لك.',
        'معرّف الإشعارات: إذا فعّلت الإشعارات نحفظ معرّف جهازك أو اشتراك متصفحك لإرسال إشعارات مرسى. تُرسل إشعارات الويب عبر خدمة الإشعارات التابعة لمتصفحك أو جهازك.',
        'إحصائيات الاستعمال: نسجّل معرّفًا عشوائيًا مجهولًا لجهازك (لا يحمل اسمك)، ومرات فتح التطبيق، وصفحات الإعلانات والأنشطة التي تفتحها، وضغطك على أزرار الاتصال وواتساب. قد نربطها بحسابك إن كنت مسجّلًا الدخول. نستعملها فقط لمعرفة عدد المستخدمين وتحسين التطبيق، ولا نشاركها مع أي طرف ثالث ولا نستعملها للإعلانات. عند حذف حسابك تُفصل هذه السجلات عن هويتك.',
        'بيانات تقنية: عنوان IP وسجلات تقنية لدى مزوّدي الخدمة، لأغراض الأمان وحل الأعطال.',
      ]],
      ['ما لا نفعله', [
        'لا نستعمل أدوات تحليلات أو شبكات إعلانية من أطراف ثالثة، ولا نجمع معرّف الإعلانات. قد تعرض مرسى إعلانات ممولة خاصة بها ونحسب عدد مرات ظهورها والضغط عليها.',
        'لا نصل إلى جهات اتصالك أو رسائلك أو مكتبة صورك. نرفع فقط الصور التي تختارها بنفسك.',
        'لا نبيع بياناتك.',
      ]],
      ['كيف نستعمل بياناتك', ['لتشغيل حسابك، وعرض إعلاناتك وأنشطتك، وتمكين المسجّلين من التواصل معك، وإرسال رمز التحقق إلى بريدك، ومنع الاحتيال والإساءة، والرد على استفساراتك.']],
      ['من يرى بياناتك', [
        'يراها الجميع (حتى الزوار): عنوان الإعلان ووصفه وصوره وسعره والولاية، واسم البائع المعروض، واسم النشاط ووصفه وصوره وموقعه إن حدّدته.',
        'يراها الجميع أيضًا: اسم الحساب ونوعه وصورته وشارة التوثيق (دون البريد أو الهاتف أو الوثائق)، وكل ما تكتبه أو ترفعه في إعلانك أو نشاطك مثل العنوان والمكان وصور وفيديوهات الأعمال.',
        'الموقع marsadz.app ومحركات البحث: صفحات الأنشطة المنشورة (الاسم والوصف والعنوان والولاية والصور) تظهر على الموقع العمومي ويمكن أن تفهرسها محركات البحث مثل Google. يعرض الموقع أيضًا الإعلانات المموّلة، والعدد الإجمالي للمستخدمين دون أسمائهم.',
        'الرعاة (Sponsors): اسم الراعي وعروضه وعنوانه ورقم هاتفه وواتساب المخصصة للإشهار يراها الجميع.',
        'يراها المستخدمون المسجّلون فقط: رقم الهاتف ورقم واتساب الخاصان بالإعلان أو النشاط (باستثناء الرعاة).',
        'في سوق السمك: يرى الباعة المؤهلون طلبات الزبائن السارية، ولا يظهر رقم صاحب الطلب إلا للبائع الذي أجاب بأن السمك متوفر. ويرى صاحب الطلب عرض البائع ورقمه.',
        'لا يرى بقية المستخدمين بريدك الإلكتروني ولا مفضلتك. يمكن لفريق الإدارة الاطلاع على بريدك. كلمة سرك لا نطّلع عليها.',
        'يمكن لفريق الإدارة الاطلاع على بيانات الحسابات والمحتوى والبلاغات ووثائق التوثيق بالقدر اللازم للإدارة والمراجعة.',
      ]],
      ['مزوّدو الخدمة', ['نستعين بمزوّدين يعالجون البيانات نيابةً عنا لتشغيل التطبيق: Supabase (قاعدة البيانات والمصادقة وتخزين الملفات، وخادمنا لديه في إيرلندا)، وCloudflare (استضافة الموقع والتخزين المؤقت للصور والفيديوهات العمومية)، وGoogle Firebase (إشعارات تطبيق الهاتف إذا فُعّلت)، وخدمة إرسال البريد الإلكتروني لرمز التحقق. قد تقع خوادمهم خارج الجزائر.']],
      ['خدمات خارجية', ['بعض الصفحات تتصل مباشرة بخدمات خارجية يمكنها معرفة عنوان IP الخاص بك: Google Fonts وcdnjs (خطوط وملفات الموقع)، وOpen-Meteo (حالة البحر حسب الميناء المختار، دون إرسال موقعك)، وYouTube أو Vimeo عند عرض فيديو في أخبار مرسى. وإذا ضغطت على رابط واتساب أو موقع آخر فتطبّق سياسة ذلك الموقع.']],
      ['الأمان', ['نستعمل اتصالًا مشفّرًا (HTTPS)، وقواعد وصول صارمة في قاعدة البيانات تمنع كل مستخدم من الاطلاع على بيانات غيره خارج ما هو معروض علنًا. ومع ذلك لا توجد طريقة آمنة بنسبة 100%.']],
      ['الاحتفاظ والحذف', [
        'نحتفظ ببياناتك ما دام حسابك قائمًا.',
        'يمكنك حذف حسابك نهائيًا من التطبيق: «حسابي ← حذف حسابي نهائيًا». يُحذف حسابك وإعلاناتك وأنشطتك وصورك وفيديوهاتك ووثائق التوثيق وبيانات التواصل والمفضلة. قد تبقى بعض السجلات غير المرتبطة بحسابك، مثل الإحصائيات وسجلات الاشتراكات.',
        'يمكنك طلب الحذف أيضًا من الصفحة العامة: marsadz.app/delete-account',
        'قد تبقى نسخ من الصور والفيديوهات العمومية لمدة بعد الحذف في التخزين المؤقت لدى Cloudflare أو في المتصفحات ومحركات البحث. يمكنك مراسلتنا لطلب إزالتها من التخزين الذي نتحكم فيه.',
        'قد تبقى نسخ احتياطية لدى مزوّد الخدمة لمدة محدودة حسب سياسته.',
      ]],
      ['حقوقك', ['لك الحق في الاطلاع على بياناتك وتصحيحها وحذفها والاعتراض على معالجتها، وفق القانون الجزائري المتعلق بحماية المعطيات ذات الطابع الشخصي. تعدّل بياناتك من «حسابي» أو تراسلنا.']],
      ['الأطفال', ['التطبيق غير موجّه لمن هم دون 18 عامًا، ولا نجمع عمدًا بيانات أطفال.']],
      ['التغييرات', ['قد نحدّث هذه السياسة، وسنغيّر تاريخ آخر تحديث أعلاه.']],
      ['التواصل', [`لأي استفسار عن الخصوصية: ${SUPPORT_EMAIL}`]],
    ],
  },

  terms: {
    title: 'شروط الاستخدام',
    sections: [
      ['عن مرسى', ['مرسى منصة لعرض الإعلانات والتعريف بالأنشطة. نحن وسيط للعرض فقط ولسنا طرفًا في أي عملية بيع، ولا نضمن صحة الإعلانات أو جودة ما يُعرض.']],
      ['الحساب', ['يجب أن يكون عمرك 18 عامًا فأكثر، وأن تقدّم بيانات صحيحة، وأن تحافظ على سرّية كلمة سرك وتتحمل ما يجري عبر حسابك.']],
      ['المحتوى المحظور', [
        'الإعلانات الكاذبة أو المضلّلة، أو بيع ما لا تملكه.',
        'المواد والأشياء الممنوعة قانونًا في الجزائر.',
        'المحتوى المسيء أو المنتحل لشخصية أو نشاط آخر.',
        'الإعلانات المكرّرة والمزعجة (السبام)، ونشر بيانات الغير دون إذنهم.',
      ]],
      ['حدود الإعلانات', ['لكل حساب عدد محدود من الإعلانات النشطة في الوقت نفسه، ولكل إعلان مدة ظهور محددة يمكن تجديدها.']],
      ['الأنشطة المسجّلة في الدليل', ['تخضع الأنشطة لمراجعة الإدارة وموافقتها قبل الظهور، ويمكن إيقافها إذا خالفت الشروط.']],
      ['الإبلاغ والإشراف', ['إذا رأيت إعلانًا أو نشاطًا مخالفًا فاستعمل زر «الإبلاغ». نراجع البلاغات، ويحق لنا إخفاء أو حذف أي محتوى مخالف وإيقاف الحسابات المخالفة دون إشعار مسبق.']],
      ['المسؤولية والأمان', [
        'التفاوض والدفع والتسليم تتم بينك وبين الطرف الآخر مباشرة وخارج التطبيق.',
        'عاين القارب أو المحرك بنفسك، وتحقق من أوراق الملكية، ولا تدفع مقدّمًا لشخص لا تعرفه.',
        'لا نتحمل مسؤولية الخسائر الناتجة عن التعامل بين المستخدمين، بالقدر الذي يسمح به القانون.',
      ]],
      ['حذف الحساب', ['يمكنك حذف حسابك في أي وقت من «حسابي».']],
      ['القانون المطبّق', ['تخضع هذه الشروط للقانون الجزائري.']],
      ['التعديلات', ['يحق لنا تعديل هذه الشروط، واستمرارك في الاستعمال بعد التعديل يعني موافقتك على النسخة المحدّثة.']],
      ['التواصل', [SUPPORT_EMAIL]],
    ],
  },

  delete: {
    title: 'حذف الحساب والبيانات',
    sections: [
      ['من داخل التطبيق (الأسرع)', [
        'افتح التطبيق وسجّل الدخول.',
        'اذهب إلى «حسابي» ثم اضغط «حذف حسابي نهائيًا».',
        'اكتب كلمة «حذف» للتأكيد ثم اضغط «تأكيد الحذف».',
      ]],
      ['عن طريق البريد الإلكتروني', [
        `أرسل طلبًا إلى ${SUPPORT_EMAIL} من البريد المسجّل في حسابك، واكتب في العنوان: «طلب حذف حساب».`,
        'نعالج الطلب خلال 30 يومًا كحد أقصى.',
      ]],
      ['ما الذي يُحذف', ['حسابك، وبيانات ملفك (الاسم والهاتف والولاية)، وكل إعلاناتك وأنشطتك المسجّلة، وصورها وفيديوهاتها، ووثائق التوثيق، وأرقام التواصل المرتبطة بها، ومفضلتك.']],
      ['ما الذي قد يبقى', [
        'نسخ احتياطية لدى مزوّد الخدمة لمدة محدودة حسب سياسته.',
        'نسخ مؤقتة من الصور والفيديوهات العمومية في Cloudflare أو المتصفحات ومحركات البحث، وسجلات غير مرتبطة بحسابك مثل الإحصائيات وسجلات الاشتراكات.',
        'البلاغات التي أرسلتها تُحذف مع حسابك.',
      ]],
    ],
  },
};

// French and English versions shown inside the app (the public HTML pages stay Arabic, see scripts/gen-legal.mjs)
const LEGAL_FR = {
  privacy: {
    title: 'Politique de confidentialité',
    sections: [
      ['Qui sommes-nous', ['« Marsa » est une application algérienne d’annonces de vente de bateaux et de moteurs, et un annuaire des activités maritimes et de pêche. Cette politique explique quelles données nous collectons, comment nous les utilisons et comment vous les contrôlez.']],
      ['Données collectées', [
        'Données du compte : l’adresse e-mail (connexion et vérification), le mot de passe (stocké chiffré chez le fournisseur d’authentification, nous n’y avons pas accès) et le nom.',
        'Données facultatives : numéro de téléphone et wilaya.',
        'Ce que vous publiez : textes des annonces et des activités, photos et vidéos que vous choisissez, numéros de téléphone et WhatsApp indiqués pour être contacté.',
        'Documents de vérification : si vous demandez le badge, vous envoyez jusqu’à 3 fichiers (images ou PDF). Ils sont placés dans un stockage privé, accessible à vous et à l’équipe d’administration, et servent à examiner la demande. Ils sont conservés tant que le compte existe ; vous pouvez demander leur suppression en nous écrivant.',
        'Marché du poisson : demandes et offres (type, quantité, prix, wilaya, commune), coordonnées associées et comptes suivis.',
        'Connexion avec Google (si proposée et choisie) : nous recevons de Google les informations de base du compte, comme l’e-mail et le nom.',
        'Localisation : uniquement lorsque vous appuyez sur « Localiser mon activité » lors de l’inscription d’une activité dans l’annuaire. Les coordonnées sont enregistrées avec votre activité pour l’afficher sur la carte. Aucun suivi en arrière-plan.',
        'Votre activité dans l’application : annonces favorites, signalements envoyés et centres d’intérêt choisis pour les notifications.',
        'Nous enregistrons aussi les actualités Marsa lues et la date de votre dernière visite.',
        'Identifiant de notification : si vous activez les notifications, nous enregistrons l’identifiant de votre appareil ou l’abonnement de votre navigateur pour envoyer les notifications Marsa. Les notifications web passent par le service de votre navigateur ou appareil.',
        'Statistiques d’utilisation : nous enregistrons un identifiant aléatoire et anonyme de votre appareil (sans votre nom), les ouvertures de l’application, les pages d’annonces et d’activités consultées et vos appuis sur les boutons d’appel et WhatsApp. Elles peuvent être liées à votre compte si vous êtes connecté. Nous les utilisons uniquement pour compter les utilisateurs et améliorer l’application ; elles ne sont partagées avec aucun tiers ni utilisées pour la publicité. À la suppression du compte, ces enregistrements sont dissociés de votre identité.',
        'Données techniques : adresse IP et journaux techniques chez nos prestataires, à des fins de sécurité et de résolution de pannes.',
      ]],
      ['Ce que nous ne faisons pas', [
        'Nous n’utilisons aucun outil d’analyse ni régie publicitaire tiers et ne collectons pas l’identifiant publicitaire. Marsa peut afficher ses propres annonces sponsorisées et compter leurs affichages et clics.',
        'Nous n’accédons ni à vos contacts, ni à vos messages, ni à votre galerie. Seules les photos que vous choisissez sont envoyées.',
        'Nous ne vendons pas vos données.',
      ]],
      ['Utilisation de vos données', ['Faire fonctionner votre compte, afficher vos annonces et activités, permettre aux utilisateurs inscrits de vous contacter, envoyer le code de vérification, vous notifier des nouveautés qui vous intéressent, prévenir la fraude et les abus, et répondre à vos demandes.']],
      ['Qui voit vos données', [
        'Visible par tous (même les visiteurs) : titre, description, photos, prix et wilaya de l’annonce, nom du vendeur affiché, nom, description, photos et localisation de l’activité si vous l’avez indiquée.',
        'Visibles aussi par tous : le nom, le type, la photo et le badge du compte (sans e-mail, téléphone ni documents), ainsi que tout ce que vous saisissez ou publiez dans une annonce ou une activité, comme l’adresse, le lieu, les photos et vidéos de réalisations.',
        'Site marsadz.app et moteurs de recherche : les pages des activités publiées (nom, description, adresse, wilaya, photos) apparaissent sur le site public et peuvent être indexées par des moteurs comme Google. Le site affiche aussi les annonces sponsorisées et le nombre total d’utilisateurs, sans leurs noms.',
        'Sponsors : le nom, les offres, l’adresse, le téléphone et le WhatsApp publicitaires du sponsor sont visibles par tous.',
        'Visible par les utilisateurs inscrits uniquement : numéros de téléphone et WhatsApp de l’annonce ou de l’activité (sauf sponsors).',
        'Marché du poisson : les vendeurs éligibles voient les demandes en cours ; le numéro du demandeur n’apparaît qu’au vendeur qui a répondu « disponible ». Le demandeur voit l’offre et le numéro du vendeur.',
        'Les autres utilisateurs ne voient ni votre e-mail ni vos favoris. L’équipe d’administration peut voir votre e-mail. Nous n’avons pas accès à votre mot de passe.',
        'L’équipe d’administration peut consulter les données des comptes, les contenus, les signalements et les documents de vérification dans la mesure nécessaire à la gestion et à la modération.',
      ]],
      ['Prestataires', ['Nous faisons appel à des prestataires qui traitent les données pour notre compte : Supabase (base de données, authentification et stockage ; notre serveur y est situé en Irlande), Cloudflare (hébergement du site et cache des photos et vidéos publiques), Google Firebase (notifications de l’application mobile si activées) et un service d’envoi d’e-mails pour le code de vérification. Leurs serveurs peuvent se trouver hors d’Algérie.']],
      ['Services externes', ['Certaines pages se connectent directement à des services externes qui peuvent connaître votre adresse IP : Google Fonts et cdnjs (polices et fichiers du site), Open-Meteo (état de la mer selon le port choisi, sans envoi de votre position), et YouTube ou Vimeo pour les vidéos des actualités. Les liens vers WhatsApp ou d’autres sites relèvent de leurs politiques.']],
      ['Sécurité', ['Connexion chiffrée (HTTPS) et règles d’accès strictes dans la base de données empêchant chaque utilisateur de consulter les données d’autrui au-delà de ce qui est public. Aucune méthode n’est toutefois sûre à 100 %.']],
      ['Conservation et suppression', [
        'Nous conservons vos données tant que votre compte existe.',
        'Vous pouvez supprimer définitivement votre compte depuis l’application : « Mon compte ← Supprimer mon compte définitivement ». Votre compte, vos annonces, activités, photos, vidéos, documents de vérification, coordonnées et favoris sont supprimés. Certains enregistrements non liés à votre compte peuvent subsister (statistiques, historique des abonnements).',
        'Vous pouvez aussi demander la suppression depuis la page publique : marsadz.app/delete-account',
        'Des copies de photos et vidéos publiques peuvent subsister un certain temps après la suppression dans le cache de Cloudflare, les navigateurs et les moteurs de recherche. Vous pouvez nous écrire pour demander leur retrait des stockages que nous contrôlons.',
        'Des sauvegardes peuvent subsister chez le prestataire pendant une durée limitée, selon sa politique.',
      ]],
      ['Vos droits', ['Vous pouvez accéder à vos données, les rectifier, les supprimer et vous opposer à leur traitement, conformément à la loi algérienne relative à la protection des données à caractère personnel. Modifiez vos données depuis « Mon compte » ou écrivez-nous.']],
      ['Mineurs', ['L’application ne s’adresse pas aux moins de 18 ans et nous ne collectons pas sciemment de données d’enfants.']],
      ['Modifications', ['Nous pouvons mettre à jour cette politique ; la date de dernière mise à jour ci-dessus sera modifiée.']],
      ['Contact', [`Pour toute question sur la confidentialité : ${SUPPORT_EMAIL}`]],
    ],
  },
  terms: {
    title: 'Conditions d’utilisation',
    sections: [
      ['À propos de Marsa', ['Marsa est une plateforme de diffusion d’annonces et de présentation d’activités. Nous sommes un simple intermédiaire d’affichage, nous ne sommes partie à aucune vente et ne garantissons ni l’exactitude des annonces ni la qualité de ce qui est proposé.']],
      ['Compte', ['Vous devez avoir 18 ans ou plus, fournir des informations exactes, garder votre mot de passe secret et assumer ce qui est fait depuis votre compte.']],
      ['Contenus interdits', [
        'Annonces fausses ou trompeuses, ou vente de ce que vous ne possédez pas.',
        'Articles et produits interdits par la loi algérienne.',
        'Contenus offensants ou usurpant l’identité d’une personne ou d’une activité.',
        'Annonces répétées et indésirables (spam) et publication des données d’autrui sans autorisation.',
      ]],
      ['Limites des annonces', ['Chaque compte dispose d’un nombre limité d’annonces actives simultanément, et chaque annonce a une durée d’affichage renouvelable.']],
      ['Activités de l’annuaire', ['Les activités sont examinées et validées par l’administration avant leur publication et peuvent être suspendues en cas de non-respect des conditions.']],
      ['Signalement et modération', ['Si vous voyez une annonce ou une activité non conforme, utilisez le bouton « Signaler ». Nous examinons les signalements et pouvons masquer ou supprimer tout contenu non conforme et suspendre les comptes concernés sans préavis.']],
      ['Responsabilité et sécurité', [
        'Négociation, paiement et livraison se font directement entre vous et l’autre partie, en dehors de l’application.',
        'Inspectez vous-même le bateau ou le moteur, vérifiez les papiers de propriété et ne payez jamais d’avance une personne inconnue.',
        'Nous ne sommes pas responsables des pertes résultant des échanges entre utilisateurs, dans la mesure permise par la loi.',
      ]],
      ['Suppression du compte', ['Vous pouvez supprimer votre compte à tout moment depuis « Mon compte ».']],
      ['Droit applicable', ['Les présentes conditions sont soumises au droit algérien.']],
      ['Modifications', ['Nous pouvons modifier ces conditions ; continuer à utiliser l’application après une modification vaut acceptation de la nouvelle version.']],
      ['Contact', [SUPPORT_EMAIL]],
    ],
  },
  delete: {
    title: 'Suppression du compte et des données',
    sections: [
      ['Depuis l’application (le plus rapide)', [
        'Ouvrez l’application et connectez-vous.',
        'Allez dans « Mon compte » puis appuyez sur « Supprimer mon compte définitivement ».',
        'Tapez le mot « supprimer » pour confirmer puis appuyez sur « Confirmer la suppression ».',
      ]],
      ['Par e-mail', [
        `Envoyez une demande à ${SUPPORT_EMAIL} depuis l’adresse enregistrée sur votre compte, avec pour objet : « Demande de suppression de compte ».`,
        'Nous traitons la demande sous 30 jours au maximum.',
      ]],
      ['Ce qui est supprimé', ['Votre compte, les données de votre profil (nom, téléphone, wilaya), toutes vos annonces et activités, leurs photos et vidéos, les documents de vérification, les coordonnées associées, vos favoris et vos notifications.']],
      ['Ce qui peut subsister', [
        'Des sauvegardes chez le prestataire pendant une durée limitée, selon sa politique.',
        'Des copies temporaires de photos et vidéos publiques (Cloudflare, navigateurs, moteurs de recherche) et des enregistrements non liés à votre compte (statistiques, historique des abonnements).',
        'Les signalements que vous avez envoyés sont supprimés avec votre compte.',
      ]],
    ],
  },
};

const LEGAL_EN = {
  privacy: {
    title: 'Privacy policy',
    sections: [
      ['Who we are', ['“Marsa” is an Algerian app for boat and engine sale listings, and a directory of maritime and fishing businesses. This policy explains what data we collect, how we use it and how you control it.']],
      ['Data we collect', [
        'Account data: your email address (sign-in and verification), your password (stored encrypted by the authentication provider; we never see it) and your name.',
        'Optional data: phone number and wilaya.',
        'What you publish: listing and business texts, the photos and videos you choose, and the phone and WhatsApp numbers you add for contact.',
        'Verification documents: if you request the badge, you upload up to 3 files (images or PDF). They are kept in private storage, accessible to you and the admin team, and used to review your request. They are kept while your account exists; you can write to us to ask for their deletion.',
        'Fish market: requests and offers (type, quantity, price, wilaya, commune), the related contact numbers and the accounts you follow.',
        'Google sign-in (if available and you choose it): we receive basic account details from Google, such as your email and name.',
        'Location: only when you tap “Locate my business” while registering a business in the directory. We store the coordinates with your business to show it on the map. We never track your location in the background.',
        'Your activity in the app: favourite listings, reports you send and the notification interests you choose.',
        'We also record which Marsa news items you have read and when you were last seen.',
        'Notification identifier: if you turn on notifications, we store your device identifier or browser subscription to send Marsa notifications. Web notifications are delivered through your browser’s or device’s push service.',
        'Usage statistics: we record a random, anonymous identifier of your device (it does not contain your name), app opens, the listing and business pages you open, and your taps on the call and WhatsApp buttons. They may be linked to your account if you are signed in. We use them only to count users and improve the app; they are not shared with any third party or used for advertising. When you delete your account, these records are detached from your identity.',
        'Technical data: IP address and technical logs kept by our service providers, for security and troubleshooting.',
      ]],
      ['What we do not do', [
        'We use no third-party analytics tools or ad networks and do not collect the advertising ID. Marsa may show its own sponsored content and count its views and clicks.',
        'We do not access your contacts, messages or photo library. We only upload the photos you pick yourself.',
        'We do not sell your data.',
      ]],
      ['How we use your data', ['To run your account, show your listings and businesses, let signed-in users contact you, send the verification code to your email, notify you about new items that match your interests, prevent fraud and abuse, and answer your questions.']],
      ['Who sees your data', [
        'Everyone (including visitors): the listing title, description, photos, price and wilaya, the displayed seller name, and the business name, description, photos and location if you set it.',
        'Also visible to everyone: the account name, type, photo and badge (without email, phone or documents), and anything you enter or upload in a listing or business, such as the address, place, work photos and videos.',
        'The marsadz.app website and search engines: published business pages (name, description, address, wilaya, photos) appear on the public website and may be indexed by search engines such as Google. The website also shows sponsored listings and the total number of users, without names.',
        'Sponsors: a sponsor’s name, offers, address, advertising phone and WhatsApp numbers are visible to everyone.',
        'Signed-in users only: the phone and WhatsApp numbers of the listing or business (sponsors excepted).',
        'Fish market: eligible sellers see active customer requests; the requester’s number is shown only to a seller who answered “available”. The requester sees the seller’s offer and number.',
        'Other users cannot see your email or favourites. The admin team can see your email. We never see your password.',
        'The admin team may access account data, content, reports and verification documents as needed for administration and moderation.',
      ]],
      ['Service providers', ['We rely on providers that process data on our behalf to run the app: Supabase (database, authentication and file storage; our server there is in Ireland), Cloudflare (website hosting and caching of public photos and videos), Google Firebase (mobile app notifications if enabled) and an email service for verification codes. Their servers may be located outside Algeria.']],
      ['External services', ['Some pages connect directly to external services that can see your IP address: Google Fonts and cdnjs (website fonts and files), Open-Meteo (sea conditions for the selected port; your location is not sent), and YouTube or Vimeo for videos in Marsa news. Links to WhatsApp or other sites are covered by their own policies.']],
      ['Security', ['We use encrypted connections (HTTPS) and strict access rules in the database so no user can see other users’ data beyond what is public. No method is 100% secure, however.']],
      ['Retention and deletion', [
        'We keep your data as long as your account exists.',
        'You can permanently delete your account in the app: “My account → Delete my account permanently”. Your account, listings, businesses, photos, videos, verification documents, contact details and favourites are deleted. Some records not linked to your account may remain (statistics, subscription history).',
        'You can also request deletion from the public page: marsadz.app/delete-account',
        'Copies of public photos and videos may remain for a while after deletion in Cloudflare’s cache, browsers and search engines. You can write to us to ask for their removal from storage we control.',
        'Backups may remain with the provider for a limited time, according to its policy.',
      ]],
      ['Your rights', ['You have the right to access, correct and delete your data and to object to its processing, under the Algerian law on the protection of personal data. Edit your data from “My account” or write to us.']],
      ['Children', ['The app is not intended for people under 18 and we do not knowingly collect children’s data.']],
      ['Changes', ['We may update this policy and will change the “last updated” date above.']],
      ['Contact', [`For any privacy question: ${SUPPORT_EMAIL}`]],
    ],
  },
  terms: {
    title: 'Terms of use',
    sections: [
      ['About Marsa', ['Marsa is a platform for publishing listings and presenting businesses. We only display content; we are not a party to any sale and do not guarantee the accuracy of listings or the quality of what is offered.']],
      ['Account', ['You must be 18 or older, provide accurate information, keep your password secret and take responsibility for what happens through your account.']],
      ['Prohibited content', [
        'False or misleading listings, or selling what you do not own.',
        'Items and goods prohibited by Algerian law.',
        'Offensive content or impersonation of another person or business.',
        'Repeated, unwanted listings (spam) and publishing other people’s data without their permission.',
      ]],
      ['Listing limits', ['Each account has a limited number of active listings at the same time, and each listing has a set display period that can be renewed.']],
      ['Directory businesses', ['Businesses are reviewed and approved by the admin team before they appear, and may be suspended if they break these terms.']],
      ['Reporting and moderation', ['If you see a listing or business that breaks the rules, use the “Report” button. We review reports and may hide or delete any infringing content and suspend infringing accounts without prior notice.']],
      ['Liability and safety', [
        'Negotiation, payment and delivery happen directly between you and the other party, outside the app.',
        'Inspect the boat or engine yourself, check the ownership papers, and never pay a stranger in advance.',
        'We are not liable for losses arising from dealings between users, to the extent permitted by law.',
      ]],
      ['Deleting your account', ['You can delete your account at any time from “My account”.']],
      ['Governing law', ['These terms are governed by Algerian law.']],
      ['Changes', ['We may change these terms; continuing to use the app after a change means you accept the updated version.']],
      ['Contact', [SUPPORT_EMAIL]],
    ],
  },
  delete: {
    title: 'Delete your account and data',
    sections: [
      ['In the app (fastest)', [
        'Open the app and sign in.',
        'Go to “My account” and tap “Delete my account permanently”.',
        'Type the word “delete” to confirm, then tap “Confirm deletion”.',
      ]],
      ['By email', [
        `Send a request to ${SUPPORT_EMAIL} from the email registered on your account, with the subject: “Account deletion request”.`,
        'We process the request within 30 days at most.',
      ]],
      ['What is deleted', ['Your account, your profile data (name, phone, wilaya), all your listings and businesses, their photos and videos, verification documents, the linked contact numbers, your favourites and your notifications.']],
      ['What may remain', [
        'Backups kept by the provider for a limited time, according to its policy.',
        'Temporary copies of public photos and videos (Cloudflare, browsers, search engines) and records not linked to your account (statistics, subscription history).',
        'Reports you sent are deleted with your account.',
      ]],
    ],
  },
};

export const LEGAL_I18N = { ar: LEGAL, fr: LEGAL_FR, en: LEGAL_EN };
